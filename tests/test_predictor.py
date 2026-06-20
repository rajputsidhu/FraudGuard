import os
import sys
import numpy as np
import pytest
from unittest.mock import patch, MagicMock

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.schemas import TransactionInput
from api.predictor import preprocess_input, make_prediction, generate_explanation

@pytest.fixture
def mock_transaction():
    """Generates a standard TransactionInput instance for testing."""
    features = {f"V{i}": 0.0 for i in range(1, 29)}
    features.update({
        "Time": 3600.0,
        "Amount": 100.0
    })
    return TransactionInput(**features)

@patch("api.predictor.get_feature_names")
@patch("api.predictor.get_scaler")
def test_preprocess_input(mock_get_scaler, mock_get_feature_names, mock_transaction):
    """
    Verifies that preprocessing extracts features in correct order
    and scales ONLY Time and Amount.
    """
    # Define mock feature names list in pipeline order
    feature_names = ["Time", "Amount"] + [f"V{i}" for i in range(1, 29)]
    mock_get_feature_names.return_value = feature_names
    
    # Mock scaler transform: divide values by 10
    mock_scaler = MagicMock()
    mock_scaler.transform.return_value = np.array([[360.0, 10.0]])
    mock_get_scaler.return_value = mock_scaler
    
    X_processed = preprocess_input(mock_transaction)
    
    # Assert return type and shape (1, 30)
    assert isinstance(X_processed, np.ndarray)
    assert X_processed.shape == (1, 30)
    
    # Assert Time (index 0) and Amount (index 1) were scaled
    assert X_processed[0, 0] == 360.0 # Time/10
    assert X_processed[0, 1] == 10.0  # Amount/10
    
    # Assert V1 to V28 (indices 2 to 29) remain unscaled (0.0)
    for col_idx in range(2, 30):
        assert X_processed[0, col_idx] == 0.0
        
    # Verify scaler was only called with Time and Amount
    mock_scaler.transform.assert_called_once_with([[3600.0, 100.0]])

@patch("api.predictor.preprocess_input")
@patch("api.predictor.get_xgb_model")
@patch("api.predictor.get_threshold")
def test_make_prediction_legit(mock_get_threshold, mock_get_xgb_model, mock_preprocess_input, mock_transaction):
    """Tests classifier behavior for a legitimate transaction outcome."""
    mock_preprocess_input.return_value = np.zeros((1, 30))
    mock_get_threshold.return_value = 0.40
    
    # Mock model predict_proba returning 5% fraud probability
    mock_model = MagicMock()
    mock_model.predict_proba.return_value = np.array([[0.95, 0.05]])
    mock_get_xgb_model.return_value = mock_model
    
    response = make_prediction(mock_transaction)
    
    assert response.prediction == "LEGITIMATE"
    assert response.fraud_probability == 0.05
    assert response.risk_level == "LOW"
    assert response.threshold == 0.40

@patch("api.predictor.preprocess_input")
@patch("api.predictor.get_xgb_model")
@patch("api.predictor.get_threshold")
def test_make_prediction_fraud(mock_get_threshold, mock_get_xgb_model, mock_preprocess_input, mock_transaction):
    """Tests classifier behavior for a flagged fraud transaction outcome."""
    mock_preprocess_input.return_value = np.zeros((1, 30))
    # Threshold tuned to 0.40, fraud prob is 95%
    mock_get_threshold.return_value = 0.40
    
    mock_model = MagicMock()
    mock_model.predict_proba.return_value = np.array([[0.05, 0.95]])
    mock_get_xgb_model.return_value = mock_model
    
    response = make_prediction(mock_transaction)
    
    assert response.prediction == "FRAUD"
    assert response.fraud_probability == 0.95
    assert response.risk_level == "VERY HIGH"
    assert response.threshold == 0.40
