import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, FileCheck, Menu, X } from 'lucide-react';

export const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <span className="badge badge-rejected" style={{ fontSize: '0.7rem' }}>ADMIN</span>;
      case 'reviewer':
        return <span className="badge badge-clarification" style={{ fontSize: '0.7rem' }}>REVIEWER</span>;
      default:
        return <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>EMPLOYEE</span>;
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn btn-secondary sidebar-toggle-btn"
          style={{ padding: '0.45rem', marginRight: '0.25rem', display: 'flex', alignItems: 'center' }}
          title={sidebarOpen ? "Collapse Navigation" : "Expand Navigation"}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div style={styles.logoIcon}>
          <FileCheck size={22} color="#fff" />
        </div>
        <div>
          <h2 style={styles.brandTitle}>PolicyReview AI</h2>
          <p style={styles.brandSubtitle}>Expense Audit & Compliance Engine</p>
        </div>
      </div>


      <div style={styles.userSection}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            <User size={18} color="#94a3b8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={styles.userEmail}>{user?.email}</span>
              {getRoleBadge(user?.role)}
            </div>
          </div>
        </div>

        <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </header>
  );
};

const styles = {
  header: {
    height: '70px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },
  brandTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#f8fafc',
    lineHeight: 1.2,
  },
  brandSubtitle: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.4rem 0.8rem',
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEmail: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#f1f5f9',
  },
};
