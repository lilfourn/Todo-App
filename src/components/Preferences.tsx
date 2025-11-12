import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateStateToken, storeStateToken } from '../lib/security';
import { logger, getUserFriendlyMessage } from '../lib/logger';
import './Preferences.css';

interface PreferencesProps {
  onClose: () => void;
}

const Preferences: React.FC<PreferencesProps> = ({ onClose }) => {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [font, setFont] = useState<'system' | 'mono' | 'serif'>('system');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resetPasswordSent, setResetPasswordSent] = useState(false);

  // Load user preferences from database on mount
  React.useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme, font')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine for new users
          logger.error(error, { context: 'load_preferences_component' });
          return;
        }

        if (data) {
          if (data.theme) {
            setTheme(data.theme as 'light' | 'dark');
            document.documentElement.setAttribute('data-theme', data.theme);
          }
          if (data.font) {
            setFont(data.font as 'system' | 'mono' | 'serif');
            document.body.setAttribute('data-font', data.font);
          }
        }
      } catch (error) {
        logger.error(error, { context: 'load_preferences_failed' });
      }
    };

    loadPreferences();
  }, [user]);

  const handleResetPassword = async () => {
    try {
      // Generate and store CSRF state token
      const stateToken = generateStateToken();
      storeStateToken(stateToken);

      // Use Tauri deep link protocol for password reset redirect
      // NOTE: This URL must be added to Supabase Dashboard > Authentication > URL Configuration > Additional Redirect URLs
      const { error } = await supabase.auth.resetPasswordForEmail(
        user?.email || '',
        {
          redirectTo: `todoapp://auth/password-reset?state=${stateToken}`,
        }
      );
      
      if (error) {
        logger.error(error, { context: 'reset_password_email' });
        throw error;
      }
      
      setResetPasswordSent(true);
      setTimeout(() => setResetPasswordSent(false), 5000);
    } catch (error) {
      logger.error(error, { context: 'reset_password_email_catch' });
      alert(getUserFriendlyMessage(error));
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    if (!user) return;

    try {
      // Delete all user's tasks first
      await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id);

      // Sign out (account deletion would need backend implementation)
      await signOut();
      onClose();
    } catch (error) {
      logger.error(error, { context: 'delete_account' });
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    // Apply theme to root element
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save to database
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: newTheme,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      logger.error(error, { context: 'save_theme' });
    }
  };

  const handleFontChange = async (newFont: 'system' | 'mono' | 'serif') => {
    setFont(newFont);
    // Apply font to body
    document.body.setAttribute('data-font', newFont);
    
    // Save to database
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          font: newFont,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      logger.error(error, { context: 'save_font' });
    }
  };

  return (
    <div className="preferences-overlay" onClick={onClose}>
      <div className="preferences-panel" onClick={(e) => e.stopPropagation()}>
        <div className="preferences-header">
          <h2 className="preferences-title">Preferences</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="preferences-content">
          {/* Appearance Section */}
          <section className="preferences-section">
            <h3 className="section-title">Appearance</h3>
            
            <div className="preference-item">
              <label className="preference-label">Theme</label>
              <div className="theme-selector">
                <button
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.66 15.66L14.24 14.24M5.76 5.76L4.34 4.34M15.66 4.34L14.24 5.76M5.76 14.24L4.34 15.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Light</span>
                </button>
                <button
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M17.66 11.2C16.78 14.79 13.54 17.5 9.66 17.5C5.17 17.5 1.5 13.83 1.5 9.34C1.5 5.46 4.21 2.22 7.8 1.34C7.13 2.45 6.75 3.75 6.75 5.15C6.75 9.08 9.92 12.25 13.85 12.25C15.25 12.25 16.55 11.87 17.66 11.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div className="preference-item">
              <label className="preference-label">Font Family</label>
              <div className="font-selector">
                <button
                  className={`font-option ${font === 'system' ? 'active' : ''}`}
                  onClick={() => handleFontChange('system')}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                >
                  System
                </button>
                <button
                  className={`font-option ${font === 'mono' ? 'active' : ''}`}
                  onClick={() => handleFontChange('mono')}
                  style={{ fontFamily: '"Monaco", "Menlo", monospace' }}
                >
                  Monospace
                </button>
                <button
                  className={`font-option ${font === 'serif' ? 'active' : ''}`}
                  onClick={() => handleFontChange('serif')}
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  Serif
                </button>
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section className="preferences-section">
            <h3 className="section-title">Account</h3>
            
            <div className="preference-item">
              <label className="preference-label">Email</label>
              <div className="account-email">{user?.email}</div>
            </div>

            <div className="preference-item">
              <button className="preference-button" onClick={handleResetPassword}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 8V6C15 3.79 13.21 2 11 2H9C6.79 2 5 3.79 5 6V8M6 18H14C15.1 18 16 17.1 16 16V10C16 8.9 15.1 8 14 8H6C4.9 8 4 8.9 4 10V16C4 17.1 4.9 18 6 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="10" cy="13" r="1.5" fill="currentColor"/>
                </svg>
                Reset Password
              </button>
              {resetPasswordSent && (
                <div className="success-message">
                  Password reset email sent! Click the link in your email to reset your password.
                </div>
              )}
            </div>

            <div className="preference-item">
              <button className="preference-button" onClick={signOut}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M13 16L17 12M17 12L13 8M17 12H7M7 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign Out
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="preferences-section danger-section">
            <h3 className="section-title danger-title">Danger Zone</h3>
            
            <div className="preference-item">
              <button 
                className={`preference-button danger-button ${showDeleteConfirm ? 'confirm' : ''}`}
                onClick={handleDeleteAccount}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5H17M8 3H12M8 9V15M12 9V15M6 5V16C6 17.1 6.9 18 8 18H12C13.1 18 14 17.1 14 16V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {showDeleteConfirm ? 'Click Again to Confirm Delete' : 'Delete Account'}
              </button>
              {showDeleteConfirm && (
                <div className="warning-message">
                  This action cannot be undone. All your data will be permanently deleted.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
