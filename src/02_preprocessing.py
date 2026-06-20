import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger, ensure_dir

# Initialize logger
logger = setup_logger("02_preprocessing", "logs/preprocessing.log")

def run_preprocessing(data_path: str, processed_dir: str, models_dir: str, plots_dir: str) -> None:
    """
    Performs train-test split, scales Time & Amount, applies SMOTE & RandomUnderSampler
    on the training data, and serializes the processed arrays and scaler.
    
    Args:
        data_path: Path to the input credit card fraud CSV.
        processed_dir: Directory where processed numpy arrays will be saved.
        models_dir: Directory where the scaler and feature names will be saved.
        plots_dir: Directory where plots will be saved.
    """
    logger.info("Starting Data Preprocessing stage...")
    
    # Ensure all paths exist
    ensure_dir(processed_dir)
    ensure_dir(models_dir)
    ensure_dir(plots_dir)
    
    # Load dataset
    if not os.path.exists(data_path):
        logger.error(f"✖ Raw data not found at {data_path}")
        sys.exit(1)
        
    logger.info(f"Loading raw dataset from {data_path}...")
    df = pd.read_csv(data_path)
    
    # Extract features and targets
    X = df.drop(columns=['Class'])
    y = df['Class']
    
    # Keep track of feature names for inference and SHAP interpretation
    feature_names = list(X.columns)
    joblib.dump(feature_names, os.path.join(models_dir, "feature_names.pkl"))
    logger.info("✔ Feature names serialized to models/feature_names.pkl")
    
    # Stratified Train-Test Split (80/20)
    logger.info("Performing Stratified 80/20 Train-Test split...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    
    # Log original distributions
    train_counts = y_train.value_counts()
    test_counts = y_test.value_counts()
    logger.info(f"Original Train shape: {X_train.shape}, Test shape: {X_test.shape}")
    logger.info(f"Original Train Class Distribution: Legitimate={train_counts[0]} ({train_counts[0]/len(y_train)*100:.3f}%), Fraud={train_counts[1]} ({train_counts[1]/len(y_train)*100:.3f}%)")
    logger.info(f"Original Test Class Distribution: Legitimate={test_counts[0]} ({test_counts[0]/len(y_test)*100:.3f}%), Fraud={test_counts[1]} ({test_counts[1]/len(y_test)*100:.3f}%)")
    
    # Scaling Time and Amount (Only fit on X_train to avoid data leakage!)
    logger.info("Scaling 'Time' and 'Amount' features using StandardScaler...")
    scaler = StandardScaler()
    
    # Get indices of Time and Amount
    time_idx = feature_names.index('Time')
    amount_idx = feature_names.index('Amount')
    
    # We must convert to numpy arrays or work on dataframes
    # It's easier to fit on the specific columns of the training set DataFrame
    scaled_cols = ['Time', 'Amount']
    
    # Fit scaler on training set
    scaler.fit(X_train[scaled_cols])
    
    # Transform both training and test sets
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[scaled_cols] = scaler.transform(X_train[scaled_cols])
    X_test_scaled[scaled_cols] = scaler.transform(X_test[scaled_cols])
    
    # Save the scaler
    joblib.dump(scaler, os.path.join(models_dir, "scaler.pkl"))
    logger.info("✔ StandardScaler fitted and saved to models/scaler.pkl")
    
    # Apply Resampling on the Training Data ONLY
    # SMOTE (sampling_strategy=0.1) -> Over-sample minority class to 10% of majority class
    # RandomUnderSampler (sampling_strategy=0.5) -> Under-sample majority class to achieve 1:2 minority-to-majority ratio (33.3% fraud)
    
    logger.info("Applying SMOTE (sampling_strategy=0.1) on training set...")
    smote = SMOTE(sampling_strategy=0.1, random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train_scaled, y_train)
    
    smote_counts = pd.Series(y_train_res).value_counts()
    logger.info(f"After SMOTE distribution: Legitimate={smote_counts[0]}, Fraud={smote_counts[1]} ({smote_counts[1]/len(y_train_res)*100:.2f}%)")
    
    logger.info("Applying RandomUnderSampler (sampling_strategy=0.5) on training set...")
    rus = RandomUnderSampler(sampling_strategy=0.5, random_state=42)
    X_train_final, y_train_final = rus.fit_resample(X_train_res, y_train_res)
    
    final_counts = pd.Series(y_train_final).value_counts()
    logger.info(f"After UnderSampler distribution: Legitimate={final_counts[0]}, Fraud={final_counts[1]} ({final_counts[1]/len(y_train_final)*100:.2f}%)")
    
    # Convert back to numpy arrays for storage efficiency
    X_train_np = X_train_final.to_numpy()
    y_train_np = y_train_final.to_numpy()
    X_test_np = X_test_scaled.to_numpy()
    y_test_np = y_test.to_numpy()
    
    # Save processed datasets
    np.save(os.path.join(processed_dir, "X_train.npy"), X_train_np)
    np.save(os.path.join(processed_dir, "y_train.npy"), y_train_np)
    np.save(os.path.join(processed_dir, "X_test.npy"), X_test_np)
    np.save(os.path.join(processed_dir, "y_test.npy"), y_test_np)
    
    logger.info("✔ Processed datasets saved as numpy files in data_processed/")
    
    # Generate SMOTE distribution plot
    logger.info("Generating and saving SMOTE distribution plot...")
    
    stages = ['Original Train', 'After SMOTE', 'After UnderSampler']
    legit_counts = [train_counts[0], smote_counts[0], final_counts[0]]
    fraud_counts = [train_counts[1], smote_counts[1], final_counts[1]]
    
    x = np.arange(len(stages))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(8, 5))
    rects1 = ax.bar(x - width/2, legit_counts, width, label='Legitimate (Class 0)', color='#1f77b4')
    rects2 = ax.bar(x + width/2, fraud_counts, width, label='Fraudulent (Class 1)', color='#d62728')
    
    ax.set_ylabel('Number of Samples')
    ax.set_title('Training Set Class Resampling Progression', fontsize=12, weight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(stages)
    ax.legend()
    ax.set_yscale('log') # Use log scale to show small minority values clearly
    
    # Add values on top of bars
    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height}',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=8)
                        
    autolabel(rects1)
    autolabel(rects2)
    
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "smote_distribution.png"), dpi=150)
    plt.close()
    
    logger.info("✔ Saved resampling comparison plot to outputs/plots/smote_distribution.png")

if __name__ == "__main__":
    run_preprocessing(
        data_path="data/creditcard.csv",
        processed_dir="data_processed",
        models_dir="models",
        plots_dir="outputs/plots"
    )
