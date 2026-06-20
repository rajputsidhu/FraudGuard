import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ModelStats = () => {
  // Mock data for charts
  const rocData = [
    { fpr: 0, tpr: 0 },
    { fpr: 0.02, tpr: 0.85 },
    { fpr: 0.05, tpr: 0.92 },
    { fpr: 0.1, tpr: 0.95 },
    { fpr: 0.2, tpr: 0.97 },
    { fpr: 0.5, tpr: 0.99 },
    { fpr: 1, tpr: 1 },
  ];

  const prData = [
    { recall: 0, precision: 1 },
    { recall: 0.2, precision: 0.98 },
    { recall: 0.5, precision: 0.95 },
    { recall: 0.8, precision: 0.90 },
    { recall: 0.9, precision: 0.85 },
    { recall: 0.95, precision: 0.70 },
    { recall: 1, precision: 0.1 },
  ];

  return (
    <div className="layout">
      <main className="main-content no-sidebar">
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={styles.header}>
            <h1 style={styles.title}>Model Performance</h1>
            <p style={styles.subtitle}>Comprehensive evaluation metrics for the XGBoost fraud detection model</p>
          </div>

          {/* Section 1: Comparison Table */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={styles.cardTitle}>Model Comparison</h3>
            <div className="table-responsive">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Model</th>
                    <th style={styles.th}>Precision</th>
                    <th style={styles.th}>Recall</th>
                    <th style={styles.th}>F1-Score</th>
                    <th style={styles.th}>ROC-AUC</th>
                    <th style={styles.th}>PR-AUC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.trHighlighted}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>XGBoost (Selected)</td>
                    <td style={styles.td}>0.889</td>
                    <td style={styles.td}>0.941</td>
                    <td style={styles.td}>0.914</td>
                    <td style={styles.td}>0.981</td>
                    <td style={styles.td}>0.847</td>
                  </tr>
                  <tr style={styles.tr}>
                    <td style={styles.td}>Random Forest</td>
                    <td style={styles.td}>0.912</td>
                    <td style={styles.td}>0.835</td>
                    <td style={styles.td}>0.872</td>
                    <td style={styles.td}>0.965</td>
                    <td style={styles.td}>0.812</td>
                  </tr>
                  <tr style={styles.tr}>
                    <td style={styles.td}>Logistic Regression</td>
                    <td style={styles.td}>0.754</td>
                    <td style={styles.td}>0.621</td>
                    <td style={styles.td}>0.681</td>
                    <td style={styles.td}>0.890</td>
                    <td style={styles.td}>0.650</td>
                  </tr>
                  <tr style={styles.tr}>
                    <td style={styles.td}>Isolation Forest</td>
                    <td style={styles.td}>0.450</td>
                    <td style={styles.td}>0.580</td>
                    <td style={styles.td}>0.507</td>
                    <td style={styles.td}>0.820</td>
                    <td style={styles.td}>0.410</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Charts */}
          <div className="row">
            <div className="col-60">
              <div className="card" style={{ height: '100%' }}>
                <h3 style={styles.cardTitle}>ROC Curve</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rocData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="fpr" type="number" domain={[0, 1]} tick={{fontSize: 12}} />
                      <YAxis domain={[0, 1]} tick={{fontSize: 12}} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="tpr" name="XGBoost TPR" stroke="var(--primary)" strokeWidth={3} dot={false} />
                      <Line type="linear" dataKey="fpr" name="Random Guess" stroke="var(--text-secondary)" strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="col-40">
              <div className="card" style={{ height: '100%' }}>
                <h3 style={styles.cardTitle}>Precision-Recall Curve</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={{fontSize: 12}} />
                      <YAxis domain={[0, 1]} tick={{fontSize: 12}} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                      <Legend />
                      <Line type="stepAfter" dataKey="precision" name="XGBoost PR" stroke="#8B5CF6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Why XGBoost & Confusion Matrix */}
          <div className="row">
            <div className="col-60">
              <div className="card" style={{ height: '100%' }}>
                <h3 style={styles.cardTitle}>Why XGBoost?</h3>
                <ul style={styles.list}>
                  <li style={styles.listItem}>
                    <strong>Handling Imbalanced Data:</strong> XGBoost has built-in parameters (`scale_pos_weight`) to handle extreme class imbalance natively, outperforming standard models.
                  </li>
                  <li style={styles.listItem}>
                    <strong>Non-linear Relationships:</strong> Fraud patterns are highly complex and non-linear. Tree-based ensemble methods capture these interactions effectively.
                  </li>
                  <li style={styles.listItem}>
                    <strong>High Recall Priority:</strong> We optimized the model threshold to prioritize Recall (94%) over Precision, as missing a fraudulent transaction is more costly than a false alarm.
                  </li>
                  <li style={styles.listItem}>
                    <strong>Explainability:</strong> Tree models integrate perfectly with SHAP values, allowing us to explain to end-users exactly why a transaction was flagged.
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-40">
              <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <h3 style={styles.cardTitle}>Confusion Matrix (Test Set)</h3>
                
                <div className="cm-container">
                  <div className="cm-label-top">Predicted</div>
                  <div className="cm-label-left">Actual</div>
                  
                  <div className="cm-grid">
                    <div className="cm-box" style={{ backgroundColor: 'var(--success-light)' }}>
                      <div className="cm-value">56,864</div>
                      <div className="cm-name">True Negative</div>
                    </div>
                    <div className="cm-box" style={{ backgroundColor: 'var(--warning-light)' }}>
                      <div className="cm-value">12</div>
                      <div className="cm-name">False Positive</div>
                    </div>
                    <div className="cm-box" style={{ backgroundColor: 'var(--danger-light)' }}>
                      <div className="cm-value">6</div>
                      <div className="cm-name">False Negative</div>
                    </div>
                    <div className="cm-box" style={{ backgroundColor: 'var(--success-light)', border: '2px solid var(--success)' }}>
                      <div className="cm-value">80</div>
                      <div className="cm-name">True Positive</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

const styles = {
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
  },
  cardTitle: {
    fontSize: '18px',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 16px',
    borderBottom: '2px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
  },
  trHighlighted: {
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--primary-light)',
    borderLeft: '4px solid var(--primary)',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
  },
  list: {
    listStylePosition: 'inside',
    paddingLeft: '8px',
  },
  listItem: {
    marginBottom: '16px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'var(--text-secondary)',
  }
};

export default ModelStats;
