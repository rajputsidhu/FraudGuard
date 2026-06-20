import streamlit as st
import plotly.graph_objects as go
from typing import Dict, Any, List

def inject_custom_css(css_file: str) -> None:
    """Loads and injects custom CSS file into Streamlit's HTML."""
    try:
        with open(css_file, "r") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except Exception as e:
        st.warning(f"Could not load custom CSS: {e}")

def render_metric_card(title: str, value: str, delta: str = "", delta_type: str = "positive") -> None:
    """
    Renders a custom glassmorphic KPI card.
    
    delta_type can be 'positive' (green) or 'negative' (red).
    """
    delta_class = "delta-positive" if delta_type == "positive" else "delta-negative"
    delta_symbol = "▲" if delta_type == "positive" else "▼"
    
    delta_html = f'<div class="metric-delta {delta_class}">{delta_symbol} {delta}</div>' if delta else ''
    
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-title">{title}</div>
        <div class="metric-value">{value}</div>
        {delta_html}
    </div>
    """, unsafe_allow_html=True)

def render_result_banner(prediction: str, probability: float, threshold: float, risk_level: str) -> None:
    """Renders a warning banner depending on the classification result."""
    prob_pct = probability * 100
    thresh_pct = threshold * 100
    
    if prediction == "FRAUD":
        st.markdown(f"""
        <div class="result-banner-fraud">
            <h2 style="margin:0; font-size:2.2rem; font-weight:700;">⚠ FRAUD DETECTED</h2>
            <p style="margin:5px 0 0 0; font-size:1.1rem; font-weight:500;">
                Transaction flagged with <b>{prob_pct:.1f}%</b> probability (Decision Threshold: {thresh_pct:.1f}%)
            </p>
            <div style="margin-top:10px; display:inline-block; background:rgba(0,0,0,0.3); padding:4px 12px; border-radius:20px; font-size:0.9rem; font-weight:600;">
                RISK LEVEL: {risk_level}
            </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="result-banner-legit">
            <h2 style="margin:0; font-size:2.2rem; font-weight:700;">✔ LEGITIMATE</h2>
            <p style="margin:5px 0 0 0; font-size:1.1rem; font-weight:500;">
                Transaction validated with <b>{prob_pct:.1f}%</b> fraud probability (Decision Threshold: {thresh_pct:.1f}%)
            </p>
            <div style="margin-top:10px; display:inline-block; background:rgba(255,255,255,0.2); padding:4px 12px; border-radius:20px; font-size:0.9rem; font-weight:600;">
                RISK LEVEL: {risk_level}
            </div>
        </div>
        """, unsafe_allow_html=True)

def render_probability_gauge(probability: float, threshold: float) -> None:
    """Generates and displays an interactive Plotly gauge chart for fraud likelihood."""
    fig = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = probability,
        domain = {'x': [0, 1], 'y': [0, 1]},
        title = {'text': "Fraud Likelihood Index", 'font': {'size': 18, 'weight': 'bold', 'color': 'white'}},
        gauge = {
            'axis': {'range': [0, 1], 'tickwidth': 1, 'tickcolor': "white"},
            'bar': {'color': "#ffffff", 'thickness': 0.25},
            'bgcolor': "rgba(0, 0, 0, 0.2)",
            'borderwidth': 1,
            'bordercolor': "rgba(255, 255, 255, 0.2)",
            'steps': [
                {'range': [0, threshold], 'color': "rgba(46, 125, 50, 0.6)"},       # Green (Legitimate range)
                {'range': [threshold, 0.8], 'color': "rgba(239, 108, 0, 0.6)"},     # Orange (Medium/High range)
                {'range': [0.8, 1.0], 'color': "rgba(198, 40, 40, 0.6)"}            # Red (Critical range)
            ],
            'threshold': {
                'line': {'color': "red", 'width': 3},
                'thickness': 0.75,
                'value': threshold
            }
        }
    ))
    
    # Transparent background layout
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font={'color': "white", 'family': "Outfit"},
        margin=dict(l=20, r=20, t=50, b=20),
        height=260
    )
    
    st.plotly_chart(fig, use_container_width=True)

def render_shap_waterfall_plotly(base_value: float, top_features: List[Dict[str, Any]]) -> None:
    """
    Renders an interactive horizontal bar chart of the SHAP values using Plotly.
    Positive values push toward FRAUD (red), negative values push toward LEGITIMATE (blue).
    """
    # Sort from smallest absolute contribution to largest for horizontal alignment
    features_sorted = sorted(top_features, key=lambda x: abs(x['shap_value']), reverse=False)
    
    y_labels = [item['feature'] for item in features_sorted]
    x_values = [item['shap_value'] for item in features_sorted]
    
    # Assign colors based on contribution direction
    colors = ['#d32f2f' if val > 0 else '#1f77b4' for val in x_values]
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        y=y_labels,
        x=x_values,
        orientation='h',
        marker_color=colors,
        text=[f"+{val:.3f}" if val > 0 else f"{val:.3f}" for val in x_values],
        textposition='outside',
        hovertemplate="Feature: %{y}<br>SHAP Contribution: %{x:.4f}<extra></extra>"
    ))
    
    # Customize layout
    fig.update_layout(
        title={
            'text': "Top Feature Contributions (SHAP Values)",
            'y': 0.95,
            'x': 0.5,
            'xanchor': 'center',
            'yanchor': 'top',
            'font': {'size': 16, 'color': 'white', 'weight': 'bold'}
        },
        xaxis_title="SHAP Value (Impact on Prediction Log-Odds)",
        yaxis_title="Features",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font={'color': "white", 'family': "Outfit"},
        margin=dict(l=40, r=40, t=50, b=40),
        height=380,
        xaxis=dict(showgrid=True, gridcolor='rgba(255, 255, 255, 0.1)', zero_line=True, zero_line_color='white')
    )
    
    st.plotly_chart(fig, use_container_width=True)

def render_footer() -> None:
    """Renders the standard project footer with developer metadata."""
    st.markdown('<div class="section-divider"></div>', unsafe_allow_html=True)
    st.markdown("""
    <div style="text-align: center; padding: 15px 0; color: #a0a0a0; font-size: 0.85rem; font-weight: 400;">
        <p style="margin: 0;"><b>TCS Data Science Campus Placement Project</b> | Developed by Rajput Sidhu</p>
        <p style="margin: 5px 0 0 0;">
            <a href="https://github.com/rajputsidhu" target="_blank" style="color: #4facfe; text-decoration: none; font-weight: 500;">
                GitHub Repository
            </a>
            &nbsp;•&nbsp;
            <b>Tech Stack:</b> Python 3.11, XGBoost, SHAP, FastAPI, Streamlit, Docker
        </p>
    </div>
    """, unsafe_allow_html=True)
