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
    <aside style={styles.sidebar}>
      <div style={styles.sidebarContent}>
        <h2 style={styles.title}>Transaction Details</h2>
        
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

        <div style={styles.divider}></div>
        <h3 style={styles.sectionTitle}>PCA Features</h3>

        {/* V1 to V14 */}
        {[...Array(14)].map((_, i) => renderSlider(`V${i + 1}`))}

        {/* Advanced Features Accordion */}
        <div style={styles.accordion}>
          <button 
            style={styles.accordionHeader} 
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            <span>Advanced Features (V15-V28)</span>
            {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {advancedOpen && (
            <div style={styles.accordionContent}>
              {[...Array(14)].map((_, i) => renderSlider(`V${i + 15}`))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.sidebarFooter}>
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

const styles = {
  sidebar: {
    position: 'fixed',
    top: '60px',
    left: 0,
    width: '300px',
    height: 'calc(100vh - 60px)',
    backgroundColor: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 900,
  },
  sidebarContent: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '24px',
    paddingBottom: '0',
  },
  title: {
    fontSize: '20px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '24px 0',
  },
  accordion: {
    marginTop: '16px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  accordionHeader: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'var(--bg-page)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  accordionContent: {
    padding: '16px',
    backgroundColor: 'var(--bg-card)',
    borderTop: '1px solid var(--border)',
  },
  sidebarFooter: {
    padding: '24px',
    borderTop: '1px solid var(--border)',
    backgroundColor: 'var(--bg-card)',
  }
};

export default Sidebar;
