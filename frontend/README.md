# FraudGuard - Credit Card Fraud Detection Frontend

A professional, corporate-style React frontend for a credit card fraud detection system. 
Built as a portfolio project for a TCS campus drive.

## Features
- **Live Risk Assessment:** Real-time animated gauge showing fraud probability.
- **SHAP Feature Importance:** Recharts visualization of feature contributions.
- **Full Analysis Dashboard:** Form inputs for 30 features (Amount, Time, V1-V28).
- **Model Performance:** Detailed stats pages with ROC and PR curves.
- **Offline Support:** Full mock data fallback when the Python backend is unavailable.

## Tech Stack
- React 18, Vite
- React Router v6
- Recharts
- Lucide React
- Axios
- Vanilla CSS with CSS Variables

## Getting Started

### 1. Clone and Install
```bash
git clone <your-repo>
cd fraud-detection-frontend
npm install
```

### 2. Run locally (Development)
```bash
npm run dev
```
> Opens at http://localhost:5173

### 3. Connect to Python Backend (Optional)
If you have the FastAPI backend running:
Create a `.env` file in the root directory:
```
VITE_API_URL=http://localhost:8000
```
*Note: If the backend is not connected, the app will automatically fall back to realistic mock data.*

### 4. Build for Production
```bash
npm run build
```
