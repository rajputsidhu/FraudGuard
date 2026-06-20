import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

const Sidebar = ({ transactionData, updateField, analyseTransaction, resetForm, isLoading }) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const renderSlider = (field, label) => (
    <div className="input-group" key={field}>
      <label className="input-label">{label || field}</label>
      <div className="slider-container">
        <input
          type="range"
          min="-5"
          max="-5"
          step="0.1"
          value={transactionData[field]}
          onChange={(e) => updateField(field, e.target.value)}
          className="slider"
        />
        <span className="slider-value">{parseFloat(transactionData[field]).toFixed(1)}</span>
      </div>
    </div>
  );

  // Fix min/max attributes for standard range sliders
  const renderSliderCorrect = (field, label) => (
    <div className="input-group" key={field}>
      <label className="input-label">{label || field}</label>
      <div className="slider-container">
        <input
          type="range"
          min="-5"
          max="5"
          step="0.1"
          value={transactionData[field]}
          onChange={(e) => updateField(field, e.target.value)}
          className="slider"
        />
        <span className="slider-value">{parseFloat(transactionData[field]).toFixed(1)}</span>
      </div>
    </div>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <h2 className="sidebar-title">Transaction Details</h2>
        
        <div className="input-group">
          <label className="input-label">Amount ($)</label>
          <input
            type="number"
            min="0"
            max="25000"
            value={transactionData.Amount}
            onChange={(e) => updateField('Amount', e.target.value)}
            className="input-field"
            placeholder="0.00"
          />
        </div>
        
        <div className="input-group">
          <label className="input-label">Time (seconds)</label>
          <input
            type="number"
            min="0"
            max="172800"
            value={transactionData.Time}
            onChange={(e) => updateField('Time', e.target.value)}
            className="input-field"
            placeholder="0"
          />
        </div>

        <div className="sidebar-divider"></div>
        <h3 className="sidebar-section-title">PCA Features</h3>

        {/* V1 to V14 */}
        {[...Array(14)].map((_, i) => renderSliderCorrect(`V${i + 1}`))}

        {/* Advanced Features Accordion */}
        <div className="sidebar-accordion">
          <button 
            className="sidebar-accordion-header" 
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            <span>Advanced Features (V15-V28)</span>
            {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {advancedOpen && (
            <div className="sidebar-accordion-content">
              {[...Array(14)].map((_, i) => renderSliderCorrect(`V${i + 15}`))}
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <button 
          className="btn-primary" 
          onClick={analyseTransaction}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="spinner" size={18} /> : null}
          {isLoading ? 'Analysing...' : 'Analyse Transaction'}
        </button>
        <button 
          className="btn-secondary" 
          onClick={resetForm}
          style={{ marginTop: '8px' }}
        >
          Reset to Default
        </button>
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  transactionData: PropTypes.object.isRequired,
  updateField: PropTypes.func.isRequired,
  analyseTransaction: PropTypes.func.isRequired,
  resetForm: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired
};

export default Sidebar;
