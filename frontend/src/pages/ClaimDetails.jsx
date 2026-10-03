import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import { ClaimStatusBadge } from '../components/ClaimStatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  BookOpen,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  MessageSquare
} from 'lucide-react';

export const ClaimDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Review Decision State
  const [action, setAction] = useState('APPROVE');
  const [reason, setReason] = useState('');
  const [newCategory, setNewCategory] = useState('Meals');

  const fetchClaimDetails = async () => {
    setLoading(true);
    try {
      const res = await claimsAPI.getClaimById(id);
      setClaim(res.data);
    } catch (err) {
      console.error('Failed to fetch claim details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimDetails();
  }, [id]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await claimsAPI.evaluateClaim(id);
      await fetchClaimDetails();
    } catch (err) {
      alert(err.response?.data?.detail || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleRecordDecision = async (e) => {
    e.preventDefault();
    if (user?.role !== 'reviewer' && user?.role !== 'admin') {
      alert('Only Reviewers or Admins can record decision actions.');
      return;
    }

    setSubmittingDecision(true);
    try {
      await claimsAPI.recordDecision(id, {
        action,
        reviewer: user?.name || user?.email || 'Reviewer',
        reason: reason || undefined,
        new_category: action === 'OVERRIDE_CLASSIFICATION' ? newCategory : undefined,
      });
      await fetchClaimDetails();
      setReason('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Decision submission failed.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
        Loading evaluation audit record...
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="page-wrapper" style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Claim Not Found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const valRes = claim.validation_results;
  const isReviewerOrAdmin = user?.role === 'reviewer' || user?.role === 'admin';

  return (
    <div className="page-wrapper animate-fade-in">
      <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Claim Header Overview */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: '1.6rem', color: '#f8fafc' }}>Expense Claim #{claim.id}</h1>
              <ClaimStatusBadge status={claim.status} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Submitted by <strong style={{ color: '#f1f5f9' }}>{claim.claimant}</strong> on {claim.date}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#38bdf8' }}>
              {claim.currency} ${claim.amount.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Category: {claim.category}</div>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
            Description
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.5 }}>{claim.description}</p>
        </div>
      </div>

      {/* Audit Split Screen: Left = Deterministic Checks, Right = AI Reasoning */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Left Column: Deterministic Checks */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', color: '#818cf8' }}>
            <ShieldCheck size={20} />
            <h2 style={{ fontSize: '1.2rem', color: '#f8fafc' }}>Deterministic Validation Checks</h2>
          </div>

          {valRes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={styles.checkRow}>
                <div>
                  <div style={styles.checkTitle}>Duplicate Claim Check</div>
                  <div style={styles.checkSub}>Identifies matching amount, date & claimant</div>
                </div>
                {valRes.is_duplicate ? (
                  <span className="badge badge-rejected"><XCircle size={13} /> DUPLICATE DETECTED</span>
                ) : (
                  <span className="badge badge-approved"><CheckCircle2 size={13} /> UNIQUE</span>
                )}
              </div>

              <div style={styles.checkRow}>
                <div>
                  <div style={styles.checkTitle}>Receipt Requirement Check</div>
                  <div style={styles.checkSub}>
                    Receipt Available: {claim.receipt_available ? 'Yes' : 'No'}
                  </div>
                </div>
                {valRes.missing_receipt ? (
                  <span className="badge badge-rejected"><XCircle size={13} /> RECEIPT MISSING</span>
                ) : (
                  <span className="badge badge-approved"><CheckCircle2 size={13} /> RECEIPT COMPLIANT</span>
                )}
              </div>

              <div style={styles.checkRow}>
                <div>
                  <div style={styles.checkTitle}>Category Limit Check</div>
                  <div style={styles.checkSub}>
                    Configured Policy Limit:{' '}
                    {valRes.category_limit_amount ? `$${valRes.category_limit_amount}` : 'Unlimited'}
                  </div>
                </div>
                {valRes.exceeds_category_limit ? (
                  <span className="badge badge-rejected"><XCircle size={13} /> EXCEEDS LIMIT</span>
                ) : (
                  <span className="badge badge-approved"><CheckCircle2 size={13} /> WITHIN LIMIT</span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Evaluation not triggered yet. Click below to run audit checks.
            </div>
          )}
        </div>

        {/* Right Column: AI Policy Engine Reasoning */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#a855f7' }}>
              <Zap size={20} />
              <h2 style={{ fontSize: '1.2rem', color: '#f8fafc' }}>AI Policy Engine Analysis</h2>
            </div>
            {!claim.is_evaluated && (
              <button onClick={handleEvaluate} className="btn btn-primary" disabled={evaluating}>
                {evaluating ? 'Analyzing...' : 'Run AI Evaluation'}
              </button>
            )}
          </div>

          {valRes ? (
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <ClaimStatusBadge status={valRes.compliance_status} />
                {valRes.is_uncertain && (
                  <span className="badge badge-clarification">
                    <AlertTriangle size={13} /> UNCERTAIN CLASSIFICATION
                  </span>
                )}
                <span className="badge badge-review">
                  CONFIDENCE: {(valRes.confidence_score * 100).toFixed(0)}%
                </span>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a855f7', marginBottom: '0.3rem' }}>
                  AI Suggested Category
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                  {valRes.ai_suggested_category || 'Same as submitted'}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Compliance Explanation
                </div>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  {valRes.explanation}
                </p>
              </div>

              {valRes.policy_citation && (
                <div style={styles.citationBox}>
                  <BookOpen size={16} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8' }}>Policy Evidence Citation</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{valRes.policy_citation}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Click <strong>"Run AI Evaluation"</strong> to process claim against organizational policy rules.
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Action Panel (Visible to Reviewers / Admins) */}
      {isReviewerOrAdmin && (
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', color: '#f59e0b' }}>
            <ShieldCheck size={20} />
            <h2 style={{ fontSize: '1.2rem', color: '#f8fafc' }}>Reviewer Action & Override Control</h2>
          </div>

          <form onSubmit={handleRecordDecision}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Review Action</label>
                <select
                  className="form-select"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="APPROVE">Approve Claim</option>
                  <option value="REJECT">Reject Claim</option>
                  <option value="REQUEST_CLARIFICATION">Request Clarification</option>
                  <option value="OVERRIDE_CLASSIFICATION">Override AI Category</option>
                </select>
              </div>

              {action === 'OVERRIDE_CLASSIFICATION' && (
                <div className="form-group">
                  <label className="form-label">New Category Selection</label>
                  <select
                    className="form-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="Meals">Meals</option>
                    <option value="Travel">Travel</option>
                    <option value="Software">Software</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Client Entertainment">Client Entertainment</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Reviewer Notes / Reason (Required for Override)</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Enter justification or instructions for claimant..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-warning" disabled={submittingDecision}>
              <Send size={16} /> {submittingDecision ? 'Processing...' : 'Submit Review Decision'}
            </button>
          </form>
        </div>
      )}

      {/* Decision Audit Timeline */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '1.25rem' }}>Review Audit Timeline</h2>
        {claim.review_history?.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No manual review decisions recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {claim.review_history.map((history) => (
              <div key={history.id} style={styles.historyItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{history.reviewer}</span>
                    <ClaimStatusBadge status={history.action} />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {new Date(history.created_at).toLocaleString()}
                  </span>
                </div>
                {history.reason && (
                  <p style={{ color: '#cbd5e1', fontSize: '0.88rem', fontStyle: 'italic' }}>
                    "{history.reason}"
                  </p>
                )}
                {history.previous_category && history.new_category && (
                  <p style={{ color: '#38bdf8', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                    Category Override: {history.previous_category} → {history.new_category}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  checkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.85rem',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  checkTitle: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  checkSub: {
    fontSize: '0.78rem',
    color: '#94a3b8',
  },
  citationBox: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    padding: '0.85rem',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '8px',
  },
  historyItem: {
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
};
