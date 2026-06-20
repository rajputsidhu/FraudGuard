import { useState, useCallback } from 'react';
import { predictFraud } from '../api/fraudApi';

const generateDefaultTransaction = () => {
  const data = { Time: 0, Amount: 0 };
  for (let i = 1; i <= 28; i++) {
    data[`V${i}`] = 0;
  }
  return data;
};

export const useFraudDetection = () => {
  const [transactionData, setTransactionData] = useState(generateDefaultTransaction());
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Calculate live risk purely for UI responsiveness without API calls
  const [liveRisk, setLiveRisk] = useState(0);

  const updateField = useCallback((field, value) => {
    const numValue = parseFloat(value) || 0;
    setTransactionData(prev => {
      const newData = { ...prev, [field]: numValue };
      
      // Simple heuristic to update live risk meter
      let riskFactor = 0;
      if (newData.Amount > 500) riskFactor += 0.2;
      if (newData.Amount > 2000) riskFactor += 0.3;
      if (newData.V1 < -2 || newData.V1 > 2) riskFactor += 0.15;
      if (newData.V2 < -2 || newData.V2 > 2) riskFactor += 0.15;
      if (newData.V3 < -2 || newData.V3 > 2) riskFactor += 0.15;
      if (newData.V4 < -2 || newData.V4 > 2) riskFactor += 0.15;
      
      const newRisk = Math.min(0.99, Math.max(0.01, riskFactor + (Math.random() * 0.05)));
      setLiveRisk(newRisk);
      
      return newData;
    });
    setPrediction(null); // Clear previous prediction when input changes
  }, []);

  const analyseTransaction = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error: apiError } = await predictFraud(transactionData);
    
    if (apiError) {
      setError('Failed to analyse transaction');
    } else if (data) {
      setPrediction(data);
      setLiveRisk(data.probability);
      
      // Add to history
      const newTxn = {
        id: `TXN-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        time: new Date().toISOString(),
        amount: transactionData.Amount,
        probability: data.probability,
        is_fraud: data.is_fraud
      };
      
      setHistory(prev => [newTxn, ...prev].slice(0, 10)); // Keep last 10
    }
    
    setIsLoading(false);
  }, [transactionData]);

  const resetForm = useCallback(() => {
    setTransactionData(generateDefaultTransaction());
    setPrediction(null);
    setLiveRisk(0);
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    transactionData,
    updateField,
    prediction,
    liveRisk,
    isLoading,
    error,
    history,
    analyseTransaction,
    resetForm,
    clearHistory
  };
};
