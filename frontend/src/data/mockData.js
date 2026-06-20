export const mockPrediction = {
  probability: 0.847,
  is_fraud: true,
  threshold: 0.42,
  shap_values: {
    V1: -0.3, V2: 0.8, V3: -0.1, V4: 1.2, V5: -0.5,
    V6: 0.2, V7: -0.9, V8: 0.4, V9: -0.2, V10: 1.5,
    V11: 0.7, V12: -1.1, V13: 0.1, V14: 1.8, V17: 2.1
  }
};

export const mockLegitPrediction = {
  probability: 0.124,
  is_fraud: false,
  threshold: 0.42,
  shap_values: {
    V1: 0.5, V2: -0.2, V3: 0.8, V4: -0.4, V5: 0.3,
    V6: -0.1, V7: 0.6, V8: -0.3, V9: 0.4, V10: -0.7,
    V11: -0.5, V12: 0.9, V13: -0.2, V14: -1.2, V17: -1.5
  }
};

export const mockModelStats = {
  roc_auc: 0.981,
  pr_auc: 0.847,
  recall: 0.941,
  precision: 0.889,
  f1: 0.914
};

export const mockFeatureNames = [
  "Time", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10",
  "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20",
  "V21", "V22", "V23", "V24", "V25", "V26", "V27", "V28", "Amount"
];

export const mockTransactionHistory = [
  {
    id: "TXN-005",
    time: "2024-05-18T10:30:00Z",
    amount: 150.00,
    probability: 0.05,
    is_fraud: false
  },
  {
    id: "TXN-004",
    time: "2024-05-18T09:15:22Z",
    amount: 1250.50,
    probability: 0.89,
    is_fraud: true
  },
  {
    id: "TXN-003",
    time: "2024-05-17T14:20:10Z",
    amount: 25.99,
    probability: 0.02,
    is_fraud: false
  },
  {
    id: "TXN-002",
    time: "2024-05-17T11:05:45Z",
    amount: 890.00,
    probability: 0.15,
    is_fraud: false
  },
  {
    id: "TXN-001",
    time: "2024-05-16T16:40:00Z",
    amount: 4500.00,
    probability: 0.92,
    is_fraud: true
  }
];
