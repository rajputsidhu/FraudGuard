import os
import sys
import numpy as np
# Patch np.int for compatibility with older shap versions in newer numpy
if not hasattr(np, "int"):
    np.int = int
import pandas as pd
import joblib
from functools import lru_cache
from typing import Dict, Any, List

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger
from api.schemas import TransactionInput, PredictResponse, ExplainResponse, FeatureContribution

logger = setup_logger("api_predictor", "logs/api.log")

# Define paths relative to workspace root
MODEL_PATH = "models/model_xgb.pkl"
SCALER_PATH = "models/scaler.pkl"
THRESHOLD_PATH = "models/best_threshold.pkl"
EXPLAINER_PATH = "models/shap_explainer.pkl"
FEATURES_PATH = "models/feature_names.pkl"

# ----------------------------------------------------
# LRU Cache Model Loaders to prevent file I/O overhead
# ----------------------------------------------------
@lru_cache(maxsize=1)
def get_xgb_model() -> Any:
    """Loads and caches the trained XGBoost model."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"✖ Model file not found at {MODEL_PATH}. Make sure training script is executed.")
    logger.info("✔ Loaded XGBoost model from disk (cached).")
    return joblib.load(MODEL_PATH)

@lru_cache(maxsize=1)
def get_scaler() -> Any:
    """Loads and caches the StandardScaler."""
    if not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(f"✖ Scaler file not found at {SCALER_PATH}. Make sure preprocessing script is executed.")
    logger.info("✔ Loaded StandardScaler from disk (cached).")
    return joblib.load(SCALER_PATH)

@lru_cache(maxsize=1)
def get_threshold() -> float:
    """Loads and caches the optimized F1 threshold. Fallback to 0.5 if not found (warning)."""
    if not os.path.exists(THRESHOLD_PATH):
        logger.warning(f"⚠ Threshold file not found at {THRESHOLD_PATH}. Using fallback threshold 0.5.")
        return 0.5
    thresh = float(joblib.load(THRESHOLD_PATH))
    logger.info(f"✔ Loaded decision threshold from disk: {thresh:.4f} (cached).")
    return thresh

@lru_cache(maxsize=1)
def get_shap_explainer() -> Any:
    """Loads and caches the SHAP TreeExplainer."""
    if not os.path.exists(EXPLAINER_PATH):
        raise FileNotFoundError(f"✖ SHAP Explainer not found at {EXPLAINER_PATH}. Run explainability script first.")
    logger.info("✔ Loaded SHAP TreeExplainer from disk (cached).")
    return joblib.load(EXPLAINER_PATH)

@lru_cache(maxsize=1)
def get_feature_names() -> List[str]:
    """Loads and caches the feature names in pipeline execution order."""
    if not os.path.exists(FEATURES_PATH):
        raise FileNotFoundError(f"✖ Feature names file not found at {FEATURES_PATH}.")
    features = joblib.load(FEATURES_PATH)
    logger.info(f"✔ Loaded feature list from disk: {len(features)} features (cached).")
    return features

# ----------------------------------------------------
# Preprocessing and Prediction Logic
# ----------------------------------------------------
def preprocess_input(transaction: TransactionInput) -> np.ndarray:
    """
    Extracts Pydantic inputs in the correct model feature order,
    scales only Time and Amount, and returns a 2D numpy array ready for inference.
    """
    feature_names = get_feature_names()
    scaler = get_scaler()
    
    # Convert input to dictionary
    input_dict = transaction.dict()
    
    # Build 1x30 raw feature list matching features order
    raw_vector = [input_dict[feat] for feat in feature_names]
    X_raw = np.array([raw_vector])
    
    # Identify indices of columns to scale
    time_idx = feature_names.index('Time')
    amount_idx = feature_names.index('Amount')
    
    # Transform only Time and Amount
    time_val = input_dict['Time']
    amount_val = input_dict['Amount']
    
    scaled_values = scaler.transform([[time_val, amount_val]])
    
    # Replace in feature array
    X_scaled = X_raw.copy()
    X_scaled[0, time_idx] = scaled_values[0, 0]
    X_scaled[0, amount_idx] = scaled_values[0, 1]
    
    return X_scaled

def make_prediction(transaction: TransactionInput) -> PredictResponse:
    """
    Preprocesses input features, runs XGBoost model prediction,
    applies the optimized decision threshold, computes SHAP values dynamically,
    and returns the classification with explainability metrics.
    """
    # Force loads objects (cached after first request)
    xgb = get_xgb_model()
    threshold = get_threshold()
    
    # Run Preprocessing
    X_inference = preprocess_input(transaction)
    
    # Get probability score (class 1)
    probabilities = xgb.predict_proba(X_inference)
    fraud_prob = float(probabilities[0, 1])
    
    # Apply Threshold logic
    prediction = "FRAUD" if fraud_prob >= threshold else "LEGITIMATE"
    
    # Risk Level categorization
    if fraud_prob < 0.15:
        risk_level = "LOW"
    elif fraud_prob < threshold:
        risk_level = "MEDIUM"
    elif fraud_prob < 0.80:
        risk_level = "HIGH"
    else:
        risk_level = "VERY HIGH"
        
    # Calculate SHAP values dynamically for React frontend
    try:
        explainer = get_shap_explainer()
        feature_names = get_feature_names()
        try:
            explanation = explainer(X_inference)
            shap_values_vector = explanation.values[0]
        except Exception:
            shap_values_vector = explainer.shap_values(X_inference)[0]
            
        shap_dict = {}
        for feat_name, shap_val in zip(feature_names, shap_values_vector):
            shap_dict[feat_name] = round(float(shap_val), 4)
    except Exception as e:
        logger.warning(f"Failed to generate SHAP values inside make_prediction: {e}")
        shap_dict = {}
        
    return PredictResponse(
        prediction=prediction,
        fraud_probability=round(fraud_prob, 4),
        threshold=round(threshold, 4),
        risk_level=risk_level,
        is_fraud=(prediction == "FRAUD"),
        probability=round(fraud_prob, 4),
        shap_values=shap_dict
    )

def generate_explanation(transaction: TransactionInput) -> ExplainResponse:
    """
    Preprocesses features, computes transaction SHAP values dynamically,
    extracts base value and feature contributions, and formats response.
    """
    explainer = get_shap_explainer()
    feature_names = get_feature_names()
    
    # Run Preprocessing
    X_inference = preprocess_input(transaction)
    
    # Run SHAP explanation
    try:
        # Try modern API
        explanation = explainer(X_inference)
        shap_values_vector = explanation.values[0]
    except Exception:
        # Fallback to classical API
        shap_values_vector = explainer.shap_values(X_inference)[0]
        
    # Get base value (log-odds space)
    base_value = explainer.expected_value
    if isinstance(base_value, (list, np.ndarray)):
        base_value = float(base_value[0])
    else:
        base_value = float(base_value)
        
    # Map values to feature names
    shap_dict = {}
    contributions = []
    
    for feat_name, shap_val in zip(feature_names, shap_values_vector):
        val = float(shap_val)
        shap_dict[feat_name] = round(val, 4)
        contributions.append(FeatureContribution(feature=feat_name, shap_value=round(val, 4)))
        
    # Sort contributions by absolute value descending to isolate top drivers
    top_contributions = sorted(contributions, key=lambda x: abs(x.shap_value), reverse=True)
    
    return ExplainResponse(
        base_value=round(base_value, 4),
        top_features=top_contributions[:10], # Return top 10 most impactful features
        shap_values=shap_dict
    )

def make_batch_prediction(df: pd.DataFrame) -> dict:
    """
    Validates CSV columns, standardizes Time & Amount, reorders features,
    and returns predictions for the entire batch.
    
    Args:
        df: Input pandas DataFrame.
        
    Returns:
        A dictionary containing summary metrics and list of individual transaction predictions.
    """
    xgb = get_xgb_model()
    scaler = get_scaler()
    threshold = get_threshold()
    feature_names = get_feature_names()
    
    # 1. Column Validation
    required_cols = ["Time", "Amount"] + [f"V{i}" for i in range(1, 29)]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"CSV is missing required features: {', '.join(missing_cols)}")
        
    # Keep only required columns and align index
    df_aligned = df[required_cols].reset_index(drop=True)
    
    # 2. Scale Time and Amount
    df_scaled = df_aligned.copy()
    scaled_values = scaler.transform(df_aligned[['Time', 'Amount']])
    
    time_idx = feature_names.index('Time')
    amount_idx = feature_names.index('Amount')
    
    # Place scaled columns in correct index mapping
    df_scaled['Time'] = scaled_values[:, 0]
    df_scaled['Amount'] = scaled_values[:, 1]
    
    # Reorder columns to match the trained pipeline feature list order
    df_inference = df_scaled[feature_names]
    
    # 3. Vectorized Inference
    probs = xgb.predict_proba(df_inference.to_numpy())[:, 1]
    
    # 4. Format outputs
    predictions = []
    total_count = len(df_aligned)
    fraud_count = 0
    
    for idx, row in df_aligned.iterrows():
        prob = float(probs[idx])
        is_fraud = prob >= threshold
        pred_label = "FRAUD" if is_fraud else "LEGITIMATE"
        
        if is_fraud:
            fraud_count += 1
            
        if prob < 0.15:
            risk_level = "LOW"
        elif prob < threshold:
            risk_level = "MEDIUM"
        elif prob < 0.80:
            risk_level = "HIGH"
        else:
            risk_level = "VERY HIGH"
            
        predictions.append({
            "row_index": int(idx),
            "Time": float(row["Time"]),
            "Amount": float(row["Amount"]),
            "fraud_probability": round(prob, 4),
            "prediction": pred_label,
            "risk_level": risk_level,
            "is_fraud": bool(is_fraud)
        })
        
    legit_count = total_count - fraud_count
    fraud_ratio = (fraud_count / total_count * 100) if total_count > 0 else 0.0
    
    return {
        "total_count": total_count,
        "fraud_count": fraud_count,
        "legit_count": legit_count,
        "fraud_ratio": round(fraud_ratio, 2),
        "predictions": predictions
    }

