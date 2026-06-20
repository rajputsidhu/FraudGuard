import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
# Patch np.int for compatibility with older shap versions in newer numpy
if not hasattr(np, "int"):
    np.int = int
import shap

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger, ensure_dir

# Initialize logger
logger = setup_logger("05_shap_explainability", "logs/shap_explainability.log")

def run_shap_explainability(processed_dir: str, models_dir: str, plots_dir: str, reports_dir: str) -> None:
    """
    Computes SHAP values for the trained XGBoost model using a subset of test data.
    Generates summary, importance, dependence, waterfall, and force plots.
    
    Args:
        processed_dir: Directory containing processed numpy files.
        models_dir: Directory containing trained model files.
        plots_dir: Directory where SHAP plots will be saved.
        reports_dir: Directory where interactive HTML reports will be saved.
    """
    logger.info("Starting SHAP Explainability analysis stage...")
    
    # Ensure directories exist
    ensure_dir(plots_dir)
    ensure_dir(reports_dir)
    ensure_dir(models_dir)
    
    # 1. Load XGBoost Model, feature names, and processed datasets
    try:
        model_path = os.path.join(models_dir, "model_xgb.pkl")
        xgb = joblib.load(model_path)
        
        feature_names_path = os.path.join(models_dir, "feature_names.pkl")
        feature_names = joblib.load(feature_names_path)
        
        X_test = np.load(os.path.join(processed_dir, "X_test.npy"))
        y_test = np.load(os.path.join(processed_dir, "y_test.npy"))
        logger.info("✔ XGBoost model, feature names, and test dataset loaded successfully.")
    except Exception as e:
        logger.error(f"✖ Failed to load models/data for SHAP: {str(e)}")
        sys.exit(1)
        
    # Convert test set to DataFrame with proper feature names for SHAP plots
    X_test_df = pd.DataFrame(X_test, columns=feature_names)
    
    # To keep computation fast and stable, extract a representative sample of test cases:
    # 800 legitimate transactions + all fraud transactions in the test set (which is around 98 cases)
    fraud_indices = np.where(y_test == 1)[0]
    legit_indices = np.where(y_test == 0)[0]
    
    # Randomly sample 800 legitimate transactions
    np.random.seed(42)
    sample_legit_indices = np.random.choice(legit_indices, size=min(800, len(legit_indices)), replace=False)
    
    # Combine and shuffle
    sample_indices = np.concatenate([sample_legit_indices, fraud_indices])
    np.random.shuffle(sample_indices)
    
    X_sample = X_test_df.iloc[sample_indices].reset_index(drop=True)
    y_sample = y_test[sample_indices]
    
    logger.info(f"Computing SHAP values on a representative sample of {len(X_sample)} cases (containing {len(fraud_indices)} fraud cases)...")
    
    # 2. Build SHAP Explainer
    # Use TreeExplainer since XGBoost is a tree-based model
    explainer = shap.TreeExplainer(xgb)
    
    # Save the SHAP Explainer object
    joblib.dump(explainer, os.path.join(models_dir, "shap_explainer.pkl"))
    logger.info("✔ Saved TreeExplainer to models/shap_explainer.pkl")
    
    # Compute SHAP values
    # To support both newer and older SHAP versions, we compute the Explanation object
    # using explainer(X) and retrieve the raw values if needed
    try:
        # Modern API
        explanation = explainer(X_sample)
        shap_values_np = explanation.values
        logger.info("✔ Computed SHAP values using the modern explainer(X) API.")
    except Exception as e:
        logger.warning(f"⚠ Modern explainer(X) API failed: {e}. Falling back to classical API.")
        shap_values_np = explainer.shap_values(X_sample)
        # Create an Explanation-like object if needed
        explanation = shap.Explanation(
            values=shap_values_np,
            base_values=explainer.expected_value,
            data=X_sample.to_numpy(),
            feature_names=feature_names
        )
        
    # Save SHAP values numpy array
    np.save(os.path.join(processed_dir, "shap_values.npy"), shap_values_np)
    logger.info("✔ Saved SHAP values array to data_processed/shap_values.npy")
    
    # ----------------------------------------------------
    # Generate Visualizations
    # ----------------------------------------------------
    logger.info("Generating SHAP plots...")
    
    # Set plot aesthetic defaults
    plt.rcParams.update({'font.size': 10})
    
    # Plot 1: SHAP summary plot (Beeswarm plot)
    plt.figure(figsize=(10, 8))
    try:
        # beeswarm plot shows impact of features on predictions
        shap.plots.beeswarm(explanation, show=False, max_display=15)
        plt.title("SHAP Beeswarm Plot (Top 15 Features)", fontsize=14, weight='bold', pad=15)
        plt.tight_layout()
        plt.savefig(os.path.join(plots_dir, "shap_summary.png"), dpi=150)
        logger.info("✔ Saved SHAP summary plot to outputs/plots/shap_summary.png")
    except Exception as e:
        logger.error(f"✖ Failed to generate beeswarm summary plot: {e}")
    plt.close()
    
    # Plot 2: SHAP feature importance plot (bar chart of mean absolute SHAP values)
    plt.figure(figsize=(10, 8))
    try:
        shap.plots.bar(explanation, show=False, max_display=15)
        plt.title("SHAP Mean Absolute Feature Importance (Top 15 Features)", fontsize=14, weight='bold', pad=15)
        plt.tight_layout()
        plt.savefig(os.path.join(plots_dir, "shap_importance.png"), dpi=150)
        logger.info("✔ Saved SHAP feature importance plot to outputs/plots/shap_importance.png")
    except Exception as e:
        logger.error(f"✖ Failed to generate feature importance plot: {e}")
    plt.close()
    
    # Plot 3: SHAP dependence plot
    # Identify the top feature (which is the one with highest mean absolute SHAP value)
    mean_abs_shap = np.mean(np.abs(shap_values_np), axis=0)
    top_feature_idx = np.argmax(mean_abs_shap)
    top_feature_name = feature_names[top_feature_idx]
    logger.info(f"Top feature identified by SHAP: {top_feature_name}")
    
    plt.figure(figsize=(8, 6))
    try:
        # Scatter/dependence plot showing feature values vs SHAP values
        shap.plots.scatter(explanation[:, top_feature_name], show=False)
        plt.title(f"SHAP Dependence Plot for {top_feature_name}", fontsize=12, weight='bold')
        plt.tight_layout()
        plt.savefig(os.path.join(plots_dir, "shap_dependence.png"), dpi=150)
        logger.info("✔ Saved SHAP dependence plot to outputs/plots/shap_dependence.png")
    except Exception as e:
        logger.error(f"✖ Failed to generate dependence plot: {e}")
    plt.close()
    
    # Plot 4: SHAP waterfall plot for a single FRAUD transaction
    # Find the index of the first actual fraud transaction in our sample
    sample_fraud_indices = np.where(y_sample == 1)[0]
    if len(sample_fraud_indices) > 0:
        fraud_idx = sample_fraud_indices[0]
        plt.figure(figsize=(10, 6))
        try:
            shap.plots.waterfall(explanation[fraud_idx], show=False)
            plt.title(f"SHAP Waterfall Plot for a Fraud Transaction (Sample Index {fraud_idx})", fontsize=12, weight='bold', pad=15)
            plt.tight_layout()
            plt.savefig(os.path.join(plots_dir, "shap_waterfall_fraud.png"), dpi=150)
            logger.info("✔ Saved SHAP waterfall plot to outputs/plots/shap_waterfall_fraud.png")
        except Exception as e:
            logger.error(f"✖ Failed to generate waterfall plot: {e}")
        plt.close()
        
        # 3. Interactive Force Plot saved as HTML
        try:
            # We must use the traditional force plot rendering to write HTML
            # Note: matplotlib=False produces JS interactive rendering
            expected_val = explainer.expected_value
            # Check if expected value is iterable (multiclass vs binary)
            if isinstance(expected_val, (list, np.ndarray)):
                expected_val = expected_val[0]
                
            force_plot = shap.force_plot(
                expected_val,
                shap_values_np[fraud_idx],
                X_sample.iloc[fraud_idx],
                link="logit", # Plot in probability space (using logit link)
                matplotlib=False
            )
            
            html_path = os.path.join(reports_dir, "shap_force_plot.html")
            shap.save_html(html_path, force_plot)
            logger.info(f"✔ Saved interactive SHAP force plot to {html_path}")
        except Exception as e:
            logger.error(f"✖ Failed to generate interactive force plot HTML: {e}")
    else:
        logger.warning("⚠ No fraud transactions found in the sample. Skipping waterfall and force plots.")

    logger.info("✔ SHAP explainability analysis complete.")

if __name__ == "__main__":
    run_shap_explainability(
        processed_dir="data_processed",
        models_dir="models",
        plots_dir="outputs/plots",
        reports_dir="outputs/reports"
    )
