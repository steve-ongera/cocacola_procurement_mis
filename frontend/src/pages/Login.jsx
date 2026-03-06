// pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../context/AppContext';

export default function Login() {
  const { login }   = useAuth();
  const toast       = useToast();
  const navigate    = useNavigate();
  const [form, setForm]       = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Signed in successfully');
      navigate('/');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--black)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ marginBottom: '36px', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', background: 'var(--white)',
            display: 'grid', placeItems: 'center',
            fontSize: '16px', fontWeight: 800, letterSpacing: '-1px',
            margin: '0 auto 16px',
          }}>PP</div>
          <h1 style={{ color: 'var(--white)', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            ProcurePro
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '12px', marginTop: '4px' }}>
            Procurement Management System
          </p>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--gray-900)', border: '1px solid var(--gray-800)', padding: '32px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--gray-400)' }}>Username</label>
              <input
                className="form-control"
                style={{ background: 'var(--gray-800)', border: '1px solid var(--gray-700)', color: 'var(--white)' }}
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter username"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--gray-400)' }}>Password</label>
              <input
                className="form-control"
                style={{ background: 'var(--gray-800)', border: '1px solid var(--gray-700)', color: 'var(--white)' }}
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-light)', color: 'var(--danger)',
                padding: '10px 12px', fontSize: '12px', marginBottom: '16px',
                border: '1px solid #f0c0bb',
              }}>
                <i className="bi bi-exclamation-circle" style={{ marginRight: '6px' }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', padding: '11px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading && <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--white)', borderColor: 'rgba(255,255,255,0.3)' }} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ color: 'var(--gray-600)', fontSize: '11px', textAlign: 'center', marginTop: '24px' }}>
          © {new Date().getFullYear()} ProcurePro · All rights reserved
        </p>
      </div>
    </div>
  );
}