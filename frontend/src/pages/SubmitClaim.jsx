import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Layers, Send, Check, Trash2, ArrowLeft } from 'lucide-react';

export const SubmitClaim = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Single Claim State
  const [singleClaim, setSingleClaim] = useState({
    claimant: user?.name || user?.email || '',
    date: new Date().toISOString().split('T')[0],
    category: 'Meals',
    amount: '',
    currency: 'USD',
    description: '',
    receipt_available: true,
  });

  // Batch Claim State
  const [batchClaims, setBatchClaims] = useState([
    {
      claimant: user?.name || user?.email || '',
      date: new Date().toISOString().split('T')[0],
      category: 'Travel',
      amount: '',
      currency: 'USD',
      description: '',
      receipt_available: true,
    },
  ]);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...singleClaim,
        amount: parseFloat(singleClaim.amount),
      };
      await claimsAPI.createClaim(payload);
      setMessage({ type: 'success', text: 'Expense claim submitted successfully!' });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to submit claim.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const formattedBatch = batchClaims.map((c) => ({
        ...c,
        amount: parseFloat(c.amount),
      }));
      await claimsAPI.createBatchClaims(formattedBatch);
      setMessage({ type: 'success', text: 'Batch claims submitted successfully!' });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to submit batch claims.' });
    } finally {
      setLoading(false);
    }
  };

  const addBatchRow = () => {
    setBatchClaims([
      ...batchClaims,
      {
        claimant: user?.name || user?.email || '',
        date: new Date().toISOString().split('T')[0],
        category: 'Meals',
        amount: '',
        currency: 'USD',
        description: '',
        receipt_available: true,
      },
    ]);
  };

  const removeBatchRow = (index) => {
    if (batchClaims.length === 1) return;
    setBatchClaims(batchClaims.filter((_, i) => i !== index));
  };

  const updateBatchRow = (index, field, value) => {
    const updated = [...batchClaims];
    updated[index][field] = value;
    setBatchClaims(updated);
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ maxWidth: '1000px' }}>
      <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>Submit Expense Claim</h1>
        <p style={styles.subtitle}>Enter claim details for deterministic policy checks and AI evaluation</p>
      </div>

      {message && (
        <div
          style={{
            ...styles.alert,
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            color: message.type === 'success' ? '#34d399' : '#f87171',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div style={styles.tabContainer}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'single' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('single')}
        >
          <PlusCircle size={18} /> Single Claim
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'batch' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('batch')}
        >
          <Layers size={18} /> Batch Claims
        </button>
      </div>

      {activeTab === 'single' ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <form onSubmit={handleSingleSubmit}>
            <div style={styles.grid2}>
              <div className="form-group">
                <label className="form-label">Claimant Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={singleClaim.claimant}
                  onChange={(e) => setSingleClaim({ ...singleClaim, claimant: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expense Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={singleClaim.date}
                  onChange={(e) => setSingleClaim({ ...singleClaim, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={styles.grid3}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={singleClaim.category}
                  onChange={(e) => setSingleClaim({ ...singleClaim, category: e.target.value })}
                >
                  <option value="Meals">Meals</option>
                  <option value="Travel">Travel</option>
                  <option value="Software">Software</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Client Entertainment">Client Entertainment</option>
                  <option value="Unclassified">Unclassified / Ambiguous</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={singleClaim.amount}
                  onChange={(e) => setSingleClaim({ ...singleClaim, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
                  value={singleClaim.currency}
                  onChange={(e) => setSingleClaim({ ...singleClaim, currency: e.target.value })}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Purpose of Expense</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="Provide details about the transaction e.g., Regional sales trip dinner with prospective client..."
                value={singleClaim.description}
                onChange={(e) => setSingleClaim({ ...singleClaim, description: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="receiptCheck"
                checked={singleClaim.receipt_available}
                onChange={(e) => setSingleClaim({ ...singleClaim, receipt_available: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="receiptCheck" style={{ fontSize: '0.9rem', color: '#e2e8f0', cursor: 'pointer' }}>
                Receipt available for this claim
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              <Send size={18} /> {loading ? 'Submitting...' : 'Submit Expense Claim'}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <form onSubmit={handleBatchSubmit}>
            {batchClaims.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#818cf8' }}>
                    Claim Row #{index + 1}
                  </span>
                  {batchClaims.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBatchRow(index)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div style={styles.grid3}>
                  <div className="form-group">
                    <label className="form-label">Claimant</label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.claimant}
                      onChange={(e) => updateBatchRow(index, 'claimant', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={item.category}
                      onChange={(e) => updateBatchRow(index, 'category', e.target.value)}
                    >
                      <option value="Meals">Meals</option>
                      <option value="Travel">Travel</option>
                      <option value="Software">Software</option>
                      <option value="Office Supplies">Office Supplies</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={item.amount}
                      onChange={(e) => updateBatchRow(index, 'amount', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={item.description}
                    onChange={(e) => updateBatchRow(index, 'description', e.target.value)}
                    required
                  />
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={addBatchRow} className="btn btn-secondary">
                <PlusCircle size={16} /> Add Another Row
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                <Send size={18} /> {loading ? 'Submitting...' : 'Submit All Batch Claims'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.6rem',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: '#94a3b8',
  },
  alert: {
    padding: '0.85rem 1.25rem',
    borderRadius: '10px',
    border: '1px solid',
    marginBottom: '1.5rem',
    fontWeight: 500,
    fontSize: '0.9rem',
  },
  tabContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  tab: {
    padding: '0.75rem 1.25rem',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    background: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
    color: '#818cf8',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1.25rem',
  },
};
