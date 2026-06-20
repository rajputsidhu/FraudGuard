#!/bin/bash

# Exit immediately if any command exits with a non-zero status
set -e

# Save the start time of the entire pipeline
START_TIME=$(date +%s)

# Clear terminal screen for neat presentation
clear

echo "===================================================================="
echo "💳 STARTING CREDIT CARD FRAUD DETECTION MACHINE LEARNING PIPELINE"
echo "===================================================================="

# Stage 1: Exploratory Data Analysis
echo -e "\n\n🚀 [STAGE 1/5] Running Exploratory Data Analysis (EDA)..."
echo "--------------------------------------------------------------------"
python src/01_eda.py

# Stage 2: Data Preprocessing and Resampling
echo -e "\n\n🚀 [STAGE 2/5] Running Feature Scaling, Splits, and SMOTE..."
echo "--------------------------------------------------------------------"
python src/02_preprocessing.py

# Stage 3: Model Training
echo -e "\n\n🚀 [STAGE 3/5] Training and Comparing Classification Models..."
echo "--------------------------------------------------------------------"
python src/03_model_training.py

# Stage 4: Detailed Evaluation
echo -e "\n\n🚀 [STAGE 4/5] Tuning Decision Thresholds and Assessing Savings..."
echo "--------------------------------------------------------------------"
python src/04_evaluation.py

# Stage 5: Explainable AI calculations
echo -e "\n\n🚀 [STAGE 5/5] Generating SHAP Explanation Values & Plots..."
echo "--------------------------------------------------------------------"
python src/05_shap_explainability.py

# Calculate execution duration
END_TIME=$(date +%s)
ELAPSED_SECONDS=$((END_TIME - START_TIME))

echo -e "\n"
echo "===================================================================="
echo "✔ Pipeline complete."
echo "Total Pipeline Execution Time: $ELAPSED_SECONDS seconds"
echo "===================================================================="
echo -e "\n"

# Launch React Frontend dashboard
echo "===================================================================="
echo "🖥 Launching React Frontend Dashboard..."
echo "===================================================================="
cd frontend
if [ ! -d "node_modules" ]; then
  echo "Installing Node.js dependencies..."
  npm install
fi
npm run dev
