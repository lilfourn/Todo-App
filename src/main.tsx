import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { supabase } from './lib/supabase'
import { validateDeepLinkUrl, validateStateToken, DeepLinkReasonCode } from './lib/security'
import ErrorBoundary from './components/ErrorBoundary'
import { logger, getUserFriendlyMessage, initErrorTracking } from './lib/logger'
import { checkForAppUpdates } from './lib/updater'

// Initialize error tracking for production if DSN is provided
if (import.meta.env.VITE_SENTRY_DSN) {
  initErrorTracking({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  });
}

function AppWrapper() {
  const { user, loading } = useAuth();
  const [passwordResetMode, setPasswordResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState('');

  useEffect(() => {
    // Set up deep link listener for email confirmation and password reset
    let unlistenFn: (() => void) | null = null;

    const setupDeepLink = async () => {
      try {
        const unlisten = await onOpenUrl((urls) => {
          if (!urls || urls.length === 0) return;

          const urlString = urls[0];
          
          // Validate deep link URL
          const validation = validateDeepLinkUrl(urlString);
          if (!validation.isValid) {
            // Log only the code in production, include details in development
            const logContext = import.meta.env.MODE === 'development' 
              ? { code: validation.code, details: validation.details }
              : { code: validation.code };
            logger.error(new Error('Deep link validation failed'), logContext);
            alert('Security Error: Invalid authentication link. Please request a new link.');
            return;
          }

          try {
            const urlObj = new URL(urlString);
            
            // MANDATORY: Extract and validate state token for all auth callbacks
            const state = urlObj.searchParams.get('state');
            if (!state) {
              logger.error(new Error('State token missing'), { code: DeepLinkReasonCode.MISSING_STATE_TOKEN });
              alert('Security Error: Invalid authentication request. Please request a new link.');
              return;
            }
            
            if (!validateStateToken(state)) {
              logger.error(new Error('State token validation failed'), { code: DeepLinkReasonCode.INVALID_STATE_TOKEN });
              alert('Security Error: Invalid or expired authentication request. Please request a new link.');
              return;
            }

            // Handle different auth callback types
            if (urlObj.host === 'auth' && urlObj.pathname === '/callback') {
              // Email confirmation callback
              const accessToken = urlObj.searchParams.get('access_token');
              const refreshToken = urlObj.searchParams.get('refresh_token');
              
              if (accessToken && refreshToken) {
                supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                }).then(({ error }) => {
                  if (error) {
                    logger.error(error, { context: 'email_confirmation_callback' });
                    alert(getUserFriendlyMessage(error));
                  }
                });
              }
            } else if (urlObj.host === 'auth' && urlObj.pathname === '/password-reset') {
              // Password reset callback - MUST have type=recovery
              const type = urlObj.searchParams.get('type');
              
              if (type !== 'recovery') {
                logger.error(new Error('Invalid type parameter for password reset'), { 
                  code: DeepLinkReasonCode.INVALID_TYPE_PARAM,
                  details: import.meta.env.MODE === 'development' ? `type=${type}` : undefined
                });
                alert('Security Error: Invalid password reset link. Please request a new link.');
                return;
              }
              
              const accessToken = urlObj.searchParams.get('access_token');
              const refreshToken = urlObj.searchParams.get('refresh_token');
              
              if (accessToken && refreshToken) {
                // Set session first
                supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                }).then(({ error }) => {
                  if (error) {
                    logger.error(error, { context: 'password_reset_callback' });
                    alert(getUserFriendlyMessage(error));
                  } else {
                    // Enter password reset mode
                    setPasswordResetMode(true);
                  }
                });
              }
            }
          } catch (error) {
            logger.error(error, { context: 'deep_link_parsing' });
            alert('Failed to process authentication link.');
          }
        });

        unlistenFn = unlisten;
      } catch (error) {
        logger.error(error, { context: 'deep_link_setup' });
      }
    };

    setupDeepLink();

    // Cleanup: unsubscribe from deep-link listener on unmount
    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  useEffect(() => {
    // Check for updates on app startup (silent if no update available)
    checkForAppUpdates(false);
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResetError('');

    if (newPassword.length < 6) {
      setPasswordResetError('Password must be at least 6 characters');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setPasswordResetError(getUserFriendlyMessage(error));
    } else {
      alert('Password updated successfully!');
      setPasswordResetMode(false);
      setNewPassword('');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  // Show password reset UI if in password reset mode
  if (passwordResetMode) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Reset Password</h2>
          <form onSubmit={handlePasswordReset}>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {passwordResetError && (
              <div style={{ color: '#e53e3e', marginBottom: '16px', fontSize: '14px' }}>
                {passwordResetError}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  return user ? <App /> : <Auth />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={(error, reset) => (
        <div style={{ 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a202c', marginBottom: '16px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '16px', color: '#4a5568', marginBottom: '24px', lineHeight: '1.5' }}>
              {getUserFriendlyMessage(error)}
            </p>
            <button
              onClick={reset}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => logger.error(error, { errorInfo })}
    >
      <AuthProvider>
        <AppWrapper />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
