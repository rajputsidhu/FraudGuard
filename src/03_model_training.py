import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from typing import Dict, Any

# Model classes
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from xgboost import XGBClassifier

# Evaluation metrics
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score
)

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger, ensure_dir

# Initialize logger
logger = setup_logger("03_model_training", "logs/model_training.log")

def train_and_evaluate(processed_dir: str, models_dir: str, plots_dir: str) -> None:
    """
    Trains Logistic Regression, Random Forest, XGBoost, and Isolation Forest models.
    Evaluates them on the test set and saves comparison reports/plots.
    
    Args:
        processed_dir: Directory containing processed numpy files.
        models_dir: Directory where models will be serialized.
        plots_dir: Directory where the comparison plot will be saved.
    """
    logger.info("Starting Model Training and Evaluation stage...")
    
    # Ensure directories exist
    ensure_dir(models_dir)
    ensure_dir(plots_dir)
    
    # 1. Load Processed Data
    try:
        X_train = np.load(os.path.join(processed_dir, "X_train.npy"))
        y_train = np.load(os.path.join(processed_dir, "y_train.npy"))
        X_test = np.load(os.path.join(processed_dir, "X_test.npy"))
        y_test = np.load(os.path.join(processed_dir, "y_test.npy"))
        logger.info(f"✔ Processed data loaded. Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")
    except Exception as e:
        logger.error(f"✖ Failed to load processed data: {str(e)}")
        sys.exit(1)
        
    # Dictionary to store performance results
    results: Dict[str, Dict[str, float]] = {}
    
    # Dictionary to store trained model objects
    trained_models: Dict[str, Any] = {}
    
    # ----------------------------------------------------
    # Model 1: Logistic Regression
    # ----------------------------------------------------
    logger.info("Training Logistic Regression (class_weight='balanced')...")
    lr = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)
    lr.fit(X_train, y_train)
    
    # Evaluation
    y_pred_lr = lr.predict(X_test)
    y_prob_lr = lr.predict_proba(X_test)[:, 1]
    
    results['Logistic Regression'] = {
        'Precision': precision_score(y_test, y_pred_lr),
        'Recall': recall_score(y_test, y_pred_lr),
        'F1-score': f1_score(y_test, y_pred_lr),
        'ROC-AUC': roc_auc_score(y_test, y_prob_lr),
        'PR-AUC': average_precision_score(y_test, y_prob_lr)
    }
    trained_models['model_lr.pkl'] = lr
    logger.info("✔ Logistic Regression training and evaluation complete.")
    
    # ----------------------------------------------------
    # Model 2: Random Forest
    # ----------------------------------------------------
    logger.info("Training Random Forest (n_estimators=200, max_depth=12)...")
    rf = RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    
    # Evaluation
    y_pred_rf = rf.predict(X_test)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]
    
    results['Random Forest'] = {
        'Precision': precision_score(y_test, y_pred_rf),
        'Recall': recall_score(y_test, y_pred_rf),
        'F1-score': f1_score(y_test, y_pred_rf),
        'ROC-AUC': roc_auc_score(y_test, y_prob_rf),
        'PR-AUC': average_precision_score(y_test, y_prob_rf)
    }
    trained_models['model_rf.pkl'] = rf
    logger.info("✔ Random Forest training and evaluation complete.")
    
    # ----------------------------------------------------
    # Model 3: XGBoost (Primary Model)
    # ----------------------------------------------------
    # Calculate negative to positive ratio on training set to handle class imbalance
    neg_count = np.sum(y_train == 0)
    pos_count = np.sum(y_train == 1)
    ratio = neg_count / pos_count
    
    logger.info(f"Training XGBoost (n_estimators=300, learning_rate=0.05, scale_pos_weight={ratio:.3f})...")
    
    # Shuffle the training data to ensure balanced class representation in the validation split
    np.random.seed(42)
    shuffle_idx = np.random.permutation(len(X_train))
    X_train_shuffled = X_train[shuffle_idx]
    y_train_shuffled = y_train[shuffle_idx]
    
    # For early stopping, split a validation set (15%) from the training set
    # to avoid data leakage from test set
    val_size = int(0.15 * len(X_train_shuffled))
    X_val, y_val = X_train_shuffled[-val_size:], y_train_shuffled[-val_size:]
    X_tr, y_tr = X_train_shuffled[:-val_size], y_train_shuffled[:-val_size]
    
    xgb = XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        scale_pos_weight=ratio,
        eval_metric='aucpr',
        random_state=42,
        n_jobs=-1
    )
    
    xgb.fit(
        X_tr, y_tr,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=20,
        verbose=False
    )
    
    # Evaluation
    y_pred_xgb = xgb.predict(X_test)
    y_prob_xgb = xgb.predict_proba(X_test)[:, 1]
    
    results['XGBoost'] = {
        'Precision': precision_score(y_test, y_pred_xgb),
        'Recall': recall_score(y_test, y_pred_xgb),
        'F1-score': f1_score(y_test, y_pred_xgb),
        'ROC-AUC': roc_auc_score(y_test, y_prob_xgb),
        'PR-AUC': average_precision_score(y_test, y_prob_xgb)
    }
    trained_models['model_xgb.pkl'] = xgb
    logger.info("✔ XGBoost training and evaluation complete.")
    
    # ----------------------------------------------------
    # Model 4: Isolation Forest
    # ----------------------------------------------------
    logger.info("Training Isolation Forest (contamination=0.002)...")
    
    # Unsupervised, fits only on feature matrices (we fit on raw training set, ignoring y_train)
    # The default behavior uses all features.
    clf_if = IsolationForest(contamination=0.002, random_state=42, n_jobs=-1)
    clf_if.fit(X_train)
    
    # Evaluation
    # Isolation Forest predicts -1 for anomalies (fraud) and 1 for normal
    y_pred_if = clf_if.predict(X_test)
    y_pred_if_mapped = np.where(y_pred_if == -1, 1, 0)
    
    # Anomaly scores (lower values indicate higher anomaly likelihood)
    # For PR-AUC and ROC-AUC calculation we need scores where higher means anomaly
    y_score_if = -clf_if.decision_function(X_test)
    
    results['Isolation Forest'] = {
        'Precision': precision_score(y_test, y_pred_if_mapped, zero_division=0),
        'Recall': recall_score(y_test, y_pred_if_mapped),
        'F1-score': f1_score(y_test, y_pred_if_mapped),
        'ROC-AUC': roc_auc_score(y_test, y_score_if),
        'PR-AUC': average_precision_score(y_test, y_score_if)
    }
    trained_models['model_if.pkl'] = clf_if
    logger.info("✔ Isolation Forest training and evaluation complete.")
    
    # ----------------------------------------------------
    # Serialize Models and Compare Results
    # ----------------------------------------------------
    # Save all models
    for filename, model in trained_models.items():
        path = os.path.join(models_dir, filename)
        joblib.dump(model, path)
        logger.info(f"✔ Saved model to {path}")
        
    # Convert results dictionary to DataFrame for printing and plotting
    df_results = pd.DataFrame(results).T
    print("\n" + "="*70)
    print("MODEL COMPARISON REPORT")
    print("="*70)
    print(df_results.to_string(formatters={
        'Precision': '{:,.4f}'.format,
        'Recall': '{:,.4f}'.format,
        'F1-score': '{:,.4f}'.format,
        'ROC-AUC': '{:,.4f}'.format,
        'PR-AUC': '{:,.4f}'.format
    }))
    print("="*70 + "\n")
    
    # Identify the best model using PR-AUC (excluding Isolation Forest from primary,
    # but XGBoost will generally win and is the required primary model).
    # We will log the best model based on PR-AUC.
    best_model_name = df_results['PR-AUC'].idxmax()
    logger.info(f"✔ Best model selected based on PR-AUC: {best_model_name} ({df_results.loc[best_model_name, 'PR-AUC']:.4f})")
    
    # Generate model comparison bar chart
    logger.info("Generating and saving model comparison chart...")
    
    sns.set_theme(style="whitegrid")
    df_plot = df_results.reset_index().rename(columns={'index': 'Model'})
    df_melt = df_plot.melt(id_vars='Model', var_name='Metric', value_name='Score')
    
    plt.figure(figsize=(12, 6))
    ax = sns.barplot(data=df_melt, x='Metric', y='Score', hue='Model', palette='muted')
    
    plt.title('Performance Comparison of Fraud Detection Models', fontsize=14, weight='bold')
    plt.xlabel('Evaluation Metrics (No Accuracy)', fontsize=12)
    plt.ylabel('Score', fontsize=12)
    plt.ylim(0, 1.05)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', title='Models')
    
    # Add values on top of bars
    for p in ax.patches:
        height = p.get_height()
        if height > 0.01:
            ax.annotate(f'{height:.2f}',
                        xy=(p.get_x() + p.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=8)
                        
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "model_comparison.png"), dpi=150)
    plt.close()
    
    logger.info("✔ Model comparison chart saved to outputs/plots/model_comparison.png")

if __name__ == "__main__":
    train_and_evaluate(
        processed_dir="data_processed",
        models_dir="models",
        plots_dir="outputs/plots"
    )
