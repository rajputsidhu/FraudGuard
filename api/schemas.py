from pydantic import BaseModel, Field
from typing import Dict, List

class TransactionInput(BaseModel):
    """
    Schema for a single transaction input features.
    """
    Time: float = Field(..., example=10000.0, description="Seconds elapsed since the first transaction")
    Amount: float = Field(..., example=149.99, description="Transaction amount in currency")
    V1: float = Field(..., example=0.12)
    V2: float = Field(..., example=-0.05)
    V3: float = Field(..., example=1.23)
    V4: float = Field(..., example=-0.45)
    V5: float = Field(..., example=0.67)
    V6: float = Field(..., example=-0.12)
    V7: float = Field(..., example=0.89)
    V8: float = Field(..., example=-0.34)
    V9: float = Field(..., example=0.01)
    V10: float = Field(..., example=-0.56)
    V11: float = Field(..., example=1.02)
    V12: float = Field(..., example=-0.78)
    V13: float = Field(..., example=0.23)
    V14: float = Field(..., example=-1.12)
    V15: float = Field(..., example=0.34)
    V16: float = Field(..., example=-0.67)
    V17: float = Field(..., example=0.98)
    V18: float = Field(..., example=-0.12)
    V19: float = Field(..., example=0.45)
    V20: float = Field(..., example=-0.23)
    V21: float = Field(..., example=0.02)
    V22: float = Field(..., example=-0.34)
    V23: float = Field(..., example=0.12)
    V24: float = Field(..., example=-0.56)
    V25: float = Field(..., example=0.78)
    V26: float = Field(..., example=-0.12)
    V27: float = Field(..., example=0.05)
    V28: float = Field(..., example=-0.32)

class PredictResponse(BaseModel):
    """
    Schema for prediction endpoint response.
    """
    prediction: str = Field(..., example="FRAUD", description="Classification label: FRAUD or LEGITIMATE")
    fraud_probability: float = Field(..., example=0.91, description="Probability score of fraud")
    threshold: float = Field(..., example=0.42, description="Configured decision threshold")
    risk_level: str = Field(..., example="HIGH", description="Risk level category based on probability: LOW, MEDIUM, HIGH, VERY HIGH")
    is_fraud: bool = Field(default=False, example=True, description="True if classified as FRAUD")
    probability: float = Field(default=0.0, example=0.91, description="Probability score of fraud")
    shap_values: Dict[str, float] = Field(default_factory=dict, description="SHAP feature contributions")

class FeatureContribution(BaseModel):
    """
    Schema for feature importance contribution.
    """
    feature: str = Field(..., example="V14")
    shap_value: float = Field(..., example=0.81)

class ExplainResponse(BaseModel):
    """
    Schema for explanation endpoint response.
    """
    base_value: float = Field(..., example=-4.12, description="Model baseline value (log-odds space)")
    top_features: List[FeatureContribution] = Field(..., description="Top features contributing positively or negatively to this score")
    shap_values: Dict[str, float] = Field(..., description="Complete dictionary of SHAP values for all features")
