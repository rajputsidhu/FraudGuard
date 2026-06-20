import { History, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';

const TransactionTable = ({ history, clearHistory }) => {
  if (!history || history.length === 0) {
    return (
      <div className="card" style={styles.emptyContainer}>
        <History size={48} color="var(--border)" style={{ marginBottom: '16px' }} />
        <h3 style={styles.emptyTitle}>No transactions analysed yet</h3>
        <p style={styles.emptyText}>Fill the form and click analyse to see history</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={styles.header}>
        <h3 style={styles.title}>Recent Transactions</h3>
        <button className="btn-secondary" style={styles.clearBtn} onClick={clearHistory}>
          <Trash2 size={16} /> Clear History
        </button>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Time Analysed</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Risk Score</th>
              <th style={styles.th}>Decision</th>
            </tr>
          </thead>
          <tbody>
            {history.map((txn, index) => (
              <tr key={txn.id} style={styles.tr} className={index === 0 ? "fade-in" : ""}>
                <td style={styles.td}>{txn.id}</td>
                <td style={{...styles.td, color: 'var(--text-secondary)'}}>
                  {new Date(txn.time).toLocaleString()}
                </td>
                <td style={styles.td}>${parseFloat(txn.amount).toFixed(2)}</td>
                <td style={styles.td}>
                  <div style={styles.progressWrapper}>
                    <div 
                      style={{
                        ...styles.progressBar,
                        width: `${txn.probability * 100}%`,
                        backgroundColor: txn.is_fraud ? 'var(--danger)' : 'var(--success)'
                      }}
                    ></div>
                  </div>
                  <span style={styles.progressText}>{(txn.probability * 100).toFixed(1)}%</span>
                </td>
                <td style={styles.td}>
                  {txn.is_fraud ? (
                    <span className="badge badge-danger">Fraud</span>
                  ) : (
                    <span className="badge badge-success">Legitimate</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

TransactionTable.propTypes = {
  history: PropTypes.array.isRequired,
  clearHistory: PropTypes.func.isRequired
};

const styles = {
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '18px',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
  },
  clearBtn: {
    width: 'auto',
    fontSize: '13px',
    padding: '6px 12px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    verticalAlign: 'middle',
  },
  progressWrapper: {
    width: '100px',
    height: '6px',
    backgroundColor: 'var(--border)',
    borderRadius: '3px',
    overflow: 'hidden',
    display: 'inline-block',
    verticalAlign: 'middle',
    marginRight: '8px',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease-in-out',
  },
  progressText: {
    fontSize: '13px',
    fontWeight: 500,
  }
};

export default TransactionTable;
