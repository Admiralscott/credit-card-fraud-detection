import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Search, 
  Filter, 
  ArrowRight, 
  RefreshCw, 
  Plus, 
  X, 
  CheckCircle, 
  Cpu, 
  Info,
  ChevronLeft,
  ChevronRight,
  User,
  Sliders,
  Play
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// High-quality mock data for fallback when API is disconnected
const MOCK_METRICS = {
  accuracy: 0.9625,
  roc_auc: 0.8942,
  precision: 0.8120,
  recall: 0.7410,
  f1_score: 0.7749,
  best_threshold: 0.2850,
  best_f1: 0.7915,
  confusion_matrix: [
    [9540, 110], // True Negatives, False Positives (total 9650 genuine)
    [90, 260]    // False Negatives, True Positives (total 350 fraud)
  ],
  feature_importance: {
    'TransactionAmt': 0.185,
    'C13': 0.142,
    'card3': 0.118,
    'P_emaildomain': 0.095,
    'DeviceType': 0.088,
    'card6': 0.076,
    'id_31': 0.062,
    'ProductCD': 0.055,
    'addr1': 0.048,
    'D1': 0.041,
    'V300': 0.035,
    'V15': 0.030,
    'id_01': 0.025,
    'card1': 0.010
  }
};

const MOCK_STATS = {
  total_transactions: 10000,
  fraud_rate: 0.035,
  total_fraud: 350,
  average_amount: 135.42,
  max_amount: 2840.00
};

