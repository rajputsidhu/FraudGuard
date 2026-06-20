import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.main import app
from api.schemas import PredictResponse, ExplainResponse

client = TestClient(app)

def test_health_endpoint():
    """Verifies GET /health returns 200 OK and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@patch("api.main.make_prediction")
def test_predict_endpoint_success(mock_make_prediction):
    """Verifies POST /predict parses inputs correctly and returns predictions."""
    # Configure mock prediction return value
    mock_make_prediction.return_value = PredictResponse(
        prediction="LEGITIMATE",
        fraud_probability=0.08,
        threshold=0.42,
        risk_level="LOW"
    )
    
    # Create valid payload
    payload = {f"V{i}": 0.0 for i in range(1, 29)}
    payload.update({"Time": 12000.0, "Amount": 55.50})
    
    response = client.post("/predict", json=payload)
    
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["prediction"] == "LEGITIMATE"
    assert res_json["fraud_probability"] == 0.08
    assert res_json["risk_level"] == "LOW"
    assert res_json["threshold"] == 0.42
    
    # Assert predictor helper was called once
    mock_make_prediction.assert_called_once()

def test_predict_endpoint_validation_error():
    """Verifies that POST /predict returns 422 Unprocessable Entity on validation fail."""
    # Payload missing 'Amount' field
    invalid_payload = {f"V{i}": 0.0 for i in range(1, 29)}
    invalid_payload.update({"Time": 12000.0})
    
    response = client.post("/predict", json=invalid_payload)
    assert response.status_code == 422
    assert "detail" in response.json()
    
    # Payload with string instead of float for Amount
    invalid_payload_types = invalid_payload.copy()
    invalid_payload_types.update({"Amount": "one hundred dollars"})
    
    response = client.post("/predict", json=invalid_payload_types)
    assert response.status_code == 422

@patch("api.main.generate_explanation")
def test_explain_endpoint_success(mock_generate_explanation):
    """Verifies POST /explain returns SHAP contributions."""
    mock_generate_explanation.return_value = ExplainResponse(
        base_value=-4.12,
        top_features=[{"feature": "V14", "shap_value": 0.81}],
        shap_values={f"V{i}": 0.0 for i in range(1, 29)}
    )
    
    payload = {f"V{i}": 0.0 for i in range(1, 29)}
    payload.update({"Time": 12000.0, "Amount": 55.50})
    
    response = client.post("/explain", json=payload)
    
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["base_value"] == -4.12
    assert len(res_json["top_features"]) == 1
    assert res_json["top_features"][0]["feature"] == "V14"
    assert "V1" in res_json["shap_values"]
    
    mock_generate_explanation.assert_called_once()


@patch("api.main.make_batch_prediction")
def test_predict_file_endpoint_success(mock_make_batch_prediction):
    """Verifies POST /predict-file accepts CSV uploads and returns results."""
    # Configure mock
    mock_make_batch_prediction.return_value = {
        "total_count": 2,
        "fraud_count": 1,
        "legit_count": 1,
        "fraud_ratio": 50.0,
        "predictions": [
            {
                "row_index": 1,
                "Time": 0.0,
                "Amount": 100.0,
                "fraud_probability": 0.95,
                "prediction": "FRAUD",
                "risk_level": "VERY HIGH",
                "is_fraud": True
            },
            {
                "row_index": 2,
                "Time": 1.0,
                "Amount": 200.0,
                "fraud_probability": 0.05,
                "prediction": "LEGITIMATE",
                "risk_level": "LOW",
                "is_fraud": False
            }
        ]
    }
    
    # Create simple mock CSV content matching features list
    headers = "Time,Amount," + ",".join([f"V{i}" for i in range(1, 29)])
    row1 = "0.0,100.0," + ",".join(["0.0"] * 28)
    row2 = "1.0,200.0," + ",".join(["0.0"] * 28)
    csv_content = f"{headers}\n{row1}\n{row2}"
    
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/predict-file", files=files)
    
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["total_count"] == 2
    assert res_json["fraud_count"] == 1
    assert res_json["legit_count"] == 1
    assert res_json["fraud_ratio"] == 50.0
    assert len(res_json["predictions"]) == 2
    assert res_json["predictions"][0]["prediction"] == "FRAUD"
    assert res_json["predictions"][1]["prediction"] == "LEGITIMATE"
    
    mock_make_batch_prediction.assert_called_once()


def test_predict_file_endpoint_invalid_extension():
    """Verifies POST /predict-file returns 400 Bad Request on non-CSV uploads."""
    files = {"file": ("test.txt", "some,text,data", "text/plain")}
    response = client.post("/predict-file", files=files)
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]

