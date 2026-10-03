import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { ShieldAlert, UserCheck, Check, X, Clock, Send } from 'lucide-react';

export const RoleRequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // User upgrade request form state
  const [requestedRole, setRequestedRole] = useState('reviewer');
  const [reason, setReason] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchRequests = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await authAPI.getRoleRequests();
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch role requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin]);

  const handleUserSubmitRequest = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authAPI.requestRoleUpgrade({
        requested_role: requestedRole,
        reason,
      });
      setRequestSubmitted(true);
      setReason('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit role upgrade request.');
    }
  };

  const handleAdminDecision = async (id, action) => {
    try {
      await authAPI.decideRoleRequest(id, action);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record decision.');
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', color: '#f8fafc' }}>Role & Authorization Management</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
          {isAdmin ? 'Review and approve/reject user requests for elevated roles' : 'Request elevation to Reviewer or Admin status'}
        </p>
      </div>

      {/* User Request Section (for Employees / Reviewers who want upgrade) */}
      {!isAdmin && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', marginBottom: '2rem' }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} color="#818cf8" /> Request Role Upgrade
          </h2>

          {requestSubmitted && (
            <div className="badge badge-approved" style={{ display: 'block', padding: '0.85rem', marginBottom: '1.25rem' }}>
              Your role upgrade request has been submitted to system administrators!
            </div>
          )}

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleUserSubmitRequest}>
            <div className="form-group">
              <label className="form-label">Desired Role</label>
              <select
                className="form-select"
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
              >
                <option value="reviewer">Reviewer (Approve / Reject Claims & Overrides)</option>
                <option value="admin">Administrator (Full System & User Control)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Business Justification</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="Explain why you need elevated access..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <Send size={16} /> Submit Upgrade Request
            </button>
          </form>
        </div>
      )}

      {/* Admin Approval Section (Only visible to Admin) */}
      {isAdmin && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} color="#c084fc" /> Pending & Historical Role Upgrade Requests
          </h2>

          {loading ? (
            <div style={{ color: '#94a3b8' }}>Loading requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No role upgrade requests found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                      <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{r.user_email}</strong>
                      <span className="badge badge-review" style={{ textTransform: 'uppercase' }}>
                        Requested: {r.requested_role}
                      </span>
                      <span
                        className={`badge ${
                          r.status === 'APPROVED'
                            ? 'badge-approved'
                            : r.status === 'REJECTED'
                            ? 'badge-rejected'
                            : 'badge-clarification'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.reason && (
                      <p style={{ color: '#cbd5e1', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        "{r.reason}"
                      </p>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Submitted on {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>

                  {r.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleAdminDecision(r.id, 'APPROVE')}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                      >
                        <Check size={14} /> Approve Upgrade
                      </button>
                      <button
                        onClick={() => handleAdminDecision(r.id, 'REJECT')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', borderColor: '#f87171', color: '#f87171' }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleRequestsPage;
