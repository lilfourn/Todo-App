import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { signIn, signUp, remainingAuthAttempts } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Client-side validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Check rate limit before attempting
    const remaining = remainingAuthAttempts(email);
    setRemainingAttempts(remaining);
    
    if (remaining === 0) {
      setIsRateLimited(true);
      setError('Too many failed attempts. Please try again later.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error, message, needsEmailConfirmation } = await signUp(email, password);
        if (error) {
          // Check if rate limited
          if (message?.includes('Too many')) {
            setIsRateLimited(true);
          }
          // Use custom message if available, otherwise use error message
          setError(message || error.message);
          // Update remaining attempts after failed attempt
          setRemainingAttempts(remainingAuthAttempts(email));
        } else if (needsEmailConfirmation) {
          // Show success message for email confirmation
          setError(message || 'Check your email for the confirmation link.');
          // Clear rate limit state on success
          setIsRateLimited(false);
          setRemainingAttempts(null);
        }
      } else {
        const { error, message } = await signIn(email, password);
        if (error) {
          // Check if rate limited
          if (message?.includes('Too many')) {
            setIsRateLimited(true);
          }
          // Use custom message if available, otherwise use error message
          setError(message || error.message);
          // Update remaining attempts after failed attempt
          setRemainingAttempts(remainingAuthAttempts(email));
        } else {
          // Clear rate limit state on success
          setIsRateLimited(false);
          setRemainingAttempts(null);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Howdy</h1>
        <p className="auth-subtitle">
          {isSignUp ? 'Create your account' : 'Sign in to continue'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
            />
          </div>

          {error && (
            <div className={`auth-message ${error.includes('Check your email') ? 'success' : 'error'}`}>
              {error}
              {remainingAttempts !== null && remainingAttempts > 0 && remainingAttempts <= 2 && !isRateLimited && (
                <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
                  ⚠️ Warning: {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before temporary lockout
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isRateLimited}
            className="auth-button"
          >
            {isRateLimited ? 'Rate Limited' : loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setIsRateLimited(false);
            setRemainingAttempts(null);
          }}
          className="auth-toggle"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
};
