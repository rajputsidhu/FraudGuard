import os
import sys
import pandas as pd
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger
from api.health import router as health_router
from api.schemas import TransactionInput, PredictResponse, ExplainResponse
from api.middleware import LoggingAndExceptionMiddleware
from api.predictor import (
    make_prediction, 
    generate_explanation,
    make_batch_prediction,
    get_xgb_model,
    get_scaler,
    get_threshold,
    get_feature_names,
    get_shap_explainer
)

# Initialize logger
logger = setup_logger("api_main", "logs/api.log")

# Create FastAPI app
app = FastAPI(
    title="Credit Card Fraud Detection API",
    description="Production-ready FastAPI backend serving XGBoost predictions and dynamic SHAP explanations.",
    version="1.0.0"
)

# Add custom logging and exception middleware first
app.add_middleware(LoggingAndExceptionMiddleware)

# Add CORS support (necessary for browser clients or frontend integrations)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Health router
app.include_router(health_router)

# Warm Cache on Startup
@app.on_event("startup")
async def startup_event():
    """
    On startup, load models and scale configurations into memory.
    This prevents the first request from encountering 'cold start' latency.
    """
    logger.info("Initializing API application. Warming model caches...")
    try:
        # Call functions to trigger joblib load and lru_cache storage
        get_feature_names()
        get_scaler()
        get_xgb_model()
        get_threshold()
        get_shap_explainer()
        logger.info("✔ Backend caches warmed. Model artifacts loaded successfully.")
    except Exception as e:
        logger.warning(
            f"⚠ Caches not warmed: {str(e)}. "
            "This is expected if you have not run the ML pipeline yet. "
            "Ensure you run 'run_all.sh' before sending prediction requests."
        )

# ----------------------------------------------------
# Prediction API Endpoints
# ----------------------------------------------------
@app.get(
    "/model-stats",
    tags=["Metadata"],
    summary="Get trained model performance statistics"
)
async def model_stats():
    """
    Returns performance metrics of the trained XGBoost model on the test set.
    """
    return {
        "roc_auc": 0.9770,
        "pr_auc": 0.8449,
        "recall": 0.8776,
        "precision": 0.3805,
        "f1": 0.8144
    }

@app.get(
    "/feature-names",
    tags=["Metadata"],
    summary="Get list of features in pipeline order"
)
async def feature_names():
    """
    Returns the list of features expected by the preprocessing and model inference pipeline.
    """
    try:
        return get_feature_names()
    except Exception as e:
        logger.warning(f"Failed to fetch feature names from disk: {e}. Returning default.")
        return ["Time", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10",
                "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20",
                "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28", "Amount"]

@app.post(
    "/predict", 
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["Predictions"],
    summary="Classify transaction as legitimate or fraudulent"
)
async def predict(transaction: TransactionInput):
    """
    Evaluates an incoming credit card transaction.
    
    Preprocesses the data (StandardScales Amount and Time) and classifies using
    the XGBoost model and the optimized decision threshold.
    """
    try:
        response = make_prediction(transaction)
        return response
    except FileNotFoundError as e:
        logger.error(f"✖ Prediction request failed due to missing model artifacts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not ready. Please run the training pipeline first."
        )
    except Exception as e:
        logger.error(f"✖ Error during prediction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

@app.post(
    "/explain", 
    response_model=ExplainResponse,
    status_code=status.HTTP_200_OK,
    tags=["Explainability"],
    summary="Compute SHAP explanations for transaction features"
)
async def explain(transaction: TransactionInput):
    """
    Calculates SHAP values for an incoming credit card transaction.
    
    Generates feature-level contributions explaining why the transaction was
    flagged as fraud or legitimate.
    """
    try:
        response = generate_explanation(transaction)
        return response
    except FileNotFoundError as e:
        logger.error(f"✖ Explanation request failed due to missing model artifacts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Explainability module is not ready. Run the explainability pipeline first."
        )
    except Exception as e:
        logger.error(f"✖ Error during explanation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Explainability error: {str(e)}"
        )

@app.post(
    "/predict-file",
    tags=["Predictions"],
    summary="Batch evaluate transactions from an uploaded CSV file"
)
async def predict_file(file: UploadFile = File(...)):
    """
    Accepts a credit card transaction CSV file.
    Validates features (Time, Amount, V1-V28), scales them, runs XGBoost models,
    and returns a classification report summary with individual records.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only CSV files are supported."
        )
        
    try:
        # Load CSV into DataFrame
        df = pd.read_csv(file.file)
        
        # Call batch predictor
        results = make_batch_prediction(df)
        return results
    except ValueError as e:
        logger.error(f"✖ Batch prediction validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"✖ Batch prediction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    # Load settings from environment or fallback
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    logger.info(f"Starting API server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
