import { useEffect, useState } from 'react';
import './LoadingScreen.css';

export function LoadingScreen() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Detect OS theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');

    // Listen for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className={`loading-screen ${theme}`}>
      <div className="loading-container">
        {/* App title skeleton */}
        <div className="loading-header">
          <div className="skeleton skeleton-title"></div>
        </div>

        {/* Progress bar skeleton */}
        <div className="loading-progress">
          <div className="skeleton skeleton-progress-bar"></div>
        </div>

        {/* Task items skeleton */}
        <div className="loading-tasks">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="loading-task-item" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="skeleton skeleton-checkbox"></div>
              <div className="skeleton skeleton-task-text"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
