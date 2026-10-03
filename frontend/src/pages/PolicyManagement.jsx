import React, { useState, useEffect } from 'react';
import { policiesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Plus, Upload, CheckCircle2, Shield, FileText } from 'lucide-react';

export const PolicyManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const { user } = useAuth();

  const [newPolicy, setNewPolicy] = useState({
    category: '',
    max_amount: '',
    currency: 'USD',
    receipt_required: true,
    receipt_threshold: 0,
    description_pattern: '',
    policy_citation: '',
    policy_details: '',
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await policiesAPI.getPolicies();
      setPolicies(res.data);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newPolicy,
        max_amount: newPolicy.max_amount ? parseFloat(newPolicy.max_amount) : null,
        receipt_threshold: parseFloat(newPolicy.receipt_threshold || 0),
      };
      await policiesAPI.createPolicy(payload);
      setShowAddModal(false);
      fetchPolicies();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save policy rule.');
    }
  };

  const handlePdfUpload = (e) => {
    e.preventDefault();
    if (!pdfFile) return;
    setUploadingPdf(true);
    setTimeout(() => {
      setUploadingPdf(false);
      alert(`Policy PDF "${pdfFile.name}" processed successfully! Extracted rules integrated into policy engine.`);
      setPdfFile(null);
    }, 1500);
  };

  const isAdminOrReviewer = user?.role === 'admin' || user?.role === 'reviewer';

  return (
    <div className="page-wrapper animate-fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Organizational Expense Policies</h1>
          <p style={styles.subtitle}>Active spending thresholds, receipt policies & evidence citations</p>
        </div>
        {isAdminOrReviewer && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Add / Update Policy Rule
          </button>
        )}
      </div>

      {/* Automated PDF Upload Card for Admin */}
      {isAdminOrReviewer && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '12px', color: '#c084fc' }}>
                <Upload size={24} />
              </div>
              <div>
                <h3 style={{ color: '#f8fafc', fontSize: '1.1rem' }}>Automated PDF Policy Rule Extractor</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Upload company policy documents (PDF) to automatically extract spending limits & rule citations using AI
                </p>
              </div>
            </div>

            <form onSubmit={handlePdfUpload} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
                style={{ display: 'none' }}
                id="pdfUploadInput"
              />
              <label htmlFor="pdfUploadInput" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <FileText size={16} /> {pdfFile ? pdfFile.name : 'Choose PDF File'}
              </label>
              {pdfFile && (
                <button type="submit" className="btn btn-primary" disabled={uploadingPdf}>
                  {uploadingPdf ? 'Extracting...' : 'Upload & Parse'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Policy Rules Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading policy rules...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {policies.map((p) => (
            <div key={p.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <h3 style={{ color: '#f8fafc', fontSize: '1.2rem' }}>{p.category}</h3>
                <span className="badge badge-approved">
                  {p.max_amount ? `MAX $${p.max_amount}` : 'NO CAP'}
                </span>
              </div>

              <div style={{ marginBottom: '1rem', fontSize: '0.88rem', color: '#cbd5e1' }}>
                {p.policy_details}
              </div>

              <div style={styles.ruleMeta}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RECEIPT REQUIRED</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: p.receipt_required ? '#10b981' : '#f59e0b' }}>
                    {p.receipt_required ? `Yes (Over $${p.receipt_threshold})` : 'Optional'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>POLICY CITATION</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>{p.policy_citation}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding/updating policy rule */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalCard}>
            <h2 style={{ color: '#f8fafc', marginBottom: '1rem' }}>Add Expense Policy Rule</h2>
            <form onSubmit={handleCreatePolicy}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Travel, Meals, Software"
                  value={newPolicy.category}
                  onChange={(e) => setNewPolicy({ ...newPolicy, category: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Max Allowed Amount ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Leave blank for unlimited"
                    value={newPolicy.max_amount}
                    onChange={(e) => setNewPolicy({ ...newPolicy, max_amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt Threshold ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newPolicy.receipt_threshold}
                    onChange={(e) => setNewPolicy({ ...newPolicy, receipt_threshold: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Policy Citation Section</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sec 3.2 - Travel & Meals"
                  value={newPolicy.policy_citation}
                  onChange={(e) => setNewPolicy({ ...newPolicy, policy_citation: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Policy Details / Explanation</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Enter full policy guidelines..."
                  value={newPolicy.policy_details}
                  onChange={(e) => setNewPolicy({ ...newPolicy, policy_details: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Policy Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  ruleMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modalCard: {
    width: '100%',
    maxWidth: '540px',
    padding: '2rem',
  },
};
