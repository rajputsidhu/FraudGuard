import { useState, useRef } from 'react';
import { 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { predictFile, explainTransaction } from '../api/fraudApi';

const ITEMS_PER_PAGE = 10;

const BatchUpload = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Auditing details modal state
  const [selectedAuditRow, setSelectedAuditRow] = useState(null);
  const [auditExplanation, setAuditExplanation] = useState(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Unsupported file type. Please upload a .csv file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Unsupported file type. Please upload a .csv file.');
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Submit file for prediction
  const handleSubmit = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    
    const { data, error: apiError } = await predictFile(file);
    setIsLoading(false);
    
    if (apiError) {
      setError(apiError);
    } else {
      setResults(data);
      setCurrentPage(1);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResults(null);
    setError(null);
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterRisk('ALL');
    setCurrentPage(1);
  };

  const handleExplainRow = (rowIndex) => {
    setSelectedAuditRow(rowIndex);
    setIsAuditLoading(true);
    setAuditExplanation(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Find line matching the selected row index (rowIndex is 1-based)
        if (rowIndex < lines.length) {
          const values = lines[rowIndex].split(',').map(v => parseFloat(v.trim()));
          const rowData = {};
          headers.forEach((h, idx) => {
            rowData[h] = values[idx];
          });
          
          const { data, error: apiError } = await explainTransaction(rowData);
          if (!apiError && data) {
            setAuditExplanation(data);
          } else {
            setError(apiError || 'Failed to generate explanation.');
          }
        } else {
          setError('Failed to locate transaction row features in source file.');
        }
      } catch (err) {
        console.error('Audit fail:', err);
        setError('Error reading transaction features from file.');
      } finally {
        setIsAuditLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const closeAuditModal = () => {
    setSelectedAuditRow(null);
    setAuditExplanation(null);
  };

  // Load simulated sandbox CSV file for testing
  const loadDemoDataset = () => {
    // Generate headers for credit card dataset (Time, Amount, V1-V28)
    const headers = ['Time', 'Amount', ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`)];
    
    // Generate a set of 12 sample transactions (some normal, some fraudulent)
    const rows = [
      // Legit cases (low amount, small PCA values)
      [142.0, 15.25, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      [315.0, 4.99, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      [420.0, 89.00, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      [1500.0, 120.50, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      [2400.0, 32.10, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      
      // Fraud anomaly 1 (huge amount, extreme PCA values for V14/V17/V12 which are highly correlated to fraud)
      [42.0, 1999.95, -4.512, 3.204, -5.612, 4.102, -3.214, 1.954, -6.102, 1.502, -4.120, -7.842, 2.105, -8.951, 0.451, -10.120, -2.104, -12.451, -9.102, 1.250, 0.954, 0.412, 1.102, -0.452, 0.651, 0.120, -0.852, 0.354, 1.254, 0.102],
      
      // Legit cases
      [3600.0, 250.00, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      [4800.0, 12.99, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      
      // Fraud anomaly 2
      [900.0, 850.00, -3.102, 2.104, -4.102, 3.012, -2.102, 1.024, -4.502, 0.954, -3.102, -5.102, 1.502, -6.502, 0.210, -8.102, -1.502, -9.502, -7.102, 0.954, 0.512, 0.214, 0.854, -0.321, 0.412, 0.085, -0.654, 0.214, 0.954, 0.052],
      
      // Legit cases
      [7200.0, 45.50, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      [9000.0, 68.20, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))],
      [12000.0, 5.00, ...Array.from({ length: 28 }, () => (Math.random() * 0.4 - 0.2).toFixed(4))]
    ];

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const demoFile = new File([csvContent], "sandbox_demo_dataset.csv", { type: "text/csv" });
    setFile(demoFile);
    setError(null);
  };

  // Generate Sample CSV with proper columns
  const generateSampleCSV = () => {
    const headers = ['Time', 'Amount', ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`)];
    
    // Create some randomized rows (some look like normal, some look like fraud)
    const rows = Array.from({ length: 15 }, (_, rowIndex) => {
      const isFraudRow = rowIndex === 4 || rowIndex === 11; // Designate 2 rows as anomaly
      const time = Math.floor(Math.random() * 170000);
      const amount = isFraudRow 
        ? parseFloat((1000 + Math.random() * 1500).toFixed(2)) // Fraud amount tends to be higher or unusual
        : parseFloat((10 + Math.random() * 200).toFixed(2));
      
      const vFeatures = Array.from({ length: 28 }, () => {
        // Fraud has highly skewed PCA values
        return isFraudRow 
          ? parseFloat((Math.random() * 10 - 5).toFixed(4)) 
          : parseFloat((Math.random() * 2 - 1).toFixed(4));
      });
      
      return [time, amount, ...vFeatures];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fraud_detection_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Results containing predictions
  const exportResultsCSV = () => {
    if (!results || !results.predictions) return;
    
    const headers = ["Row Index", "Time", "Amount", "Fraud Probability", "Prediction", "Risk Level"];
    const rows = results.predictions.map(p => [
      p.row_index,
      p.Time,
      p.Amount,
      p.fraud_probability,
      p.prediction,
      p.risk_level
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fraud_detection_predictions_${file?.name || 'batch'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recharts calculations
  const getPieChartData = () => {
    if (!results) return [];
    return [
      { name: 'Legitimate', value: results.legit_count },
      { name: 'Fraudulent', value: results.fraud_count }
    ];
  };

  const getRiskDistributionData = () => {
    if (!results || !results.predictions) return [];
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, 'VERY HIGH': 0 };
    results.predictions.forEach(p => {
      if (counts[p.risk_level] !== undefined) {
        counts[p.risk_level]++;
      }
    });
    return [
      { name: 'Low', count: counts.LOW, fill: '#00ff66' },
      { name: 'Medium', count: counts.MEDIUM, fill: '#ffaa00' },
      { name: 'High', count: counts.HIGH, fill: '#ff5500' },
      { name: 'Very High', count: counts['VERY HIGH'], fill: '#ff0055' }
    ];
  };

  // Filter & Search Logic
  const getFilteredPredictions = () => {
    if (!results || !results.predictions) return [];
    return results.predictions.filter(p => {
      // Status filter
      const matchesStatus = filterStatus === 'ALL' || 
        (filterStatus === 'FRAUD' && p.is_fraud) ||
        (filterStatus === 'LEGITIMATE' && !p.is_fraud);
        
      // Risk filter
      const matchesRisk = filterRisk === 'ALL' || p.risk_level === filterRisk;
      
      // Search term (matching index or amount)
      const matchesSearch = searchTerm === '' || 
        p.row_index.toString().includes(searchTerm) || 
        p.Amount.toString().includes(searchTerm);
        
      return matchesStatus && matchesRisk && matchesSearch;
    });
  };

  const filteredPredictions = getFilteredPredictions();
  const totalPages = Math.ceil(filteredPredictions.length / ITEMS_PER_PAGE);
  const paginatedPredictions = filteredPredictions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="layout">
      <main className="main-content" style={{ marginLeft: 0, width: '100%' }}>
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileSpreadsheet color="var(--primary)" size={32} />
              <h1 style={styles.title}>Batch Upload & Dataset Analytics</h1>
            </div>
            <p style={styles.subtitle}>Upload CSV transaction datasets for instant vectorized machine learning risk classifications.</p>
          </div>

          {error && (
            <div style={styles.errorBanner} className="fade-in">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!results ? (
            <div style={styles.uploaderContainer} className="fade-in">
              {/* Drag and Drop Zone */}
              <div 
                className="card"
                style={{ 
                  ...styles.dropzone, 
                  borderColor: dragActive ? 'var(--primary)' : 'var(--border)',
                  boxShadow: dragActive ? '0 0 20px rgba(0, 242, 254, 0.15)' : 'none',
                  backgroundColor: dragActive ? 'rgba(0, 242, 254, 0.02)' : 'var(--bg-card)'
                }}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".csv"
                  onChange={handleFileChange}
                />
                
                <div style={styles.dropzoneContent}>
                  <div style={styles.iconCircle}>
                    <Upload size={32} color={file ? "var(--success)" : "var(--primary)"} />
                  </div>
                  
                  {file ? (
                    <div>
                      <h3 style={styles.dropzoneTitle}>File Selected</h3>
                      <p style={styles.fileName}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
                    </div>
                  ) : (
                    <div>
                      <h3 style={styles.dropzoneTitle}>Drag and Drop CSV File</h3>
                      <p style={styles.dropzoneSubtitle}>or click the button below to browse local storage</p>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); loadDemoDataset(); }} 
                        style={styles.demoLink}
                      >
                        Or load a simulated sandbox dataset for instant preview
                      </button>
                    </div>
                  )}

                  <div style={styles.buttonRow}>
                    <button className="btn-secondary" onClick={onButtonClick} style={{ width: 'auto' }}>
                      Browse Files
                    </button>
                    {file && (
                      <button className="btn-primary" onClick={handleSubmit} disabled={isLoading} style={{ width: 'auto' }}>
                        {isLoading ? <RefreshCw className="spinner" size={18} /> : <Sparkles size={18} />}
                        {isLoading ? 'Processing batch...' : 'Execute Vectorized Analysis'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Requirement Guideline Cards */}
              <div className="row">
                <div className="col-60" style={{ flex: 1 }}>
                  <div className="card" style={{ height: '100%' }}>
                    <h3 style={styles.cardTitle}>CSV Structure Requirements</h3>
                    <p style={styles.text}>The XGBoost model expects a header row containing the exact feature keys used during offline feature engineering. Ensure your file format strictly includes:</p>
                    <div style={styles.requirementsList}>
                      <div style={styles.reqItem}>
                        <span style={styles.reqDot}></span>
                        <strong>Time:</strong> Seconds elapsed since first transaction.
                      </div>
                      <div style={styles.reqItem}>
                        <span style={styles.reqDot}></span>
                        <strong>Amount:</strong> Monetary volume of transaction in dollars.
                      </div>
                      <div style={styles.reqItem}>
                        <span style={styles.reqDot}></span>
                        <strong>V1 to V28:</strong> Pre-extracted Principal Components.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-40" style={{ flex: 1 }}>
                  <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={styles.cardTitle}>Instant Sandbox Test</h3>
                      <p style={styles.text}>Don't have a dataset ready? Generate a perfectly formatted CSV containing synthesized legit and fraud transactions in seconds.</p>
                    </div>
                    <button className="btn-secondary" onClick={generateSampleCSV} style={{ marginTop: '20px' }}>
                      <Download size={18} />
                      Generate Sample CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              {/* Results metrics overview */}
              <div style={styles.metricsRow}>
                <div className="card" style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <span style={styles.metricLabel}>Total Scanned</span>
                    <FileText color="var(--primary)" size={20} />
                  </div>
                  <h2 style={styles.metricValue}>{results.total_count}</h2>
                  <span style={styles.metricSub}>Transactions analyzed</span>
                </div>

                <div className="card" style={{ ...styles.metricCard, borderLeft: '4px solid var(--danger)' }}>
                  <div style={styles.metricHeader}>
                    <span style={styles.metricLabel}>Flagged Anomalies</span>
                    <AlertTriangle color="var(--danger)" size={20} />
                  </div>
                  <h2 style={{ ...styles.metricValue, color: 'var(--danger)' }}>{results.fraud_count}</h2>
                  <span style={styles.metricSub}>Identified as FRAUD</span>
                </div>

                <div className="card" style={{ ...styles.metricCard, borderLeft: '4px solid var(--success)' }}>
                  <div style={styles.metricHeader}>
                    <span style={styles.metricLabel}>Legitimate Cases</span>
                    <CheckCircle2 color="var(--success)" size={20} />
                  </div>
                  <h2 style={{ ...styles.metricValue, color: 'var(--success)' }}>{results.legit_count}</h2>
                  <span style={styles.metricSub}>Verified secure</span>
                </div>

                <div className="card" style={styles.metricCard}>
                  <div style={styles.metricHeader}>
                    <span style={styles.metricLabel}>Fraud Ratio</span>
                    <TrendingUp color="var(--warning)" size={20} />
                  </div>
                  <h2 style={styles.metricValue}>{results.fraud_ratio}%</h2>
                  <span style={styles.metricSub}>Percentage anomalous</span>
                </div>
              </div>

              {/* Charts visualization */}
              <div className="row">
                <div className="col-60" style={{ flex: '1.2' }}>
                  <div className="card" style={{ height: '360px' }}>
                    <h3 style={styles.cardTitle}>Transaction Risk Level Distribution</h3>
                    <div style={{ height: '260px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getRiskDistributionData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                            {getRiskDistributionData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="col-40" style={{ flex: '0.8' }}>
                  <div className="card" style={{ height: '360px' }}>
                    <h3 style={styles.cardTitle}>Proportion Ledger Breakdown</h3>
                    <div style={{ height: '260px', position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#00ff66" />
                            <Cell fill="#ff0055" />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Central stats label inside donut */}
                      <div style={styles.donutLabel}>
                        <div style={styles.donutVal}>{results.fraud_count}</div>
                        <div style={styles.donutText}>Frauds</div>
                      </div>
                      <div style={styles.pieLegend}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00ff66' }}></span>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Legit ({results.legit_count})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff0055' }}></span>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fraud ({results.fraud_count})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table Ledger Card */}
              <div className="card" style={{ marginTop: '24px' }}>
                <div style={styles.tableHeaderSection}>
                  <div>
                    <h3 style={{ ...styles.cardTitle, borderBottom: 'none', paddingBottom: 0, marginBottom: '4px' }}>Vectorized Prediction Output Ledger</h3>
                    <p style={{ ...styles.subtitle, fontSize: '13px' }}>Classified based on XGBoost prediction probabilities & tuned F1 thresholds.</p>
                  </div>
                  <div style={styles.buttonRow}>
                    <button className="btn-secondary" onClick={exportResultsCSV} style={{ width: 'auto' }}>
                      <Download size={16} />
                      Export predictions (CSV)
                    </button>
                    <button className="btn-primary" onClick={resetForm} style={{ width: 'auto' }}>
                      <RefreshCw size={16} />
                      Analyze New File
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div style={styles.filterRow}>
                  <div style={styles.searchContainer}>
                    <Search size={16} style={styles.searchIcon} />
                    <input 
                      type="text" 
                      placeholder="Search row or amount..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      style={styles.searchInput}
                    />
                  </div>

                  <div style={styles.dropdownGroup}>
                    <div style={styles.selectWrapper}>
                      <Filter size={14} style={styles.selectIcon} />
                      <select 
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                        style={styles.select}
                      >
                        <option value="ALL">All Outcomes</option>
                        <option value="FRAUD">Flagged Fraud</option>
                        <option value="LEGITIMATE">Legitimate Only</option>
                      </select>
                    </div>

                    <div style={styles.selectWrapper}>
                      <Filter size={14} style={styles.selectIcon} />
                      <select 
                        value={filterRisk}
                        onChange={(e) => { setFilterRisk(e.target.value); setCurrentPage(1); }}
                        style={styles.select}
                      >
                        <option value="ALL">All Risk Levels</option>
                        <option value="LOW">Low Risk</option>
                        <option value="MEDIUM">Medium Risk</option>
                        <option value="HIGH">High Risk</option>
                        <option value="VERY HIGH">Very High Risk</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Output Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Row</th>
                        <th style={styles.th}>Time (s)</th>
                        <th style={styles.th}>Amount ($)</th>
                        <th style={styles.th}>Fraud Probability</th>
                        <th style={styles.th}>Risk Level</th>
                        <th style={styles.th}>Classification</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPredictions.length > 0 ? (
                        paginatedPredictions.map((pred) => (
                          <tr key={pred.row_index} style={pred.is_fraud ? styles.trFraud : styles.tr}>
                            <td style={styles.td}>{pred.row_index}</td>
                            <td style={styles.td}>{pred.Time}</td>
                            <td style={styles.td}>${pred.Amount.toFixed(2)}</td>
                            <td style={styles.td}>
                              <div style={styles.probContainer}>
                                <span style={{ width: '45px' }}>{(pred.fraud_probability * 100).toFixed(2)}%</span>
                                <div style={styles.probBarBg}>
                                  <div style={{ 
                                    ...styles.probBarFill, 
                                    width: `${pred.fraud_probability * 100}%`,
                                    backgroundColor: pred.is_fraud ? 'var(--danger)' : 'var(--success)'
                                  }}></div>
                                </div>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span className={`badge ${
                                pred.risk_level === 'VERY HIGH' ? 'badge-danger' :
                                pred.risk_level === 'HIGH' ? 'badge-danger' :
                                pred.risk_level === 'MEDIUM' ? 'badge-warning' : 'badge-success'
                              }`}>
                                {pred.risk_level}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <span style={{ 
                                color: pred.is_fraud ? 'var(--danger)' : 'var(--success)', 
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                {pred.is_fraud ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                {pred.prediction}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <button 
                                className="btn-secondary"
                                onClick={() => handleExplainRow(pred.row_index)}
                                style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                              >
                                Audit XAI
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                            No prediction records matches the selected filter parameters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={styles.pagination}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      style={styles.pagBtn}
                    >
                      Prev
                    </button>
                    <span style={styles.pagText}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      style={styles.pagBtn}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auditing SHAP modal */}
          {selectedAuditRow !== null && (
            <div style={styles.modalOverlay} onClick={closeAuditModal}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="fade-in">
                <div style={styles.modalHeader}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>SHAP Explainability Audit: Row #{selectedAuditRow}</h3>
                  <button onClick={closeAuditModal} style={styles.closeBtn}>&times;</button>
                </div>

                {isAuditLoading ? (
                  <div style={styles.modalLoading}>
                    <RefreshCw className="spinner" size={24} color="var(--primary)" />
                    <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>Computing dynamically via TreeExplainer...</p>
                  </div>
                ) : auditExplanation ? (
                  <div style={styles.modalBody}>
                    <p style={styles.modalText}>
                      This transaction classification is explained using Shapley additive feature contribution values.
                      Base value (log-odds space): <strong>{auditExplanation.base_value}</strong>
                    </p>

                    <h4 style={{ ...styles.sectionHeading, marginTop: '20px', marginBottom: '10px' }}>Top Impact Features</h4>
                    <div style={{ height: '220px', marginTop: '10px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={auditExplanation.top_features} 
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                          <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                          <YAxis dataKey="feature" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: '#fff', fontSize: '11px' }} />
                          <Bar dataKey="shap_value" radius={[0, 4, 4, 0]}>
                            {auditExplanation.top_features.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.shap_value < 0 ? 'var(--danger)' : 'var(--success)'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={styles.auditVerdictBox}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>Verdict Analysis:</span>
                      <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {auditExplanation.top_features[0]?.shap_value < 0 
                          ? `The principal driver pushing this decision towards FRAUD is feature ${auditExplanation.top_features[0]?.feature} with a SHAP contribution score of ${auditExplanation.top_features[0]?.shap_value.toFixed(2)}.`
                          : `The primary factor securing this transaction as LEGITIMATE is feature ${auditExplanation.top_features[0]?.feature} with a SHAP contribution score of +${auditExplanation.top_features[0]?.shap_value.toFixed(2)}.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Failed to load auditing data.</p>
                )}
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
    marginBottom: '32px',
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
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'var(--danger-light)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  uploaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  dropzone: {
    border: '2px dashed var(--border)',
    borderRadius: '16px',
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginBottom: '8px',
  },
  dropzoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border)',
  },
  dropzoneTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
  },
  dropzoneSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  fileName: {
    fontSize: '14px',
    color: 'var(--success)',
    fontWeight: 500,
    marginTop: '4px',
    backgroundColor: 'var(--success-light)',
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(0, 255, 102, 0.1)',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  text: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  requirementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  reqItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
  },
  reqDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  metricCard: {
    padding: '20px',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  metricLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.1,
    marginBottom: '4px',
  },
  metricSub: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  donutLabel: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  donutVal: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--danger)',
  },
  donutText: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  pieLegend: {
    position: 'absolute',
    bottom: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    width: '100%',
  },
  tableHeaderSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border)',
    paddingBottom: '16px',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '16px',
  },
  searchContainer: {
    position: 'relative',
    flex: '1 1 300px',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-secondary)',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  dropdownGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  selectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  selectIcon: {
    position: 'absolute',
    left: '10px',
    color: 'var(--text-secondary)',
    pointerEvents: 'none',
  },
  select: {
    padding: '10px 16px 10px 32px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
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
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.2s',
  },
  trFraud: {
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'rgba(255,0,85,0.02)',
    borderLeft: '4px solid var(--danger)',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '13.5px',
    color: 'var(--text-primary)',
  },
  probContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  probBarBg: {
    width: '80px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    borderRadius: '3px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border)',
  },
  pagBtn: {
    width: 'auto',
    padding: '8px 16px',
    fontSize: '13px',
  },
  pagText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  demoLink: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    textDecoration: 'underline',
    fontSize: '13.5px',
    marginTop: '12px',
    cursor: 'pointer',
    opacity: 0.85,
    display: 'inline-block',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modalContent: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '520px',
    overflow: 'hidden',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    fontSize: '24px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    outline: 'none',
    transition: 'color 0.2s',
  },
  modalLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  modalBody: {
    padding: '20px',
  },
  modalText: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: 0,
  },
  sectionHeading: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  auditVerdictBox: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '13px',
  }
};

export default BatchUpload;
