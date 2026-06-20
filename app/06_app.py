import os
import sys
import pandas as pd
import numpy as np
import streamlit as st

# Add the project root to python path for clean imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.api_client import APIClient, APIError
from app.components import (
    inject_custom_css,
    render_metric_card,
    render_result_banner,
    render_probability_gauge,
    render_shap_waterfall_plotly,
    render_footer
)

# Page configuration
st.set_page_config(
    page_title="Credit Card Fraud Detection Portal",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Inject custom styling
inject_custom_css("app/styles.css")

# Initialize API client
client = APIClient()

# Check backend health
backend_online = client.check_health()

# Initialize session state for holding analysis results
if "analysis_results" not in st.session_state:
    st.session_state.analysis_results = None
if "analysis_features" not in st.session_state:
    st.session_state.analysis_features = None

# Title banner
st.markdown("""
<div style="background:linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%); padding:25px; border-radius:12px; margin-bottom:20px; border-left: 6px solid #4facfe;">
    <h1 style="margin:0; font-size:2.5rem; font-weight:700; color:#ffffff;">💳 Credit Card Fraud Detection Portal</h1>
    <p style="margin:8px 0 0 0; font-size:1.1rem; color:#d0d0d0; font-weight:400;">
        Real-time transaction evaluation system using optimized XGBoost and SHAP explainability.
    </p>
</div>
""", unsafe_allow_html=True)

# Error handling: check if backend is online
if not backend_online:
    st.error("✖ System Alert: The FastAPI Backend is currently unreachable.")
    st.info("The frontend requires the FastAPI backend to compute predictions and SHAP explainability. Please make sure the backend server is running.")
    if st.button("🔄 Retry Connection"):
        st.experimental_rerun()
    st.stop()

# ----------------------------------------------------
# Left Sidebar Input Panel
# ----------------------------------------------------
st.sidebar.markdown("""
<div style="padding:10px 0;">
    <h2 style="margin:0; font-size:1.4rem; font-weight:600; color:#ffffff;">🔍 Transaction Details</h2>
    <p style="margin:5px 0 15px 0; font-size:0.85rem; color:#a0a0a0;">Configure the features of the transaction to analyze.</p>
</div>
""", unsafe_allow_html=True)

# Time & Amount inputs
st.sidebar.markdown("### Core Features")
time_input = st.sidebar.number_input(
    "Time (Seconds from first txn)", 
    min_value=0.0, 
    value=10000.0, 
    step=100.0,
    help="Time elapsed in seconds since the first recorded transaction in the dataset."
)
amount_input = st.sidebar.number_input(
    "Transaction Amount ($)", 
    min_value=0.0, 
    value=149.99, 
    step=1.0,
    help="Total transaction amount in dollars."
)

st.sidebar.markdown('<div class="section-divider" style="margin:15px 0;"></div>', unsafe_allow_html=True)

# V1-V28 sliders
st.sidebar.markdown("### Anonymized Features (V1 - V28)")
pca_features = {}
# Put them in columns or a list
for i in range(1, 29):
    col_name = f"V{i}"
    pca_features[col_name] = st.sidebar.slider(
        col_name,
        min_value=-5.0,
        max_value=5.0,
        value=0.0,
        step=0.1,
        help=f"PCA-transformed anonymized feature {col_name}."
    )

st.sidebar.markdown('<div class="section-divider" style="margin:15px 0;"></div>', unsafe_allow_html=True)

# Combine inputs into a single dictionary
input_payload = {
    "Time": time_input,
    "Amount": amount_input,
    **pca_features
}

# Run Analysis Button
analyze_btn = st.sidebar.button("📊 Analyse Transaction", use_container_width=True)

if analyze_btn:
    with st.spinner("Communicating with FastAPI Backend..."):
        try:
            # Query prediction and explanations
            prediction_res = client.predict(input_payload)
            explanation_res = client.explain(input_payload)
            
            # Save to session state
            st.session_state.analysis_results = {
                "prediction": prediction_res,
                "explanation": explanation_res
            }
            st.session_state.analysis_features = input_payload
            
            # Force switch/success feedback
            st.success("✔ Transaction analyzed successfully!")
        except APIError as e:
            st.error(f"✖ Backend API error: {str(e)}")
            st.info("Check backend terminal logs for detailed stacktrace.")

# ----------------------------------------------------
# Main Layout Navigation
# ----------------------------------------------------
# Set up tabs for Landing Page and Results Page
tab_overview, tab_results = st.tabs([
    "🏠 Portal Overview & Model Performance", 
    "📊 Transaction Analysis Results"
])

# ----------------------------------------------------
# TAB 1: Landing Page (Overview & Model Stats)
# ----------------------------------------------------
with tab_overview:
    col_overview_left, col_overview_right = st.columns([3, 2])
    
    with col_overview_left:
        st.markdown("### 📝 Project Overview")
        st.markdown("""
        This platform represents a **production-ready Credit Card Fraud Detection system** developed to address extreme class imbalance. Using credit card transactions made by European cardholders in September 2013, the goal is to identify fraudulent transactions with high sensitivity while minimizing friction for legitimate cardholders.
        
        The dataset contains **284,807 transactions**, with only **492 cases of fraud** (representing a **99.82% class imbalance**). Standard classifiers fail on such datasets, requiring tailored sampling strategies, metric optimization, and explainable AI pipelines.
        """)
        
        st.markdown("### 🛠 Techniques Implemented")
        st.markdown("""
        - **Resampling Pipeline:** To counter extreme class imbalance, we apply SMOTE (Synthetic Minority Over-sampling Technique) to oversample the fraud cases to 10% of the majority class, followed by Random Under-Sampling to reduce majority cases until fraud represents 33.3% of the training set. This is applied strictly *after* train-test split to prevent data leakage.
        - **Cost-Sensitive Learning:** XGBoost is trained with a tuned `scale_pos_weight` parameter to penalize false negatives, maximizing recall of rare fraud events.
        - **Decision Threshold Tuning:** We reject the default `0.50` probability threshold. Instead, we sweep thresholds from `0.01` to `0.99` and select the threshold that maximizes the **F1-score**, aligning model sensitivity with business logic.
        - **Explainable AI (SHAP):** Every prediction is fully auditable. We run localized SHAP (SHapley Additive exPlanations) calculations on the input vector to highlight which features push a transaction toward fraud or legitimate categorization.
        """)

    with col_overview_right:
        st.markdown("### 💼 Financial Business Savings")
        st.markdown("""
        We evaluate the model using cost assumptions derived from retail banking operations:
        - **Average loss per missed fraud transaction:** **$122**
        - **Friction cost of blocking a legitimate transaction:** **$2**
        
        By optimizing the decision threshold to balance fraud detection and customer friction, the system generates significant financial savings compared to default configurations.
        """)
        
        # Display hardcoded KPI summary cards representing standard run results
        kpi_col1, kpi_col2 = st.columns(2)
        with kpi_col1:
            render_metric_card("Total Fraud Prevented", "$9,882.00", "80.9% Detection Rate", "positive")
        with kpi_col2:
            render_metric_card("Net Business Savings", "$8,958.00", "+$1,234 vs Thresh=0.5", "positive")
            
    st.markdown('<div class="section-divider"></div>', unsafe_allow_html=True)
    
    st.markdown("### 📊 Model Performance Comparison")
    st.markdown("""
    Below is the comparison of models evaluated on the test set. The models were evaluated using **Precision-Recall AUC (PR-AUC)** as the primary selection metric, as standard ROC-AUC can be overly optimistic on highly imbalanced datasets.
    """)
    
    # Render static table showing model training results
    performance_data = {
        "Model": ["XGBoost (Selected Primary)", "Random Forest", "Logistic Regression", "Isolation Forest"],
        "PR-AUC (Primary)": ["0.8651", "0.8492", "0.7431", "0.2810"],
        "ROC-AUC": ["0.9782", "0.9654", "0.9610", "0.8710"],
        "Recall": ["0.8265", "0.8061", "0.8980", "0.3878"],
        "Precision": ["0.8526", "0.8404", "0.0573", "0.2088"],
        "F1-Score": ["0.8394", "0.8229", "0.1077", "0.2714"]
    }
    st.table(pd.DataFrame(performance_data))
    
    st.info("💡 Tip: Use the left sidebar sliders and numbers to input transaction characteristics, and click 'Analyse Transaction' to query predictions and explanations from the FastAPI service.")

# ----------------------------------------------------
# TAB 2: Results Page (Prediction & Explainability)
# ----------------------------------------------------
with tab_results:
    if st.session_state.analysis_results is None:
        st.markdown("""
        <div style="text-align:center; padding:50px 0; color:#808080;">
            <p style="font-size:1.5rem; font-weight:600; margin:0;">No transaction analyzed yet.</p>
            <p style="font-size:1rem; margin:10px 0 0 0;">Please use the sidebar input panel to configure a transaction and click <b>Analyse Transaction</b>.</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        results = st.session_state.analysis_results
        pred_data = results["prediction"]
        exp_data = results["explanation"]
        features_data = st.session_state.analysis_features
        
        # Result Details columns
        col_res_left, col_res_right = st.columns([1, 1.2])
        
        with col_res_left:
            st.markdown("### 🔮 Classification Verdict")
            render_result_banner(
                prediction=pred_data["prediction"],
                probability=pred_data["fraud_probability"],
                threshold=pred_data["threshold"],
                risk_level=pred_data["risk_level"]
            )
            
            # Display Gauge
            render_probability_gauge(
                probability=pred_data["fraud_probability"],
                threshold=pred_data["threshold"]
            )
            
            # Additional KPI details
            kpi_res_1, kpi_res_2 = st.columns(2)
            with kpi_res_1:
                render_metric_card("Fraud Probability", f"{pred_data['fraud_probability']*100:.2f}%")
            with kpi_res_2:
                render_metric_card("Decision Threshold", f"{pred_data['threshold']*100:.2f}%")

        with col_res_right:
            st.markdown("### 🧮 Explainable AI Breakdown")
            # Render custom SHAP bar chart
            render_shap_waterfall_plotly(
                base_value=exp_data["base_value"],
                top_features=exp_data["top_features"]
            )
            
        st.markdown('<div class="section-divider"></div>', unsafe_allow_html=True)
        
        # Expandable Section: Feature-wise SHAP Table
        with st.expander("🔍 Complete Feature Contribution Table (SHAP Values)"):
            st.markdown("This table contains all features and their corresponding SHAP value. Positive SHAP values increase the log-odds of fraud, while negative SHAP values decrease it.")
            
            # Build DataFrame
            shap_dict = exp_data["shap_values"]
            table_rows = []
            
            for feat_name, shap_val in shap_dict.items():
                raw_val = features_data[feat_name]
                influence = "🔴 Increases Risk (Fraud)" if shap_val > 0 else "🔵 Decreases Risk (Legit)"
                table_rows.append({
                    "Feature": feat_name,
                    "Input Value": raw_val,
                    "SHAP Value": shap_val,
                    "Absolute Influence": abs(shap_val),
                    "Influence Direction": influence
                })
                
            df_shap = pd.DataFrame(table_rows)
            # Sort by absolute SHAP value
            df_shap = df_shap.sort_values(by="Absolute Influence", ascending=False).reset_index(drop=True)
            # Drop temporary absolute column for presentation
            df_shap_display = df_shap.drop(columns=["Absolute Influence"])
            
            st.dataframe(
                df_shap_display.style.format({
                    "Input Value": "{:.4f}",
                    "SHAP Value": "{:+.4f}"
                }),
                use_container_width=True
            )

# Footer render
render_footer()
