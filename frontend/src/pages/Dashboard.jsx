import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import { ClaimStatusBadge } from '../components/ClaimStatusBadge';
import { useAuth } from '../context/AuthContext';
import { FileText, DollarSign, CheckCircle2, Clock, Filter, Eye, RefreshCw, Zap } from 'lucide-react';

export const Dashboard = () => {
  const [claims, setClaims] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchClaimant, setSearchClaimant] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [claimsRes, totalsRes] = await Promise.all([
        claimsAPI.getClaims({ status: filterStatus || undefined, claimant: searchClaimant || undefined }),
        claimsAPI.getTotals(),
      ]);
      setClaims(claimsRes.data);
      setTotals(totalsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Expense Claims Dashboard</h1>
          <p style={styles.subtitle}>Overview of employee claims, deterministic checks & AI policy audits</p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-secondary">
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* Analytics Summary Grid */}
      <div style={styles.summaryGrid}>
        <div className="glass-panel" style={styles.summaryCard}>
          <div style={{ ...styles.iconBox, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={styles.cardValue}>{totals?.total_claims_count || 0}</div>
            <div style={styles.cardLabel}>Total Submitted Claims</div>
          </div>
        </div>

        <div className="glass-panel" style={styles.summaryCard}>
          <div style={{ ...styles.iconBox, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={styles.cardValue}>{totals?.claims_by_status?.PENDING_REVIEW || 0}</div>
            <div style={styles.cardLabel}>Pending Review</div>
          </div>
        </div>

        <div className="glass-panel" style={styles.summaryCard}>
          <div style={{ ...styles.iconBox, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={styles.cardValue}>{totals?.claims_by_status?.APPROVED || 0}</div>
            <div style={styles.cardLabel}>Approved Claims</div>
          </div>
        </div>

        <div className="glass-panel" style={styles.summaryCard}>
          <div style={{ ...styles.iconBox, background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={styles.cardValue}>
              ${totals?.total_amount_by_currency?.USD?.toFixed(2) || '0.00'}
            </div>
            <div style={styles.cardLabel}>Total Expenses (USD)</div>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="glass-panel" style={styles.filterBar}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by claimant name..."
            value={searchClaimant}
            onChange={(e) => setSearchClaimant(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <button type="submit" className="btn btn-secondary">Filter</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#94a3b8" />
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLARIFICATION_REQUESTED">Clarification Requested</option>
          </select>
        </div>
      </div>

      {/* Claims Data Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            Loading claim records...
          </div>
        ) : claims.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No expense claims found matching your filter.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Claimant</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Receipt</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>AI Audited</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id} style={styles.tr}>
                  <td style={styles.td}>#{claim.id}</td>
                  <td style={styles.tdName}>{claim.claimant}</td>
                  <td style={styles.td}>{claim.date}</td>
                  <td style={styles.td}>{claim.category}</td>
                  <td style={styles.tdAmount}>
                    {claim.currency} ${claim.amount.toFixed(2)}
                  </td>
                  <td style={styles.td}>
                    {claim.receipt_available ? (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Yes</span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>No</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <ClaimStatusBadge status={claim.status} />
                  </td>
                  <td style={styles.td}>
                    {claim.is_evaluated ? (
                      <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                        <Zap size={11} /> EVALUATED
                      </span>
                    ) : (
                      <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                        UNTESTED
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => navigate(`/claims/${claim.id}`)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={14} /> Review Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#f8fafc',
    lineHeight: 1.1,
  },
  cardLabel: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    marginTop: '0.2rem',
  },
  filterBar: {
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    background: 'rgba(15, 23, 42, 0.9)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  th: {
    padding: '0.9rem 1.25rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background 0.15s ease',
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.88rem',
    color: '#cbd5e1',
  },
  tdName: {
    padding: '1rem 1.25rem',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#f8fafc',
  },
  tdAmount: {
    padding: '1rem 1.25rem',
    fontSize: '0.88rem',
    fontWeight: 700,
    color: '#38bdf8',
  },
};
