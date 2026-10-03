import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Shield, User, Lock, Mail, Phone, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('user');
  
  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      const res = await register(name, email, contact, role, password);
      if (res.success) navigate('/dashboard');
    } else {
      const res = await login(email, password);
      if (res.success) navigate('/dashboard');
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <FileCheck size={32} color="#fff" />
          </div>
          <h1 style={styles.title}>Expense Policy Review Assistant</h1>
          <p style={styles.subtitle}>
            {isRegistering ? 'Create your account to start managing claims' : 'Sign in to access your audit dashboard'}
          </p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={styles.inputWrapper}>
                  <User size={18} color="#64748b" style={styles.inputIcon} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alice Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number (Optional)</label>
                <div style={styles.inputWrapper}>
                  <Phone size={18} color="#64748b" style={styles.inputIcon} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +1 555-0199"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            </>
          )}


          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#64748b" style={styles.inputIcon} />
              <input
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#64748b" style={styles.inputIcon} />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Processing...' : isRegistering ? 'Register Account' : 'Sign In'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={styles.toggleFooter}>
          <span>{isRegistering ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            type="button"
            style={styles.toggleBtn}
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    padding: '2.5rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logo: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
  },
  title: {
    fontSize: '1.4rem',
    color: '#f8fafc',
    marginBottom: '0.4rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.85rem',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  roleOption: {
    padding: '0.6rem 0.4rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  roleOptionActive: {
    background: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366f1',
    color: '#818cf8',
  },
  submitBtn: {
    width: '100%',
    padding: '0.8rem',
    marginTop: '0.5rem',
  },
  toggleFooter: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
