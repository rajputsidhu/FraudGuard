import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LiveMonitor from './pages/LiveMonitor';
import ModelStats from './pages/ModelStats';
import BatchUpload from './pages/BatchUpload';
import './styles/global.css';
import './styles/components.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live-monitor" element={<LiveMonitor />} />
        <Route path="/model-stats" element={<ModelStats />} />
        <Route path="/batch-upload" element={<BatchUpload />} />
      </Routes>
    </Router>
  );
}

export default App;



