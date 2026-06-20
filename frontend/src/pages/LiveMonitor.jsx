import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  Database,
  Cpu,
  Search,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { predictFraud } from '../api/fraudApi';

const LiveMonitor = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(3000); // ms between ticks
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  
  // Real-time counter states
  const [stats, setStats] = useState({
    scanned: 0,
    flagged: 0,
    legit: 0,
    avgLatency: 4.8 // ms
  });

  const intervalRef = useRef(null);

  // Helper to generate a random transaction
  const generateRandomTx = () => {
    const isFraudulentPattern = Math.random() < 0.12; // 12% anomaly rate
    const time = Math.floor(Date.now() / 1000) % 172800;
    const amount = isFraudulentPattern 
      ? parseFloat((450 + Math.random() * 2500).toFixed(2))
      : parseFloat((5 + Math.random() * 180).toFixed(2));
      
    const v = {};
    for (let i = 1; i <= 28; i++) {
      v[`V${i}`] = isFraudulentPattern 
        ? parseFloat((Math.random() * 8 - 4).toFixed(4))
        : parseFloat((Math.random() * 1.5 - 0.75).toFixed(4));
    }
    
    return {
      Time: time,
      Amount: amount,
      ...v
    };
  };

  // Run transaction prediction
  const processNextTransaction = async () => {
    const rawTx = generateRandomTx();
    const startTime = performance.now();
    
    const { data, error } = await predictFraud(rawTx);
    const endTime = performance.now();
    const latency = parseFloat((endTime - startTime).toFixed(1));

    if (!error && data) {
      const isFraud = data.is_fraud || data.prediction === "FRAUD";
      const txRecord = {
        id: Math.floor(Math.random() * 9000000) + 1000000,
        timestamp: new Date().toLocaleTimeString(),
        data: rawTx,
        prediction: data.prediction,
        probability: data.fraud_probability || data.probability,
        is_fraud: isFraud,
        risk_level: data.risk_level,
        latency: latency,
        shap_values: data.shap_values
      };

      setTransactions(prev => [txRecord, ...prev].slice(0, 50)); // Keep last 50
      
      setStats(prev => {
        const nextScanned = prev.scanned + 1;
        const nextFlagged = isFraud ? prev.flagged + 1 : prev.flagged;
        const nextLegit = !isFraud ? prev.legit + 1 : prev.legit;
        const nextAvgLatency = parseFloat(((prev.avgLatency * prev.scanned + latency) / nextScanned).toFixed(2));
        
        return {
          scanned: nextScanned,
          flagged: nextFlagged,
          legit: nextLegit,
          avgLatency: nextAvgLatency
        };
      });
    }
  };

  // Initialize with some seed transactions
  useEffect(() => {
    const loadSeedData = async () => {
      for (let i = 0; i < 6; i++) {
        await processNextTransaction();
      }
    };
    loadSeedData();
  }, []);

  // Handle live stream timer
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        processNextTransaction();
      }, speed);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed]);

  // Chart data matching last 15 items
  const getChartData = () => {
    return [...transactions]
      .slice(0, 15)
      .reverse()
      .map((tx, idx) => ({
        index: idx + 1,
        probability: parseFloat((tx.probability * 100).toFixed(1)),
        amount: tx.data.Amount,
        id: tx.id
      }));
  };

  return (
    <div className="layout">
      <main className="main-content" style={{ marginLeft: 0, width: '100%' }}>
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity color="var(--primary)" size={32} className="pulse" />
              <h1 style={styles.title}>Live Transaction Monitor</h1>
            </div>
            <p style={styles.subtitle}>Streaming evaluation environment simulating continuous ingest queues with instant model callbacks.</p>
          </div>

          {/* Controller and Running Ticker */}
          <div className="row">
            {/* Left side: Stream Stats & Line Ticker */}
            <div className="col-60" style={{ flex: '1.3', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Stats overview cards */}
              <div style={styles.miniStatsRow}>
                <div className="card" style={styles.miniCard}>
                  <div style={styles.cardHeader}>
                    <Database size={16} color="var(--primary)" />
                    <span style={styles.miniLabel}>Scanned</span>
                  </div>
                  <h3 style={styles.miniVal}>{stats.scanned}</h3>
                </div>

                <div className="card" style={{ ...styles.miniCard, borderLeft: '3px solid var(--danger)' }}>
                  <div style={styles.cardHeader}>
                    <AlertTriangle size={16} color="var(--danger)" />
                    <span style={styles.miniLabel}>Flagged</span>
                  </div>
                  <h3 style={{ ...styles.miniVal, color: 'var(--danger)' }}>{stats.flagged}</h3>
                </div>

                <div className="card" style={{ ...styles.miniCard, borderLeft: '3px solid var(--success)' }}>
                  <div style={styles.cardHeader}>
                    <CheckCircle2 size={16} color="var(--success)" />
                    <span style={styles.miniLabel}>Secured</span>
                  </div>
                  <h3 style={{ ...styles.miniVal, color: 'var(--success)' }}>{stats.legit}</h3>
                </div>

                <div className="card" style={styles.miniCard}>
                  <div style={styles.cardHeader}>
                    <Cpu size={16} color="var(--warning)" />
                    <span style={styles.miniLabel}>Latency</span>
                  </div>
                  <h3 style={styles.miniVal}>{stats.avgLatency}ms</h3>
                </div>
              </div>

              {/* Streaming Ticker Graph */}
              <div className="card">
                <h3 style={styles.cardTitle}>Real-time Fraud Risk Trend</h3>
                <div style={{ height: '220px', marginTop: '16px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="index" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="probability" 
                        name="Fraud Probability (%)" 
                        stroke="var(--primary)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#probGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Control Panel Card */}
              <div className="card" style={styles.controlsCard}>
                <div style={styles.controlsRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      className={isPlaying ? "btn-secondary" : "btn-primary"} 
                      onClick={() => setIsPlaying(!isPlaying)}
                      style={{ width: 'auto', padding: '10px 20px' }}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                      {isPlaying ? 'Pause Ingestion' : 'Start Ingestion'}
                    </button>
                    <span style={styles.statusLabel}>
                      <span style={{ 
                        ...styles.statusDot, 
                        backgroundColor: isPlaying ? 'var(--success)' : 'var(--danger)',
                        boxShadow: isPlaying ? '0 0 10px var(--success)' : 'none'
                      }}></span>
                      {isPlaying ? 'Active Ingest Pipeline' : 'Pipeline Standby'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Sliders size={16} color="var(--text-secondary)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ingest Interval:</span>
                    <select 
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      style={styles.speedSelect}
                    >
                      <option value={1000}>1 second (Fast)</option>
                      <option value={3000}>3 seconds (Standard)</option>
                      <option value={5000}>5 seconds (Slow)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Real-time Ingestion Feed Log list */}
            <div className="col-40" style={{ flex: '0.7', display: 'flex', flexDirection: 'column', height: '540px' }}>
              <div className="card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: '16px' }}>
                <h3 style={styles.cardTitle}>Ingestion Queue Live Feed</h3>
                <div style={styles.feedScroll}>
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        onClick={() => setSelectedTx(tx)}
                        style={{ 
                          ...styles.feedItem, 
                          borderColor: selectedTx?.id === tx.id ? 'var(--primary)' : 'var(--border)',
                          backgroundColor: tx.is_fraud ? 'rgba(255,0,85,0.02)' : 'rgba(255,255,255,0.01)',
                          borderLeft: tx.is_fraud ? '3px solid var(--danger)' : '3px solid var(--success)'
                        }}
                      >
                        <div style={styles.feedItemHeader}>
                          <span style={styles.feedItemTime}>{tx.timestamp}</span>
                          <span style={styles.feedItemId}>TX-{tx.id}</span>
                        </div>
                        <div style={styles.feedItemBody}>
                          <span style={styles.feedItemAmt}>${tx.data.Amount.toFixed(2)}</span>
                          <span className={`badge ${tx.is_fraud ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                            {tx.prediction} ({Math.round(tx.probability * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={styles.feedEmpty}>
                      <RefreshCw size={24} className="spinner" color="var(--text-secondary)" />
                      <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>Awaiting queue connection...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom details view (rendered when an item is selected from feed list) */}
          {selectedTx && (
            <div className="card fade-in" style={{ marginTop: '24px' }}>
              <div style={styles.detailHeaderSection}>
                <div>
                  <h3 style={styles.detailTitle}>Audit Ledger: Transaction ID {selectedTx.id}</h3>
                  <p style={styles.detailSub}>Ingested at {selectedTx.timestamp} | classification Latency: {selectedTx.latency} ms</p>
                </div>
                <button className="btn-secondary" onClick={() => setSelectedTx(null)} style={{ width: 'auto' }}>
                  Close Inspector
                </button>
              </div>

              <div className="row" style={{ marginTop: '16px' }}>
                {/* Feature Grid */}
                <div className="col-60" style={{ flex: 1.2 }}>
                  <h4 style={styles.sectionHeading}>Transaction Properties</h4>
                  <div style={styles.featureGrid}>
                    <div style={styles.gridBox}>
                      <span style={styles.gridLabel}>Time Index</span>
                      <span style={styles.gridValue}>{selectedTx.data.Time} s</span>
                    </div>
                    <div style={styles.gridBox}>
                      <span style={styles.gridLabel}>Amount</span>
                      <span style={styles.gridValue}>${selectedTx.data.Amount.toFixed(2)}</span>
                    </div>
                    {/* Render first 6 principal components */}
                    {[...Array(6)].map((_, idx) => (
                      <div key={`V${idx+1}`} style={styles.gridBox}>
                        <span style={styles.gridLabel}>V{idx+1} PCA</span>
                        <span style={styles.gridValue}>{selectedTx.data[`V${idx+1}`]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Prediction Details */}
                <div className="col-40" style={{ flex: 0.8 }}>
                  <h4 style={styles.sectionHeading}>Inference Metrics</h4>
                  <div style={styles.metricsBox}>
                    <div style={styles.metricRowDetail}>
                      <span style={styles.detailLabel}>Classification</span>
                      <span style={{ 
                        fontWeight: 700, 
                        color: selectedTx.is_fraud ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {selectedTx.prediction}
                      </span>
                    </div>
                    <div style={styles.metricRowDetail}>
                      <span style={styles.detailLabel}>Model Probability</span>
                      <span style={styles.detailValue}>{(selectedTx.probability * 100).toFixed(2)}%</span>
                    </div>
                    <div style={styles.metricRowDetail}>
                      <span style={styles.detailLabel}>Risk Assessment</span>
                      <span className={`badge ${selectedTx.is_fraud ? 'badge-danger' : 'badge-success'}`}>
                        {selectedTx.risk_level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

const styles = {
  header: {
    marginBottom: '28px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '8px',
    color: '#fff',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  miniStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  miniCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  miniLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  miniVal: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
  },
  controlsCard: {
    padding: '16px 24px',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  statusLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  speedSelect: {
    padding: '8px 12px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  },
  feedScroll: {
    marginTop: '16px',
    overflowY: 'auto',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
    height: '420px',
  },
  feedItem: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  feedItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  feedItemTime: {
    fontWeight: 500,
  },
  feedItemId: {
    fontFamily: 'monospace',
  },
  feedItemBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedItemAmt: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#fff',
  },
  feedEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    height: '100%',
  },
  detailHeaderSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  detailTitle: {
    fontSize: '16px',
    color: '#fff',
    fontWeight: 600,
  },
  detailSub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  sectionHeading: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '10px',
  },
  gridBox: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gridLabel: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
  },
  gridValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
  },
  metricsBox: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metricRowDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13.5px',
  },
  detailLabel: {
    color: 'var(--text-secondary)',
  },
  detailValue: {
    fontWeight: 600,
    color: '#fff',
  }
};

export default LiveMonitor;
