import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Activity } from 'lucide-react';
import PropTypes from 'prop-types';

const FeatureChart = ({ shapValues }) => {
  const chartData = useMemo(() => {
    if (!shapValues) return [];

    // Convert object to array, sort by absolute value, take top 15
    return Object.entries(shapValues)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 15);
  }, [shapValues]);

  if (!shapValues || chartData.length === 0) {
    return (
      <div className="card" style={{ ...styles.container, ...styles.emptyState }}>
        <Activity size={48} color="var(--border)" style={{ marginBottom: '16px' }} />
        <h3 style={styles.emptyTitle}>No Analysis Data</h3>
        <p style={styles.emptyText}>Run an analysis to see feature contributions</p>
      </div>
    );
  }

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isFraudPush = data.value > 0;
      return (
        <div style={styles.tooltip}>
          <p style={styles.tooltipTitle}>{data.name}</p>
          <p style={{ ...styles.tooltipValue, color: isFraudPush ? 'var(--danger)' : 'var(--primary)' }}>
            {isFraudPush ? 'Pushes toward Fraud: ' : 'Pushes toward Legit: '}
            {data.value.toFixed(4)}
          </p>
        </div>
      );
    }
    return null;
  };
  
  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array
  };

  return (
    <div className="card fade-in" style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Feature Contributions to This Prediction</h3>
        <p style={styles.subtitle}>Powered by SHAP (SHapley Additive Explanations)</p>
      </div>

      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
            <ReferenceLine x={0} stroke="var(--border)" strokeWidth={2} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.value > 0 ? 'var(--danger)' : 'var(--primary)'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: 'var(--primary)' }}></div>
          <span>Legitimate</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: 'var(--danger)' }}></div>
          <span>Fraud</span>
        </div>
      </div>
    </div>
  );
};

FeatureChart.propTypes = {
  shapValues: PropTypes.object
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: '24px',
  },
  title: {
    fontSize: '16px',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  chartWrapper: {
    flexGrow: 1,
    minHeight: '300px',
  },
  tooltip: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  tooltipTitle: {
    fontWeight: 600,
    marginBottom: '4px',
    fontSize: '14px',
  },
  tooltipValue: {
    fontSize: '13px',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '16px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  }
};

export default FeatureChart;
