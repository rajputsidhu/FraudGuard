import { useMemo } from 'react';
import PropTypes from 'prop-types';

const RiskMeter = ({ probability }) => {
  // Convert probability (0-1) to an angle for the SVG arc
  // Gauge spans 180 degrees (-90 to 90)
  const angle = useMemo(() => {
    const validProb = Math.min(1, Math.max(0, probability || 0));
    return -90 + (validProb * 180);
  }, [probability]);

  const percentValue = useMemo(() => {
    return ((probability || 0) * 100).toFixed(1);
  }, [probability]);

  // Determine colors based on risk
  let riskColor = 'var(--success)';
  let riskLabel = 'LOW';
  if (probability > 0.7) {
    riskColor = 'var(--danger)';
    riskLabel = 'HIGH';
  } else if (probability > 0.3) {
    riskColor = 'var(--warning)';
    riskLabel = 'MEDIUM';
  }

  return (
    <div className="card" style={styles.container}>
      <h3 style={styles.title}>Live Risk Assessment</h3>
      
      <div style={styles.gaugeContainer}>
        <svg width="240" height="130" viewBox="0 0 240 130" style={styles.svg}>
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--success)" />
              <stop offset="50%" stopColor="var(--warning)" />
              <stop offset="100%" stopColor="var(--danger)" />
            </linearGradient>
          </defs>

          {/* Background Arc */}
          <path 
            d="M 20 120 A 100 100 0 0 1 220 120" 
            fill="none" 
            stroke="var(--border)" 
            strokeWidth="12" 
            strokeLinecap="round" 
          />
          
          {/* Colored Arc */}
          <path 
            d="M 20 120 A 100 100 0 0 1 220 120" 
            fill="none" 
            stroke="url(#gaugeGradient)" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeDasharray="314"
            strokeDashoffset="0"
          />

          {/* Outer Dynamic Ring (optional visual enhancement) */}
           <path 
            d="M 12 120 A 108 108 0 0 1 228 120" 
            fill="none" 
            stroke={riskColor} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeDasharray="2 6"
          />

          {/* Animated Needle */}
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '120px 120px', transition: 'transform 0.6s ease-in-out' }}>
            <polygon points="115,120 125,120 120,30" fill="var(--text-primary)" />
            <circle cx="120" cy="120" r="8" fill="var(--text-primary)" />
          </g>
        </svg>

        <div style={styles.centerText}>
          <div style={{ ...styles.percentage, color: riskColor }}>
            {percentValue}%
          </div>
          <div style={styles.label}>Fraud Risk</div>
        </div>
      </div>

      <div style={styles.labels}>
        <span style={styles.labelLow}>LOW</span>
        <span style={styles.labelHigh}>HIGH</span>
      </div>
    </div>
  );
};

RiskMeter.propTypes = {
  probability: PropTypes.number.isRequired
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
  },
  title: {
    fontSize: '16px',
    color: 'var(--text-primary)',
    marginBottom: '24px',
    alignSelf: 'flex-start',
  },
  gaugeContainer: {
    position: 'relative',
    width: '240px',
    height: '130px',
  },
  svg: {
    overflow: 'visible',
  },
  centerText: {
    position: 'absolute',
    bottom: '-10px',
    left: '0',
    right: '0',
    textAlign: 'center',
  },
  percentage: {
    fontSize: '28px',
    fontWeight: 600,
    lineHeight: '1',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '240px',
    marginTop: '24px',
    fontSize: '12px',
    fontWeight: 500,
  },
  labelLow: {
    color: 'var(--success)',
  },
  labelHigh: {
    color: 'var(--danger)',
  }
};

export default RiskMeter;
