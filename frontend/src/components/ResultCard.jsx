import { ShieldX, ShieldCheck } from 'lucide-react';
import PropTypes from 'prop-types';

const ResultCard = ({ prediction }) => {
  if (!prediction) return null;

  const isFraud = prediction.is_fraud;
  const mainColor = isFraud ? 'var(--danger)' : 'var(--success)';
  const lightColor = isFraud ? 'var(--danger-light)' : 'var(--success-light)';
  const Icon = isFraud ? ShieldX : ShieldCheck;
  const title = isFraud ? 'FRAUD DETECTED' : 'LEGITIMATE TRANSACTION';
  const confidence = (prediction.probability * 100).toFixed(2);

  return (
    <div className="card fade-in" style={{ ...styles.card, borderLeft: `4px solid ${mainColor}` }}>
      
      <div style={styles.topSection}>
        <div style={{ ...styles.iconWrapper, backgroundColor: lightColor, color: mainColor }}>
          <Icon size={32} />
        </div>
        <div>
          <h2 style={{ ...styles.title, color: mainColor }}>{title}</h2>
          <p style={styles.subtitle}>Confidence: {confidence}%</p>
        </div>
      </div>

      <div style={styles.middleSection}>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Probability</div>
          <div style={styles.statValue}>{prediction.probability.toFixed(3)}</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Threshold Used</div>
          <div style={styles.statValue}>{prediction.threshold || 0.42}</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Risk Level</div>
          <div style={{ ...styles.statValue, color: mainColor }}>
            {isFraud ? 'HIGH' : 'LOW'}
          </div>
        </div>
      </div>

      <div style={styles.bottomSection}>
        <p style={styles.explanation}>
          <strong style={{ color: 'var(--text-primary)' }}>What this means: </strong>
          {isFraud 
            ? "The model flagged this transaction as highly suspicious and anomalous compared to normal behavior."
            : "The transaction matches normal patterns and shows no significant signs of fraudulent activity."}
        </p>
        <div style={styles.timestamp}>
          Analysed at {new Date().toLocaleTimeString()}
        </div>
      </div>
      
    </div>
  );
};

ResultCard.propTypes = {
  prediction: PropTypes.object
};

const styles = {
  card: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  topSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  middleSection: {
    display: 'flex',
    gap: '16px',
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    padding: '16px 0',
  },
  statBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid var(--border)',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  bottomSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  explanation: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  timestamp: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textAlign: 'right',
  }
};

export default ResultCard;
