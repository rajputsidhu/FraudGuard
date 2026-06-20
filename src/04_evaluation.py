import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from sklearn.metrics import precision_recall_curve, confusion_matrix, classification_report, precision_score, recall_score

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger, ensure_dir

# Initialize logger
logger = setup_logger("04_evaluation", "logs/evaluation.log")

def run_evaluation(processed_dir: str, models_dir: str, plots_dir: str) -> None:
    """
    Evaluates XGBoost model, sweeps decision threshold, computes business impact metrics,
    and generates visual evaluation reports.
    
    Args:
        processed_dir: Directory containing processed numpy files.
        models_dir: Directory containing model files and where threshold will be saved.
        plots_dir: Directory where evaluation plots will be saved.
    """
    logger.info("Starting Detailed Model Evaluation stage...")
    
    # Ensure directories exist
    ensure_dir(models_dir)
    ensure_dir(plots_dir)
    
    # 1. Load XGBoost Model and processed data
    try:
        model_path = os.path.join(models_dir, "model_xgb.pkl")
        if not os.path.exists(model_path):
            logger.error(f"✖ Trained XGBoost model not found at {model_path}")
            sys.exit(1)
            
        xgb = joblib.load(model_path)
        X_test = np.load(os.path.join(processed_dir, "X_test.npy"))
        y_test = np.load(os.path.join(processed_dir, "y_test.npy"))
        logger.info("✔ XGBoost model and test data loaded.")
    except Exception as e:
        logger.error(f"✖ Failed to load models/data: {str(e)}")
        sys.exit(1)
        
    # Get probability predictions on the test set
    y_prob = xgb.predict_proba(X_test)[:, 1]
    
    # 2. Threshold Sweep (0.01 to 0.99) to optimize F1-score
    thresholds = np.arange(0.01, 1.0, 0.01)
    precisions = []
    recalls = []
    f1_scores = []
    
    best_f1 = -1.0
    best_thresh = 0.5
    
    for thresh in thresholds:
        y_pred_thresh = (y_prob >= thresh).astype(int)
        
        # Calculate scores
        tp = np.sum((y_test == 1) & (y_pred_thresh == 1))
        fp = np.sum((y_test == 0) & (y_pred_thresh == 1))
        fn = np.sum((y_test == 1) & (y_pred_thresh == 0))
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        precisions.append(precision)
        recalls.append(recall)
        f1_scores.append(f1)
        
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = thresh
            
    # Save the optimized threshold
    joblib.dump(best_thresh, os.path.join(models_dir, "best_threshold.pkl"))
    logger.info(f"✔ Best threshold selected: {best_thresh:.2f} with F1-score: {best_f1:.4f}")
    
    # 3. Calculate Business Impact Metrics
    # Constants
    COST_FRAUD_LOSS = 122.0          # Avg loss per fraud transaction
    COST_FALSE_POSITIVE = 2.0        # Friction cost of blocking legit transaction
    
    # Function to compute metrics for a given threshold
    def calculate_business_impact(thresh: float) -> dict:
        y_pred = (y_prob >= thresh).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        
        fraud_prevented_val = tp * COST_FRAUD_LOSS
        fp_cost_val = fp * COST_FALSE_POSITIVE
        fraud_missed_val = fn * COST_FRAUD_LOSS
        net_savings = fraud_prevented_val - fp_cost_val
        
        # Cost without a model (all fraud is processed/missed, no legits blocked)
        cost_no_model = (tp + fn) * COST_FRAUD_LOSS
        # Cost with model (missed fraud + false alarm blocker cost)
        cost_with_model = fraud_missed_val + fp_cost_val
        
        return {
            'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn,
            'fraud_prevented': fraud_prevented_val,
            'fp_cost': fp_cost_val,
            'fraud_missed': fraud_missed_val,
            'net_savings': net_savings,
            'total_cost': cost_with_model,
            'cost_no_model': cost_no_model
        }
        
    impact_opt = calculate_business_impact(best_thresh)
    impact_default = calculate_business_impact(0.50)
    
    print("\n" + "="*70)
    print("BUSINESS IMPACT REPORT (TEST SET)")
    print("="*70)
    print(f"Metrics Evaluated at Optimized Threshold: {best_thresh:.2f}")
    print(f"  - Fraud Prevented (True Positives): {impact_opt['tp']} of {impact_opt['tp'] + impact_opt['fn']} cases")
    print(f"  - Financial Fraud Prevented: ${impact_opt['fraud_prevented']:,.2f}")
    print(f"  - False Positives (Legitimate blocked): {impact_opt['fp']}")
    print(f"  - Friction Cost from False Positives: ${impact_opt['fp_cost']:,.2f}")
    print(f"  - Missed Fraud Cost (False Negatives): ${impact_opt['fraud_missed']:,.2f}")
    print(f"  - Net Business Savings: ${impact_opt['net_savings']:,.2f}")
    print("\nComparison with Default Threshold (0.50):")
    print(f"  - Net Savings at 0.50: ${impact_default['net_savings']:,.2f}")
    print(f"  - Optimization Improvement: +${impact_opt['net_savings'] - impact_default['net_savings']:,.2f}")
    print("="*70 + "\n")

    # 4. Generate Visualizations (Save as outputs/plots/evaluation_report.png)
    logger.info("Generating and saving detailed evaluation report plot...")
    
    sns.set_theme(style="whitegrid")
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # Plot A: Precision-Recall Curve
    precision_curve, recall_curve, _ = precision_recall_curve(y_test, y_prob)
    axes[0, 0].plot(recall_curve, precision_curve, color='purple', lw=2, label='XGBoost Curve')
    # Plot selected threshold point
    y_pred_opt = (y_prob >= best_thresh).astype(int)
    opt_recall = recall_score(y_test, y_pred_opt)
    opt_precision = precision_score(y_test, y_pred_opt)
    axes[0, 0].scatter(opt_recall, opt_precision, color='red', s=100, zorder=5, 
                       label=f'Optimized Thresh={best_thresh:.2f}')
    
    # Plot default threshold point (0.50)
    y_pred_def = (y_prob >= 0.50).astype(int)
    def_recall = recall_score(y_test, y_pred_def)
    def_precision = precision_score(y_test, y_pred_def)
    axes[0, 0].scatter(def_recall, def_precision, color='blue', marker='s', s=80, zorder=5, 
                       label='Default Thresh=0.50')
    
    axes[0, 0].set_xlabel('Recall (Fraud Sensitivity)')
    axes[0, 0].set_ylabel('Precision (True Fraud Ratio)')
    axes[0, 0].set_title('Precision-Recall Curve', weight='bold')
    axes[0, 0].legend()
    
    # Plot B: Metrics vs. Threshold
    axes[0, 1].plot(thresholds, precisions, label='Precision', color='green', linestyle='--')
    axes[0, 1].plot(thresholds, recalls, label='Recall', color='blue', linestyle='--')
    axes[0, 1].plot(thresholds, f1_scores, label='F1-Score', color='red', lw=2)
    axes[0, 1].axvline(best_thresh, color='black', linestyle=':', label=f'Best Thresh ({best_thresh:.2f})')
    axes[0, 1].set_xlabel('Threshold')
    axes[0, 1].set_ylabel('Score')
    axes[0, 1].set_title('F1-Score / Precision / Recall Trade-off', weight='bold')
    axes[0, 1].legend()
    
    # Plot C: Confusion Matrix at Optimized Threshold
    cm = confusion_matrix(y_test, y_pred_opt)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[1, 0], cbar=False,
                annot_kws={'size': 14, 'weight': 'bold'})
    axes[1, 0].set_xlabel('Predicted')
    axes[1, 0].set_ylabel('Actual')
    axes[1, 0].set_xticklabels(['Legitimate', 'Fraud'])
    axes[1, 0].set_yticklabels(['Legitimate', 'Fraud'])
    axes[1, 0].set_title(f'Confusion Matrix (Threshold = {best_thresh:.2f})', weight='bold')
    
    # Plot D: Business Impact Comparison
    categories = ['No Model', 'Default Thresh (0.50)', 'Optimized Thresh']
    # Total costs: without model is total loss, with model is missed fraud + FP costs
    costs = [impact_opt['cost_no_model'], impact_default['total_cost'], impact_opt['total_cost']]
    savings = [0.0, impact_default['net_savings'], impact_opt['net_savings']]
    
    x = np.arange(len(categories))
    width = 0.35
    
    rects_cost = axes[1, 1].bar(x - width/2, costs, width, label='Total Cost (Loss + Friction)', color='#d62728')
    rects_save = axes[1, 1].bar(x + width/2, savings, width, label='Net Savings', color='#2ca02c')
    
    axes[1, 1].set_ylabel('Amount ($)')
    axes[1, 1].set_title('Financial Business Impact Comparison', weight='bold')
    axes[1, 1].set_xticks(x)
    axes[1, 1].set_xticklabels(categories)
    axes[1, 1].legend()
    
    # Label the values
    for rect in rects_cost:
        height = rect.get_height()
        axes[1, 1].annotate(f'${height:,.0f}',
                            xy=(rect.get_x() + rect.get_width() / 2, height),
                            xytext=(0, 3),
                            textcoords="offset points",
                            ha='center', va='bottom', fontsize=8)
                            
    for rect in rects_save:
        height = rect.get_height()
        if height > 0:
            axes[1, 1].annotate(f'${height:,.0f}',
                                xy=(rect.get_x() + rect.get_width() / 2, height),
                                xytext=(0, 3),
                                textcoords="offset points",
                                ha='center', va='bottom', fontsize=8)
                                
    plt.suptitle("Model Evaluation & Business Impact Analysis", fontsize=16, weight='bold', y=0.96)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "evaluation_report.png"), dpi=150)
    plt.close()
    
    logger.info("✔ Saved complete evaluation report to outputs/plots/evaluation_report.png")

if __name__ == "__main__":
    run_evaluation(
        processed_dir="data_processed",
        models_dir="models",
        plots_dir="outputs/plots"
    )
