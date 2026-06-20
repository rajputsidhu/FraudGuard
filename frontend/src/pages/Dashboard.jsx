import { useFraudDetection } from '../hooks/useFraudDetection';
import Sidebar from '../components/Sidebar';
import RiskMeter from '../components/RiskMeter';
import ResultCard from '../components/ResultCard';
import MetricsPanel from '../components/MetricsPanel';
import FeatureChart from '../components/FeatureChart';
import TransactionTable from '../components/TransactionTable';

const Dashboard = () => {
  const {
    transactionData,
    updateField,
    prediction,
    liveRisk,
    isLoading,
    history,
    analyseTransaction,
    resetForm,
    clearHistory
  } = useFraudDetection();

  return (
    <div className="layout">
      <Sidebar 
        transactionData={transactionData}
        updateField={updateField}
        analyseTransaction={analyseTransaction}
        resetForm={resetForm}
        isLoading={isLoading}
      />
      
      <main className="main-content">
        <div className="page-container">
          <MetricsPanel />
          
          <div className="row">
            <div className="col-60">
              <RiskMeter probability={liveRisk} />
              <ResultCard prediction={prediction} />
            </div>
            
            <div className="col-40">
              <FeatureChart shapValues={prediction?.shap_values} />
            </div>
          </div>

          <TransactionTable history={history} clearHistory={clearHistory} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
