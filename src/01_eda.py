import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import setup_logger, ensure_dir

# Initialize logger
logger = setup_logger("01_eda", "logs/eda.log")

def run_eda(data_path: str, output_dir: str) -> None:
    """
    Loads dataset, calculates descriptive statistics, and saves EDA visualizations.
    
    Args:
        data_path: Path to the input credit card fraud CSV.
        output_dir: Directory where generated plots will be saved.
    """
    logger.info("Starting Exploratory Data Analysis (EDA) stage...")
    
    # Ensure output directories exist
    ensure_dir(output_dir)
    
    # 1. Load Dataset
    if not os.path.exists(data_path):
        logger.error(f"✖ Dataset not found at {data_path}")
        sys.exit(1)
        
    try:
        logger.info(f"Loading data from {data_path}...")
        df = pd.read_csv(data_path)
        logger.info(f"✔ Dataset loaded successfully. Shape: {df.shape}")
    except Exception as e:
        logger.error(f"✖ Failed to load dataset: {str(e)}")
        sys.exit(1)

    # 2. Print Dataset Properties
    print("\n" + "="*50)
    print("DATASET DETAILS")
    print("="*50)
    print(f"Shape: {df.shape[0]} rows, {df.shape[1]} columns")
    print("\nData Types:")
    print(df.dtypes)
    print(f"\nMemory Usage: {df.memory_usage(deep=True).sum() / (1024**2):.2f} MB")
    
    # Missing Values
    missing_vals = df.isnull().sum().sum()
    print(f"\nMissing Values Count: {missing_vals}")
    if missing_vals > 0:
        logger.warning("⚠ Dataset contains missing values.")
    else:
        logger.info("✔ No missing values found.")
        
    # Class Distribution
    class_counts = df['Class'].value_counts()
    class_pct = df['Class'].value_counts(normalize=True) * 100
    print("\nClass Distribution:")
    for cls, count in class_counts.items():
        label = "Fraudulent" if cls == 1 else "Legitimate"
        print(f"  - {label} (Class {cls}): {count} ({class_pct[cls]:.3f}%)")
        
    # Amount Statistics by Class
    print("\nTransaction Amount Statistics grouped by Class:")
    amount_stats = df.groupby('Class')['Amount'].describe()
    print(amount_stats)
    
    # Top Correlated Features with Fraud
    print("\nTop 10 correlated features with Fraud ('Class'):")
    correlations = df.corr()['Class'].sort_values(ascending=False)
    # Exclude Class itself
    correlations = correlations.drop('Class')
    print("Positive Correlation (higher values increase fraud likelihood):")
    print(correlations[correlations > 0].head(5))
    print("\nNegative Correlation (lower values increase fraud likelihood):")
    print(correlations[correlations < 0].tail(5))
    print("="*50 + "\n")

    # 3. Generate Visualizations
    logger.info("Generating and saving plots...")
    
    # Use a modern aesthetic style
    sns.set_theme(style="whitegrid")
    plt.rcParams.update({
        'font.size': 10,
        'axes.labelsize': 11,
        'axes.titlesize': 12,
        'xtick.labelsize': 9,
        'ytick.labelsize': 9,
        'figure.titlesize': 14
    })
    
    # Color palette
    colors = ['#1f77b4', '#d62728'] # Legitimate (Blue), Fraudulent (Red)

    # Plot 1: Pie chart of class distribution
    fig, ax = plt.subplots(figsize=(6, 5))
    ax.pie(
        class_counts, 
        labels=['Legitimate', 'Fraudulent'], 
        autopct='%1.3f%%', 
        startangle=90, 
        colors=colors,
        explode=(0, 0.2), # pop out the fraud slice
        textprops={'fontsize': 11, 'weight': 'bold'}
    )
    ax.set_title("Class Distribution (Highly Imbalanced)", fontsize=13, weight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "eda_report.png"), dpi=150)
    plt.close()
    
    # Plot 2: Amount Histogram by Class (using log scale due to heavy skew)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    sns.histplot(
        data=df[df['Class'] == 0],
        x='Amount',
        bins=50,
        color='#1f77b4',
        ax=ax1,
        kde=True,
        log_scale=(False, True)
    )
    ax1.set_title("Legitimate Transaction Amount Distribution (Log Count)", weight='bold')
    ax1.set_xlabel("Amount ($)")
    ax1.set_ylabel("Log Count")
    
    sns.histplot(
        data=df[df['Class'] == 1],
        x='Amount',
        bins=50,
        color='#d62728',
        ax=ax2,
        kde=True,
        log_scale=(False, True)
    )
    ax2.set_title("Fraudulent Transaction Amount Distribution (Log Count)", weight='bold')
    ax2.set_xlabel("Amount ($)")
    ax2.set_ylabel("Log Count")
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "amount_distribution.png"), dpi=150) # Helper/extra plot
    plt.close()

    # Plot 3: Scatter plot of transactions over time vs Amount
    fig, ax = plt.subplots(figsize=(10, 5))
    sns.scatterplot(
        data=df.sort_values(by='Class'), # Draw fraud on top of legitimate
        x='Time',
        y='Amount',
        hue='Class',
        palette={0: '#1f77b4', 1: '#d62728'},
        alpha=0.6,
        size='Class',
        sizes={0: 10, 1: 30},
        ax=ax
    )
    # Custom Legend
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles, ['Legitimate', 'Fraudulent'], title="Transaction Type")
    ax.set_title("Transaction Amount vs. Time elapsed", weight='bold')
    ax.set_xlabel("Time (Seconds from first transaction)")
    ax.set_ylabel("Amount ($)")
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "time_vs_amount.png"), dpi=150) # Extra plot
    plt.close()

    # Plot 4: Histograms for V1, V2, V3
    fig, axes = plt.subplots(3, 1, figsize=(10, 10), sharex=False)
    features = ['V1', 'V2', 'V3']
    for i, feat in enumerate(features):
        sns.kdeplot(
            data=df[df['Class'] == 0],
            x=feat,
            color='#1f77b4',
            label='Legitimate',
            fill=True,
            alpha=0.3,
            ax=axes[i]
        )
        sns.kdeplot(
            data=df[df['Class'] == 1],
            x=feat,
            color='#d62728',
            label='Fraudulent',
            fill=True,
            alpha=0.3,
            ax=axes[i]
        )
        axes[i].set_title(f"Density Distribution of Feature {feat}", weight='bold')
        axes[i].set_xlabel(feat)
        axes[i].set_ylabel("Density")
        axes[i].legend()
        
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "v_features_distribution.png"), dpi=150) # Extra plot
    plt.close()
    
    # Save a combined image containing summary elements as "eda_report.png"
    # Actually let's create a combined visual dashboard of the EDA.
    # To keep it exactly as requested:
    # "Generate and save: Pie chart of class distribution, Amount histogram by class, Scatter plot of transactions over time, Histograms for V1, V2, V3. Save all plots to: outputs/plots/"
    # Let's save a combined EDA plot which has:
    # Row 1: Pie chart of class distribution, Amount histogram by class
    # Row 2: Scatter plot of transactions over time, density plots of V1, V2, V3
    fig = plt.figure(figsize=(15, 12))
    grid = plt.GridSpec(3, 2, wspace=0.3, hspace=0.4)
    
    # Pie chart
    ax_pie = fig.add_subplot(grid[0, 0])
    ax_pie.pie(
        class_counts, 
        labels=['Legitimate', 'Fraudulent'], 
        autopct='%1.3f%%', 
        startangle=90, 
        colors=colors,
        explode=(0, 0.2),
        textprops={'fontsize': 10, 'weight': 'bold'}
    )
    ax_pie.set_title("Class Distribution (Highly Imbalanced)", weight='bold')
    
    # Amount by class
    ax_amt = fig.add_subplot(grid[0, 1])
    sns.boxplot(data=df, x='Class', y='Amount', palette=colors, ax=ax_amt)
    ax_amt.set_yscale('log')
    ax_amt.set_xticklabels(['Legitimate', 'Fraudulent'])
    ax_amt.set_title("Transaction Amount Distribution (Log Scale)", weight='bold')
    
    # Time Scatter
    ax_time = fig.add_subplot(grid[1, :])
    sns.scatterplot(
        data=df.sort_values(by='Class'),
        x='Time',
        y='Amount',
        hue='Class',
        palette={0: '#1f77b4', 1: '#d62728'},
        alpha=0.5,
        ax=ax_time,
        size='Class',
        sizes={0: 5, 1: 20}
    )
    ax_time.set_yscale('log')
    ax_time.set_title("Transaction Amount vs. Time over 48 Hours", weight='bold')
    ax_time.set_xlabel("Time (Seconds)")
    ax_time.set_ylabel("Amount (Log Scale)")
    ax_time.legend(['Legitimate', 'Fraudulent'], title="Class")
    
    # V1, V2, V3 density
    ax_v1 = fig.add_subplot(grid[2, 0])
    sns.kdeplot(data=df, x='V1', hue='Class', common_norm=False, fill=True, palette=colors, alpha=0.3, ax=ax_v1)
    ax_v1.set_title("Density of V1 by Class", weight='bold')
    
    ax_v2 = fig.add_subplot(grid[2, 1])
    sns.kdeplot(data=df, x='V2', hue='Class', common_norm=False, fill=True, palette=colors, alpha=0.3, ax=ax_v2)
    ax_v2.set_title("Density of V2 by Class", weight='bold')
    
    plt.suptitle("Credit Card Fraud Detection - Exploratory Data Analysis", fontsize=16, weight='bold', y=0.96)
    plt.savefig(os.path.join(output_dir, "eda_report.png"), dpi=150)
    plt.close()
    
    logger.info("✔ EDA visualizations generated and saved to outputs/plots/eda_report.png.")

if __name__ == "__main__":
    run_eda(
        data_path="data/creditcard.csv",
        output_dir="outputs/plots"
    )
