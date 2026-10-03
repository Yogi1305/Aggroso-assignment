import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, PlusCircle, FileText, BookOpen, ShieldCheck } from 'lucide-react';

export const Sidebar = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const isReviewerOrAdmin = user?.role === 'reviewer' || user?.role === 'admin';

  return (
    <aside style={styles.sidebar}>
      <nav style={styles.nav}>
        <div style={styles.sectionHeader}>MAIN MENU</div>
        
        <NavLink
          to="/dashboard"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        <NavLink
          to="/submit"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          <PlusCircle size={18} /> Submit Claims
        </NavLink>

        <NavLink
          to="/policies"
          style={({ isActive }) => (isActive ? { ...styles.link, ...styles.activeLink } : styles.link)}
        >
          <BookOpen size={18} /> Expense Policy Rules
        </NavLink>

        {isReviewerOrAdmin && (
          <>
            <div style={{ ...styles.sectionHeader, marginTop: '1.5rem' }}>AUDIT & MANAGEMENT</div>
            <div style={styles.reviewerBadge}>
              <ShieldCheck size={14} /> Reviewer Mode Active
            </div>
          </>
        )}
      </nav>

      <div style={styles.footer}>
        <p style={styles.footerText}>Policy Engine v1.0.0</p>
        <p style={styles.footerSub}>Groq LLM + Fast Validation</p>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '240px',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(12px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '1.5rem 1rem',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  sectionHeader: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.08em',
    padding: '0.5rem 0.75rem',
    marginBottom: '0.2rem',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.7rem 0.9rem',
    borderRadius: '8px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  activeLink: {
    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
    color: '#818cf8',
    borderLeft: '3px solid #6366f1',
    fontWeight: 600,
  },
  reviewerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '6px',
    color: '#60a5fa',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  footer: {
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#94a3b8',
  },
  footerSub: {
    fontSize: '0.7rem',
    color: '#64748b',
  },
};