const generateMockTransactions = (count = 100) => {
  const brands = ['visa', 'mastercard', 'american express', 'discover'];
  const types = ['credit', 'debit'];
  const products = ['W', 'H', 'C', 'S', 'R'];
  const browsers = ['chrome', 'safari', 'firefox', 'edge'];
  const devices = ['desktop', 'mobile'];
  const emails = ['gmail.com', 'yahoo.com', 'anonymous.com', 'hotmail.com'];
  
  const txList = [];
  let baseId = 2997000;
  
  for (let i = 0; i < count; i++) {
    const isFraud = Math.random() < 0.035 ? 1 : 0;
    
    // Correlate high amount & anonymous email & mobile device to fraud
    let amt = Math.round((Math.random() * 200 + 10) * 100) / 100;
    let email = emails[Math.floor(Math.random() * emails.length)];
    let device = devices[Math.floor(Math.random() * devices.length)];
    let brand = brands[Math.floor(Math.random() * brands.length)];
    let cardType = types[Math.floor(Math.random() * types.length)];
    let product = products[Math.floor(Math.random() * products.length)];
    
    if (isFraud) {
      amt = Math.round((Math.random() * 800 + 150) * 100) / 100;
      email = Math.random() < 0.6 ? 'anonymous.com' : email;
      device = Math.random() < 0.7 ? 'mobile' : device;
      cardType = Math.random() < 0.8 ? 'credit' : cardType;
      product = Math.random() < 0.5 ? 'C' : product;
    }
    
    const predictedProb = isFraud 
      ? Math.round((0.65 + Math.random() * 0.3) * 100) / 100 
      : Math.round((Math.random() * 0.15) * 100) / 100;
      
    txList.push({
      TransactionID: baseId - i,
      isFraud: isFraud,
      TransactionDT: 86400 * 30 - i * 1800,
      TransactionAmt: amt,
      ProductCD: product,
      card1: Math.floor(Math.random() * 15000) + 2000,
      card2: 321.0,
      card3: 150.0,
      card4: brand,
      card5: 226.0,
      card6: cardType,
      addr1: 325.0,
      addr2: 87.0,
      P_emaildomain: email,
      R_emaildomain: Math.random() < 0.5 ? 'gmail.com' : null,
      C1: 1, C2: 1, C5: 0, C11: 1, C13: 2, C14: 1,
      D1: Math.floor(Math.random() * 100),
      D2: Math.random() < 0.4 ? null : Math.floor(Math.random() * 20),
      M1: 'T', M2: 'T', M3: 'F', M4: 'M0',
      V11: 0.45, V15: isFraud ? 2.0 : 0.0, V29: 0.0, V35: 1.0,
      V45: 1.0, V53: 1.0, V62: 1, V75: 0.0, V87: 1.0, V94: 0.0,
      V100: 0.0, V200: 0.0, V300: isFraud ? 12.0 : 0.0,
      id_01: isFraud ? -100.0 : 0.0,
      id_02: isFraud ? 240000.0 : null,
      id_12: 'NotFound',
      id_15: 'Found',
      id_31: browsers[Math.floor(Math.random() * browsers.length)],
      DeviceType: device,
      DeviceInfo: device === 'desktop' ? 'Windows' : 'iOS Device',
      predicted_fraud_prob: predictedProb,
      predicted_is_fraud: predictedProb >= 0.285 ? 1 : 0
    });
  }
  return txList;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(MOCK_STATS);
  const [metrics, setMetrics] = useState(MOCK_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Connection states
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  
  // Details Modal
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Predictor form state
  const [predictorInput, setPredictorInput] = useState({
    TransactionAmt: '120.50',
    ProductCD: 'W',
    card1: '5014',
    card4: 'visa',
    card6: 'debit',
    addr1: '325',
    P_emaildomain: 'gmail.com',
    R_emaildomain: '',
    C13: '2',
    D1: '12',
    V15: '0',
    V300: '0',
    id_01: '0',
    DeviceType: 'desktop',
    DeviceInfo: 'Windows'
  });
  const [predictorResult, setPredictorResult] = useState(null);
  const [predictorLoading, setPredictorLoading] = useState(false);
  
  // Retraining state
  const [retrainRecords, setRetrainRecords] = useState(10000);
  const [retraining, setRetraining] = useState(false);
  const [retrainToast, setRetrainToast] = useState(null);
  
  // Table search & filter states
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilterProduct, setTableFilterProduct] = useState('');
  const [tableFilterFraud, setTableFilterFraud] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const itemsPerPage = 12;

  // Test API connection on startup
  useEffect(() => {
    checkConnectionAndLoad();
  }, []);

  const checkConnectionAndLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to hit API status
      const res = await fetch(`${API_BASE_URL}/status`, { signal: AbortSignal.timeout(3000) });
      const statusData = await res.json();
      
      if (statusData.status === 'healthy') {
        setIsApiConnected(true);
        // Load actual data from API
        await loadLiveData();
      } else {
        throw new Error("API reported unhealthy");
      }
    } catch (err) {
      console.log("Failed to connect to Flask API backend, falling back to client simulation mode.", err);
      setIsApiConnected(false);
      // Load fallback mock data
      setTransactions(generateMockTransactions(100));
      setStats(MOCK_STATS);
      setMetrics(MOCK_METRICS);
    } finally {
      setConnectionChecked(true);
      setLoading(false);
    }
  };

  const loadLiveData = async () => {
    try {
      // Fetch stats & metrics
      const metricsRes = await fetch(`${API_BASE_URL}/metrics`);
      const metricsData = await metricsRes.json();
      if (metricsData.metrics) {
        setMetrics(metricsData.metrics);
      }
      if (metricsData.stats) {
        setStats(metricsData.stats);
      }
      
      // Fetch latest 100 transactions
      const txRes = await fetch(`${API_BASE_URL}/transactions?limit=100`);
      const txData = await txRes.json();
      if (Array.isArray(txData)) {
        setTransactions(txData);
      }
    } catch (err) {
      console.error("Error fetching live data", err);
      setError("Failed to fetch data from Flask API.");
    }
  };

  const handlePredictSubmit = async (e) => {
    e.preventDefault();
    setPredictorLoading(true);
    setPredictorResult(null);
    
    // Cast necessary fields to appropriate types
    const payload = {
      ...predictorInput,
      TransactionAmt: parseFloat(predictorInput.TransactionAmt) || 0.0,
      card1: parseInt(predictorInput.card1) || 0,
      addr1: parseFloat(predictorInput.addr1) || 0.0,
      C13: parseInt(predictorInput.C13) || 1,
      D1: parseInt(predictorInput.D1) || 0,
      V15: parseFloat(predictorInput.V15) || 0.0,
      V300: parseFloat(predictorInput.V300) || 0.0,
      id_01: parseFloat(predictorInput.id_01) || 0.0
    };

    if (isApiConnected) {
      try {
        const res = await fetch(`${API_BASE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.error) {
          throw new Error(result.error);
        }
        setPredictorResult(result);
      } catch (err) {
        alert("Prediction request failed: " + err.message);
      } finally {
        setPredictorLoading(false);
      }
    } else {
      // Simulate prediction locally
      setTimeout(() => {
        let prob = 0.04; // base probability
        const amt = payload.TransactionAmt;
        
        // Simulating rules
        if (amt > 150) prob += 0.1;
        if (amt > 500) prob += 0.2;
        if (payload.P_emaildomain === 'anonymous.com') prob += 0.25;
        if (payload.ProductCD === 'C') prob += 0.12;
        if (payload.card6 === 'credit') prob += 0.05;
        if (payload.DeviceType === 'mobile') prob += 0.15;
        if (payload.V300 > 5) prob += 0.2;
        if (payload.id_01 < -10) prob += 0.15;
        
        prob = Math.min(prob, 0.98);
        const threshold = metrics.best_threshold || 0.285;
        const isFraud = prob >= threshold ? 1 : 0;
        
        setPredictorResult({
          is_fraud: isFraud,
          fraud_probability: prob,
          threshold_used: threshold,
          risk_level: prob >= 0.75 ? 'High' : (prob >= threshold ? 'Medium' : 'Low'),
          transaction_details: {
            TransactionAmt: amt,
            ProductCD: payload.ProductCD,
            card4: payload.card4,
            card6: payload.card6,
            DeviceType: payload.DeviceType
          }
        });
        setPredictorLoading(false);
      }, 800);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainToast(null);
    
    if (isApiConnected) {
      try {
        const res = await fetch(`${API_BASE_URL}/train`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ num_records: retrainRecords })
        });
        const result = await res.json();
        if (result.success) {
          setMetrics(result.metrics);
          setRetrainToast({
            type: 'success',
            text: `Retraining complete! Model updated. New F1: ${(result.metrics.f1_score * 100).toFixed(1)}%`
          });
          // Reload transactions
          loadLiveData();
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        setRetrainToast({
          type: 'danger',
          text: `Retraining failed: ${err.message}`
        });
      } finally {
        setRetraining(false);
      }
    } else {
      // Simulate retraining locally
      setTimeout(() => {
        // slightly improve mock metrics to simulate training learning
        const delta = (Math.random() - 0.3) * 0.01; // subtle shift
        const newF1 = Math.min(MOCK_METRICS.f1_score + delta, 0.82);
        const newAcc = Math.min(MOCK_METRICS.accuracy + delta * 0.5, 0.98);
        const newAuc = Math.min(MOCK_METRICS.roc_auc + delta * 0.8, 0.93);
        
        setMetrics(prev => ({
          ...prev,
          accuracy: newAcc,
          roc_auc: newAuc,
          f1_score: newF1,
          best_f1: newF1 + 0.015,
          confusion_matrix: [
            [9560 + Math.floor(Math.random() * 20), 90 - Math.floor(Math.random() * 10)],
            [80 - Math.floor(Math.random() * 10), 270 + Math.floor(Math.random() * 10)]
          ]
        }));
        
        setStats(prev => ({
          ...prev,
          total_transactions: prev.total_transactions + 100,
          total_fraud: prev.total_fraud + 4
        }));
        
        setRetrainToast({
          type: 'success',
          text: `Simulation: Retraining complete! Resampled training set with SMOTE. Evaluated F1-Score: ${(newF1 * 100).toFixed(2)}%`
        });
        setRetraining(false);
      }, 2500);
    }
  };

  // Helper to format currency
  const formatAmt = (amt) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt);
  };

  // Dynamic values based on current transactions state for dashboard
  const computedStats = React.useMemo(() => {
    if (transactions.length === 0) return { productCodeStats: [], volumeChartData: [] };
    
    // 1. Calculate Product Code fraud risk
    const productStatsMap = {};
    transactions.forEach(t => {
      const code = t.ProductCD || 'W';
      if (!productStatsMap[code]) {
        productStatsMap[code] = { count: 0, fraud: 0 };
      }
      productStatsMap[code].count += 1;
      productStatsMap[code].fraud += t.isFraud ? 1 : 0;
    });
    
    const productCodeStats = Object.keys(productStatsMap).map(key => ({
      name: key,
      rate: productStatsMap[key].fraud / productStatsMap[key].count,
      count: productStatsMap[key].count
    })).sort((a,b) => b.rate - a.rate);
    
    // 2. Prepare transaction amount sequence for SVG chart (taking latest 15 transactions in chronological order)
    const volumeChartData = [...transactions]
      .slice(0, 15)
      .reverse()
      .map((t, idx) => ({
        index: idx,
        id: t.TransactionID,
        amount: t.TransactionAmt,
        isFraud: t.isFraud,
        prob: t.predicted_fraud_prob || 0.0
      }));
      
    return { productCodeStats, volumeChartData };
  }, [transactions]);

  // Filter and paginate transactions for Table page
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = tableSearch === '' || 
      t.TransactionID.toString().includes(tableSearch) ||
      (t.card4 && t.card4.toLowerCase().includes(tableSearch.toLowerCase())) ||
      (t.card6 && t.card6.toLowerCase().includes(tableSearch.toLowerCase())) ||
      (t.P_emaildomain && t.P_emaildomain.toLowerCase().includes(tableSearch.toLowerCase()));
      
    const matchesProduct = tableFilterProduct === '' || t.ProductCD === tableFilterProduct;
    const matchesFraud = tableFilterFraud === '' || 
      (tableFilterFraud === '1' && t.isFraud === 1) || 
      (tableFilterFraud === '0' && t.isFraud === 0);
      
    return matchesSearch && matchesProduct && matchesFraud;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (tablePage - 1) * itemsPerPage,
    tablePage * itemsPerPage
  );

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <Shield className="logo-icon" size={26} />
          <span className="logo-text">SHIELD.AI</span>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ul className="sidebar-menu">
            <li 
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Activity size={18} />
              <span>Dashboard</span>
            </li>
            <li 
              className={`sidebar-item ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <Database size={18} />
              <span>Transactions</span>
            </li>
            <li 
              className={`sidebar-item ${activeTab === 'predictor' ? 'active' : ''}`}
              onClick={() => setActiveTab('predictor')}
            >
              <Cpu size={18} />
              <span>Fraud Predictor</span>
            </li>
            <li 
              className={`sidebar-item ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              <Sliders size={18} />
              <span>Model Tuning</span>
            </li>
          </ul>
          
          <div className="sidebar-footer">
            <div className="api-status">
              <span className={`status-indicator ${isApiConnected ? 'connected' : 'disconnected'}`}></span>
              <span>
                {isApiConnected 
                  ? 'API: Connected' 
                  : 'API: Simulation Mode'}
              </span>
            </div>
            {!isApiConnected && connectionChecked && (
              <button 
                onClick={checkConnectionAndLoad}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginTop: '10px',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={10} />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        </nav>
      </aside>
      
      {/* Main Workspace */}
      <main className="main-content">
        <header className="header">
          <h1 className="page-title">
            {activeTab === 'dashboard' && 'Security Overview'}
            {activeTab === 'transactions' && 'Transaction Ledger'}
            {activeTab === 'predictor' && 'Real-Time Prediction Terminal'}
            {activeTab === 'training' && 'Model Retraining & Calibration'}
          </h1>
          
          <div className="header-actions">
            {!isApiConnected && (
              <span style={{ 
                color: 'var(--warning)', 
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                fontSize: '12px', 
                padding: '4px 10px', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle size={12} />
                <span>Backend offline. Running simulated pipeline.</span>
              </span>
            )}
            <div className="user-badge">
              <span className="user-avatar">A</span>
              <span>SecOps Analyst</span>
            </div>
          </div>
        </header>
        
        {loading ? (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <RefreshCw className="spinner" size={40} color="var(--primary)" />
            <p style={{ color: 'var(--text-secondary)' }}>Initializing analytics engines...</p>
          </div>
        ) : (
          <div className="page-container">
            
            {/* ========================================================================= */}
            {/* TABS 1: SECURITY DASHBOARD */}
            {/* ========================================================================= */}
            {activeTab === 'dashboard' && (
              <div>
                {/* KPI metrics row */}
                <div className="kpi-grid">
                  <div className="card kpi-card primary-theme">
                    <div className="kpi-header">
                      <span>Accuracy Index</span>
                      <div className="kpi-icon-wrapper"><Cpu size={18} /></div>
                    </div>
                    <div className="kpi-value">{(metrics.accuracy * 100).toFixed(2)}%</div>
                    <div className="kpi-meta">
                      <TrendingUp size={12} color="var(--success)" />
                      <span>XGBoost AUC: {(metrics.roc_auc).toFixed(4)}</span>
                    </div>
                  </div>
                  
                  <div className="card kpi-card danger-theme">
                    <div className="kpi-header">
                      <span>Detected Fraud Rate</span>
                      <div className="kpi-icon-wrapper"><AlertTriangle size={18} /></div>
                    </div>
                    <div className="kpi-value">{(stats.fraud_rate * 100).toFixed(2)}%</div>
                    <div className="kpi-meta">
                      <span>Target IEEE-CIS benchmark: ~3.50%</span>
                    </div>
                  </div>
                  
                  <div className="card kpi-card secondary-theme">
                    <div className="kpi-header">
                      <span>Processed Ledger</span>
                      <div className="kpi-icon-wrapper"><Database size={18} /></div>
                    </div>
                    <div className="kpi-value">{stats.total_transactions.toLocaleString()}</div>
                    <div className="kpi-meta">
                      <span>Active database connection</span>
                    </div>
                  </div>
                  
                  <div className="card kpi-card success-theme">
                    <div className="kpi-header">
                      <span>Average Amount</span>
                      <div className="kpi-icon-wrapper"><DollarSign size={18} /></div>
                    </div>
                    <div className="kpi-value">{formatAmt(stats.average_amount)}</div>
                    <div className="kpi-meta">
                      <span>Max value: {formatAmt(stats.max_amount)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Charts Grid */}
                <div className="dashboard-grid">
                  <div className="charts-row">
                    {/* SVG Area Chart: Transaction Flow & Fraud Risk */}
                    <div className="card chart-card">
                      <h3 className="chart-title">
                        <Activity size={16} color="var(--primary)" />
                        <span>Real-Time Transaction Stream (Last 15 Records)</span>
                      </h3>
                      <div className="chart-container">
                        {computedStats.volumeChartData.length > 0 ? (
                          <svg className="svg-chart" viewBox="0 0 500 200">
                            {/* Grid Lines */}
                            {[0, 50, 100, 150].map((yVal, i) => (
                              <line 
                                key={i} 
                                x1="30" 
                                y1={170 - yVal} 
                                x2="480" 
                                y2={170 - yVal} 
                                className="chart-grid-line" 
                              />
                            ))}
                            {/* Axis lines */}
                            <line x1="30" y1="10" x2="30" y2="170" className="chart-axis-line" />
                            <line x1="30" y1="170" x2="480" y2="170" className="chart-axis-line" />
                            
                            {/* Axis text */}
                            <text x="10" y="174" className="chart-axis-text">$0</text>
                            <text x="10" y="124" className="chart-axis-text">$50</text>
                            <text x="5" y="74" className="chart-axis-text">$100</text>
                            <text x="5" y="24" className="chart-axis-text">$150+</text>
                            
                            {/* Draw Area with gradients */}
                            <defs>
                              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Create Path coordinates */}
                            {(() => {
                              const points = computedStats.volumeChartData.map((d, i) => {
                                const x = 30 + (i * 32);
                                // scale amount (cap at 200 for chart limits)
                                const amtScaled = Math.min(d.amount, 160);
                                const y = 170 - (amtScaled / 160) * 140;
                                return { x, y, isFraud: d.isFraud, id: d.id, amt: d.amount };
                              });
                              
                              if (points.length === 0) return null;
                              
                              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                              const areaPath = `${linePath} L ${points[points.length-1].x} 170 L ${points[0].x} 170 Z`;
                              
                              return (
                                <>
                                  <path d={areaPath} fill="url(#chartGlow)" />
                                  <path d={linePath} className="chart-line" stroke="var(--primary)" />
                                  {/* Dots */}
                                  {points.map((p, i) => (
                                    <g key={i}>
                                      <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r={p.isFraud ? "6" : "4"} 
                                        fill={p.isFraud ? "var(--danger)" : "var(--secondary)"}
                                        style={{ 
                                          filter: p.isFraud ? 'drop-shadow(0 0 4px var(--danger))' : 'none',
                                          cursor: 'pointer' 
                                        }}
                                      />
                                      {/* Tiny Text on Hover would be complex, we just put dots */}
                                    </g>
                                  ))}
                                </>
                              );
                            })()}
                          </svg>
                        ) : (
                          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No stream data loaded
                          </div>
                        )}
                        <div className="chart-legend">
                          <div className="legend-item">
                            <span className="legend-dot" style={{ background: 'var(--secondary)' }}></span>
                            <span>Normal Transaction</span>
                          </div>
                          <div className="legend-item">
                            <span className="legend-dot" style={{ background: 'var(--danger)' }}></span>
                            <span>Flagged Fraud</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* SVG Bar Chart: ProductCD Risk Profile */}
                    <div className="card chart-card">
                      <h3 className="chart-title">
                        <TrendingUp size={16} color="var(--secondary)" />
                        <span>Fraud Incidence by Product Code (ProductCD)</span>
                      </h3>
                      <div className="chart-container">
                        {computedStats.productCodeStats.length > 0 ? (
                          <svg className="svg-chart" viewBox="0 0 500 200">
                            {/* Horizontal grid lines */}
                            {[0, 25, 50, 75, 100].map((grid, idx) => (
                              <line 
                                key={idx} 
                                x1="40" 
                                y1={160 - (grid * 1.3)} 
                                x2="480" 
                                y2={160 - (grid * 1.3)} 
                                className="chart-grid-line" 
                              />
                            ))}
                            <line x1="40" y1="10" x2="40" y2="160" className="chart-axis-line" />
                            <line x1="40" y1="160" x2="480" y2="160" className="chart-axis-line" />
                            
                            {/* Y-axis percentages */}
                            <text x="10" y="164" className="chart-axis-text">0%</text>
                            <text x="5" y="131" className="chart-axis-text">25%</text>
                            <text x="5" y="99" className="chart-axis-text">50%</text>
                            <text x="5" y="66" className="chart-axis-text">75%</text>
                            <text x="0" y="34" className="chart-axis-text">100%</text>
                            
                            {/* Draw Bars */}
                            {computedStats.productCodeStats.map((item, i) => {
                              const x = 70 + (i * 85);
                              // Scale rate up to 100% (map 0..1 to 0..130px height)
                              const ratePct = item.rate * 100;
                              const barHeight = Math.max(ratePct * 1.3, 4); // minimum 4px height
                              const y = 160 - barHeight;
                              const isHighRisk = item.rate > 0.1;
                              const barColor = isHighRisk ? 'var(--danger)' : 'var(--secondary)';
                              
                              return (
                                <g key={i}>
                                  {/* Background bar to show total max */}
                                  <rect x={x} y="30" width="36" height="130" className="chart-bar-bg" rx="4" />
                                  {/* Filled rate bar */}
                                  <rect 
                                    x={x} 
                                    y={y} 
                                    width="36" 
                                    height={barHeight} 
                                    fill={barColor}
                                    className="chart-bar"
                                    style={{
                                      filter: isHighRisk ? 'drop-shadow(0 0 3px rgba(244, 63, 94, 0.4))' : 'none'
                                    }}
                                  />
                                  {/* Category label */}
                                  <text x={x + 18} y="180" textAnchor="middle" className="chart-axis-text" fill="var(--text-primary)" fontWeight="bold">
                                    {item.name}
                                  </text>
                                  {/* Rate value label on top of bar */}
                                  <text x={x + 18} y={y - 8} textAnchor="middle" className="chart-axis-text" fill={isHighRisk ? 'var(--danger)' : 'var(--text-secondary)'}>
                                    {(item.rate * 100).toFixed(1)}%
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        ) : (
                          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No statistics available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Transactions List (Right column) */}
                  <div className="card feed-card" style={{ gridColumn: 'span 2' }}>
                    <div className="feed-header">
                      <h3 className="chart-title" style={{ margin: 0 }}>
                        <Database size={16} color="var(--primary)" />
                        <span>Live Transaction Watch</span>
                      </h3>
                      <button 
                        className="btn-inspect" 
                        onClick={() => setActiveTab('transactions')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>View All</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table className="transaction-table">
                        <thead>
                          <tr>
                            <th>Transaction ID</th>
                            <th>Amount</th>
                            <th>Product</th>
                            <th>Card Brand</th>
                            <th>Card Type</th>
                            <th>Risk Score</th>
                            <th>Status Flag</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.slice(0, 5).map((tx) => {
                            const isHighRisk = (tx.predicted_fraud_prob || 0) >= (metrics.best_threshold || 0.285);
                            return (
                              <tr key={tx.TransactionID}>
                                <td style={{ fontWeight: 'bold' }}>#{tx.TransactionID}</td>
                                <td style={{ fontWeight: '600' }}>{formatAmt(tx.TransactionAmt)}</td>
                                <td><span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid var(--border-muted)' }}>{tx.ProductCD}</span></td>
                                <td style={{ textTransform: 'capitalize' }}>{tx.card4 || 'unknown'}</td>
                                <td style={{ textTransform: 'capitalize' }}>{tx.card6 || 'unknown'}</td>
                                <td>
                                  <span style={{ 
                                    fontWeight: 'bold', 
                                    color: isHighRisk ? 'var(--danger)' : 'var(--success)'
                                  }}>
                                    {Math.round((tx.predicted_fraud_prob || 0) * 100)}%
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${tx.isFraud ? 'fraud' : 'genuine'}`}>
                                    {tx.isFraud ? 'Fraud' : 'Genuine'}
                                  </span>
                                </td>
                                <td>
                                  <button className="btn-inspect" onClick={() => setSelectedTransaction(tx)}>
                                    Inspect
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* ========================================================================= */}
            {/* TABS 2: TRANSACTIONS TAB */}
            {/* ========================================================================= */}
            {activeTab === 'transactions' && (
              <div className="card table-card">
                <div className="table-toolbar">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" size={16} />
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Search Transaction ID, brand, email or type..." 
                      value={tableSearch}
                      onChange={(e) => { setTableSearch(e.target.value); setTablePage(1); }}
                    />
                  </div>
                  
                  <div className="filters-wrapper">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Filter size={14} color="var(--text-secondary)" />
                      <select 
                        className="filter-select"
                        value={tableFilterProduct}
                        onChange={(e) => { setTableFilterProduct(e.target.value); setTablePage(1); }}
                      >
                        <option value="">All Products</option>
                        <option value="W">W (Work)</option>
                        <option value="H">H (Home)</option>
                        <option value="C">C (Commercial)</option>
                        <option value="S">S (Subscription)</option>
                        <option value="R">R (Retail)</option>
                      </select>
                    </div>
                    
                    <select 
                      className="filter-select"
                      value={tableFilterFraud}
                      onChange={(e) => { setTableFilterFraud(e.target.value); setTablePage(1); }}
                    >
                      <option value="">All Statuses</option>
                      <option value="1">Flagged Fraud</option>
                      <option value="0">Genuine</option>
                    </select>
                  </div>
                </div>
                
                <div className="table-wrapper">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Amount</th>
                        <th>Product</th>
                        <th>Card Brand</th>
                        <th>Card Type</th>
                        <th>Purchaser Email</th>
                        <th>Risk Score</th>
                        <th>Security Flag</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransactions.length > 0 ? (
                        paginatedTransactions.map((tx) => {
                          const riskScore = tx.predicted_fraud_prob || 0.0;
                          const riskColor = riskScore >= 0.75 
                            ? 'var(--danger)' 
                            : (riskScore >= (metrics.best_threshold || 0.285) ? 'var(--warning)' : 'var(--success)');
                            
                          return (
                            <tr key={tx.TransactionID}>
                              <td style={{ fontWeight: '700' }}>#{tx.TransactionID}</td>
                              <td style={{ fontWeight: '600' }}>{formatAmt(tx.TransactionAmt)}</td>
                              <td><span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: '#fff' }}>{tx.ProductCD}</span></td>
                              <td style={{ textTransform: 'capitalize' }}>{tx.card4 || 'unknown'}</td>
                              <td style={{ textTransform: 'capitalize' }}>{tx.card6 || 'unknown'}</td>
                              <td>{tx.P_emaildomain || <span style={{ color: 'var(--text-muted)' }}>none</span>}</td>
                              <td>
                                <span style={{ fontWeight: '700', color: riskColor }}>
                                  {Math.round(riskScore * 100)}%
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${tx.isFraud ? 'fraud' : 'genuine'}`}>
                                  {tx.isFraud ? 'Fraud' : 'Genuine'}
                                </span>
                              </td>
                              <td>
                                <button className="btn-inspect" onClick={() => setSelectedTransaction(tx)}>
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                            No transaction records matched your search parameters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 1 && (
                  <div className="pagination">
                    <span>
                      Showing Page <strong>{tablePage}</strong> of <strong>{totalPages}</strong> ({filteredTransactions.length} records found)
                    </span>
                    <div className="pagination-buttons">
                      <button 
                        className="btn-pagination" 
                        disabled={tablePage === 1}
                        onClick={() => setTablePage(p => Math.max(p - 1, 1))}
                      >
                        <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} />
                        <span>Prev</span>
                      </button>
                      <button 
                        className="btn-pagination" 
                        disabled={tablePage === totalPages}
                        onClick={() => setTablePage(p => Math.min(p + 1, totalPages))}
                      >
                        <span>Next</span>
                        <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* ========================================================================= */}
            {/* TABS 3: FRAUD PREDICTOR */}
            {/* ========================================================================= */}
            {activeTab === 'predictor' && (
              <div className="predictor-layout">
                
                {/* Form Side */}
                <div className="card">
                  <h3 className="chart-title">
                    <Cpu size={18} color="var(--primary)" />
                    <span>Transaction Attributes Feed</span>
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    Manually enter the transaction properties to run an instantaneous XGBoost model inference.
                  </p>
                  
                  <form onSubmit={handlePredictSubmit} className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Transaction Amount ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-input"
                        required
                        value={predictorInput.TransactionAmt}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, TransactionAmt: e.target.value }))}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Product Code (ProductCD)</label>
                      <select 
                        className="form-select"
                        value={predictorInput.ProductCD}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, ProductCD: e.target.value }))}
                      >
                        <option value="W">W (Work)</option>
                        <option value="H">H (Home)</option>
                        <option value="C">C (Commercial)</option>
                        <option value="S">S (Subscription)</option>
                        <option value="R">R (Retail)</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Card Brand (card4)</label>
                      <select 
                        className="form-select"
                        value={predictorInput.card4}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, card4: e.target.value }))}
                      >
                        <option value="visa">Visa</option>
                        <option value="mastercard">Mastercard</option>
                        <option value="american express">American Express</option>
                        <option value="discover">Discover</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Card Type (card6)</label>
                      <select 
                        className="form-select"
                        value={predictorInput.card6}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, card6: e.target.value }))}
                      >
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Purchaser Email Domain</label>
                      <select 
                        className="form-select"
                        value={predictorInput.P_emaildomain}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, P_emaildomain: e.target.value }))}
                      >
                        <option value="gmail.com">gmail.com</option>
                        <option value="yahoo.com">yahoo.com</option>
                        <option value="hotmail.com">hotmail.com</option>
                        <option value="outlook.com">outlook.com</option>
                        <option value="anonymous.com">anonymous.com (Risky)</option>
                        <option value="aol.com">aol.com</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Device Type</label>
                      <select 
                        className="form-select"
                        value={predictorInput.DeviceType}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, DeviceType: e.target.value }))}
                      >
                        <option value="desktop">Desktop</option>
                        <option value="mobile">Mobile</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Device OS Info</label>
                      <select 
                        className="form-select"
                        value={predictorInput.DeviceInfo}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, DeviceInfo: e.target.value }))}
                      >
                        <option value="Windows">Windows</option>
                        <option value="iOS Device">iOS Device</option>
                        <option value="MacOS">Mac OS</option>
                        <option value="Samsung">Samsung Galaxy</option>
                        <option value="Trident">Internet Explorer / Trident (Legacy)</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Card Issuer ID (card1)</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={predictorInput.card1}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, card1: e.target.value }))}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Billing Zip Code (addr1)</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={predictorInput.addr1}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, addr1: e.target.value }))}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Card reuse count (C13)</label>
                      <input 
                        type="number" 
                        className="form-input"
                        value={predictorInput.C13}
                        onChange={(e) => setPredictorInput(prev => ({ ...prev, C13: e.target.value }))}
                      />
                    </div>
                    
                    <button type="submit" className="btn-submit" disabled={predictorLoading}>
                      {predictorLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <RefreshCw className="spinner" size={16} />
                          <span>Computing probability vector...</span>
                        </span>
                      ) : (
                        <span>Run Model Prediction</span>
                      )}
                    </button>
                  </form>
                </div>
                
                {/* Result Side */}
                <div className="card result-card">
                  {predictorResult ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Inference Verdict</h4>
                      
                      {/* Gauge Indicator */}
                      <div className="dial-container">
                        <svg className="dial-svg" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" className="dial-bg" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            className="dial-progress"
                            stroke={
                              predictorResult.risk_level === 'High' 
                                ? 'var(--danger)' 
                                : (predictorResult.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)')
                            }
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - predictorResult.fraud_probability)}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div className="dial-text">
                          <span className="dial-percent">{Math.round(predictorResult.fraud_probability * 100)}%</span>
                          <span className="dial-label">Risk score</span>
                        </div>
                      </div>
                      
                      {/* Decision status badge */}
                      <div className={`decision-box ${
                        predictorResult.risk_level === 'High' 
                          ? 'DECLINED' 
                          : (predictorResult.risk_level === 'Medium' ? 'REVIEW' : 'APPROVED')
                      }`}>
                        {predictorResult.risk_level === 'High' && <AlertTriangle size={18} />}
                        {predictorResult.risk_level === 'Medium' && <Info size={18} />}
                        {predictorResult.risk_level === 'Low' && <CheckCircle size={18} />}
                        
                        <span>
                          {predictorResult.risk_level === 'High' && 'DECLINED (SUSPECTED FRAUD)'}
                          {predictorResult.risk_level === 'Medium' && 'FLAGGED FOR MANUAL REVIEW'}
                          {predictorResult.risk_level === 'Low' && 'TRANSACTION APPROVED'}
                        </span>
                      </div>
                      
                      <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px', width: '100%', textAlign: 'left' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>
                          Model threshold set to: <strong>{(predictorResult.threshold_used).toFixed(4)}</strong>
                        </p>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Amount:</span>
                            <span className="detail-value">{formatAmt(predictorResult.transaction_details.TransactionAmt)}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Product Code:</span>
                            <span className="detail-value">{predictorResult.transaction_details.ProductCD}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Payment Brand:</span>
                            <span className="detail-value" style={{ textTransform: 'capitalize' }}>{predictorResult.transaction_details.card4}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Card Type:</span>
                            <span className="detail-value" style={{ textTransform: 'capitalize' }}>{predictorResult.transaction_details.card6}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="result-placeholder">
                      <Cpu size={48} style={{ opacity: 0.3 }} />
                      <p>Await transaction submit to compute probability vectors.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* ========================================================================= */}
            {/* TABS 4: MODEL RETRAINING / TUNING */}
            {/* ========================================================================= */}
            {activeTab === 'training' && (
              <div className="training-layout">
                
                {/* Calibration Panel */}
                <div className="card">
                  <h3 className="chart-title">
                    <Sliders size={18} color="var(--primary)" />
                    <span>Model Retraining Controls</span>
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                    Re-run the full training pipeline asynchronously. This reads datasets from disk, merges transaction and identity features, applies <strong>SMOTE</strong> upsampling to address class imbalance, and fits a new <strong>XGBoost</strong> model.
                  </p>
                  
                  {retrainToast && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: retrainToast.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                      color: retrainToast.type === 'success' ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${retrainToast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}`,
                      marginBottom: '20px',
                      fontSize: '14px'
                    }}>
                      {retrainToast.text}
                    </div>
                  )}
                  
                  <div className="retrain-control">
                    <div className="form-group">
                      <label className="form-label">Training Set Sample Size</label>
                      <select 
                        className="filter-select" 
                        style={{ width: '100%' }}
                        value={retrainRecords}
                        onChange={(e) => setRetrainRecords(parseInt(e.target.value))}
                        disabled={retraining}
                      >
                        <option value="5000">5,000 transactions (Fastest)</option>
                        <option value="10000">10,000 transactions (Balanced / Default)</option>
                        <option value="20000">20,000 transactions (Highest accuracy, takes ~5s)</option>
                      </select>
                    </div>
                    
                    <button 
                      className="retrain-btn" 
                      onClick={handleRetrain} 
                      disabled={retraining}
                    >
                      {retraining ? (
                        <>
                          <RefreshCw className="spinner" size={18} />
                          <span>Generating SMOTE synthetic samples & training XGBoost...</span>
                        </>
                      ) : (
                        <>
                          <Play size={18} />
                          <span>Retrain Model Now</span>
                        </>
                      )}
                    </button>
                    
                    <div style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', marginTop: '10px' }}>
                      <Info size={14} style={{ flexShrink: 0 }} />
                      <span>Note: During retraining, class frequencies are automatically balanced to 50/50 using SMOTE (Synthetic Minority Over-sampling Technique) in the training split. Validation split is kept imbalanced to ensure unbiased reporting.</span>
                    </div>
                  </div>
                </div>
                
                {/* Metrics / Confusion Matrix */}
                <div className="card">
                  <h3 className="chart-title">
                    <Activity size={18} color="var(--secondary)" />
                    <span>Evaluation Metrics Summary</span>
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '12px', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Precision (Fraud)</span>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {(metrics.precision * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recall (Fraud)</span>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {(metrics.recall * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>F1-Score</span>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {(metrics.f1_score * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ padding: '12px', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>F1 Max Threshold</span>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                        {(metrics.best_threshold).toFixed(4)}
                      </div>
                    </div>
                  </div>
                  
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Validation Confusion Matrix
                  </h4>
                  
                  {metrics.confusion_matrix ? (
                    <div className="matrix-grid">
                      {/* empty top left corner */}
                      <div></div>
                      <div className="matrix-header-x">
                        <span>Pred Genuine (0)</span>
                        <span>Pred Fraud (1)</span>
                      </div>
                      
                      <div className="matrix-label-y">Actual</div>
                      
                      <div className="matrix-cell tn">
                        <span className="matrix-cell-val">{metrics.confusion_matrix[0][0]}</span>
                        <span className="matrix-cell-lbl">True Negative</span>
                      </div>
                      <div className="matrix-cell fp">
                        <span className="matrix-cell-val">{metrics.confusion_matrix[0][1]}</span>
                        <span className="matrix-cell-lbl">False Positive</span>
                      </div>
                      
                      <div></div> {/* row label spacing */}
                      
                      <div className="matrix-cell fn">
                        <span className="matrix-cell-val">{metrics.confusion_matrix[1][0]}</span>
                        <span className="matrix-cell-lbl">False Negative</span>
                      </div>
                      <div className="matrix-cell tp">
                        <span className="matrix-cell-val">{metrics.confusion_matrix[1][1]}</span>
                        <span className="matrix-cell-lbl">True Positive</span>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '10px' }}>Matrix unavailable</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* ========================================================================= */}
        {/* TRANSACTION INSPECTION SIDE DRAWER */}
        {/* ========================================================================= */}
        {selectedTransaction && (
          <div className="drawer-overlay" onClick={() => setSelectedTransaction(null)}>
            <div className="drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <h3 className="drawer-title">Inspect Record #{selectedTransaction.TransactionID}</h3>
                <button className="btn-close" onClick={() => setSelectedTransaction(null)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="drawer-section">
                <div className="drawer-section-title">Risk Assessment</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fraud Probability score:</span>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: selectedTransaction.isFraud ? 'var(--danger)' : 'var(--success)' }}>
                      {Math.round((selectedTransaction.predicted_fraud_prob || 0) * 100)}%
                    </div>
                  </div>
                  <span className={`badge ${selectedTransaction.isFraud ? 'fraud' : 'genuine'}`}>
                    {selectedTransaction.isFraud ? 'Fraud' : 'Genuine'}
                  </span>
                </div>
              </div>
              
              <div className="drawer-section">
                <div className="drawer-section-title">Core Transaction Properties</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Amount:</span>
                    <span className="detail-value">{formatAmt(selectedTransaction.TransactionAmt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Product Type (ProductCD):</span>
                    <span className="detail-value">{selectedTransaction.ProductCD}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Card Brand:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedTransaction.card4}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Card Category:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedTransaction.card6}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Issuer Code (card1):</span>
                    <span className="detail-value">{selectedTransaction.card1}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Billing Zip (addr1):</span>
                    <span className="detail-value">{selectedTransaction.addr1 || 'unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Purchaser Email:</span>
                    <span className="detail-value">{selectedTransaction.P_emaildomain || 'unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Recipient Email:</span>
                    <span className="detail-value">{selectedTransaction.R_emaildomain || 'unknown'}</span>
                  </div>
                </div>
              </div>
              
              <div className="drawer-section">
                <div className="drawer-section-title">Identity & Device Metadata</div>
                {selectedTransaction.DeviceType || selectedTransaction.id_31 ? (
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Device Type:</span>
                      <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedTransaction.DeviceType}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Browser Client:</span>
                      <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedTransaction.id_31}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                      <span className="detail-label">Device Info:</span>
                      <span className="detail-value">{selectedTransaction.DeviceInfo || 'unknown'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Identity IP Log (id_01):</span>
                      <span className="detail-value">{selectedTransaction.id_01 || 'unknown'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Identity Score (id_02):</span>
                      <span className="detail-value">{selectedTransaction.id_02 || 'unknown'}</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                    No identity linkage dataset was reported for this transaction ID (corresponds to missing cardholder records).
                  </p>
                )}
              </div>
              
              <div className="drawer-section">
                <div className="drawer-section-title">Vesta Engineering Indicators</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Card Usage Count (C13):</span>
                    <span className="detail-value">{selectedTransaction.C13}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Registration Age (D1):</span>
                    <span className="detail-value">{selectedTransaction.D1} days</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">V15 (Verification index):</span>
                    <span className="detail-value">{selectedTransaction.V15 !== null ? selectedTransaction.V15 : 'none'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">V300 (Fraud pattern count):</span>
                    <span className="detail-value">{selectedTransaction.V300 !== null ? selectedTransaction.V300 : 'none'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
