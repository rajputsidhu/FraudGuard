import { useEffect, useState } from 'react';
import { Activity, Target, CheckCircle, Crosshair, BarChart2 } from 'lucide-react';
import { getModelStats } from '../api/fraudApi';

const MetricsPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await getModelStats();
      if (data) setStats(data);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const metricsConfig = [
    { key: 'roc_auc', label: 'ROC-AUC', icon: Activity, color: 'var(--primary)', bgColor: 'var(--primary-light)' },
    { key: 'pr_auc', label: 'PR-AUC', icon: Target, color: '#8B5CF6', bgColor: '#EDE9FE' }, // Purple
    { key: 'recall', label: 'Recall', icon: CheckCircle, color: 'var(--success)', bgColor: 'var(--success-light)' },
    { key: 'precision', label: 'Precision', icon: Crosshair, color: 'var(--warning)', bgColor: 'var(--warning-light)' },
    { key: 'f1', label: 'F1-Score', icon: BarChart2, color: 'var(--primary)', bgColor: 'var(--primary-light)' },
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="card" style={styles.skeletonCard}>
            <div style={styles.skeletonIcon}></div>
            <div style={styles.skeletonText}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {metricsConfig.map((metric) => {
        const Icon = metric.icon;
        let displayValue = stats?.[metric.key] || 0;
        
        // Format as percentage if it's recall or precision, else decimal
        if (metric.key === 'recall' || metric.key === 'precision') {
          displayValue = `${(displayValue * 100).toFixed(1)}%`;
        } else {
          displayValue = displayValue.toFixed(3);
        }

        return (
          <div key={metric.key} className="card" style={styles.metricCard}>
            <div style={{ ...styles.iconWrapper, backgroundColor: metric.bgColor, color: metric.color }}>
              <Icon size={20} />
            </div>
            <div style={styles.content}>
              <div style={styles.value}>{displayValue}</div>
              <div style={styles.label}>{metric.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: '1 1 18%',
    minWidth: '150px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
  },
  value: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  label: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  skeletonCard: {
    flex: '1 1 18%',
    minWidth: '150px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  skeletonIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: 'var(--border)',
    animation: 'pulse 1.5s infinite',
  },
  skeletonText: {
    width: '60px',
    height: '24px',
    backgroundColor: 'var(--border)',
    borderRadius: '4px',
    animation: 'pulse 1.5s infinite',
  }
};

export default MetricsPanel;
