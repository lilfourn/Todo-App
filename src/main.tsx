import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Auth } from './components/Auth'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { supabase } from './lib/supabase'

function AppWrapper() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Set up deep link listener for email confirmation
    const setupDeepLink = async () => {
      try {
        const unlisten = await onOpenUrl((urls) => {
          console.log('Deep link received:', urls);
          
          if (urls && urls.length > 0 && urls[0].includes('auth/callback')) {
            const url = urls[0];
            console.log('Processing auth callback:', url);
            
            // Extract tokens from URL
            const urlObj = new URL(url);
            const accessToken = urlObj.searchParams.get('access_token');
            const refreshToken = urlObj.searchParams.get('refresh_token');
            
            if (accessToken && refreshToken) {
              // Set the session in Supabase
              supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              }).then(({ data, error }) => {
                if (error) {
                  console.error('Error setting session:', error);
                } else {
                  console.log('Session set successfully:', data);
                }
              });
            }
          }
        });

        return unlisten;
      } catch (error) {
        console.error('Error setting up deep link:', error);
      }
    };

    setupDeepLink();
  }, []);

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

  return user ? <App /> : <Auth />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  </StrictMode>,
)
