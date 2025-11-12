import React from 'react';
import { useUpdater } from '../hooks/useUpdater';
import './UpdateManager.css';

// Re-export the hook for convenience
export { useUpdater } from '../hooks/useUpdater';

interface UpdateButtonProps {
  showVersion?: boolean;
}

export const UpdateButton: React.FC<UpdateButtonProps> = ({ showVersion = true }) => {
  const {
    updateAvailable,
    updateInfo,
    isChecking,
    isInstalling,
    checkForUpdates,
    installUpdate,
  } = useUpdater({
    checkOnMount: false, // Don't auto-check in the button component
    autoCheckInterval: 0, // Disable periodic checks from button
  });

  const handleCheck = () => {
    checkForUpdates(true); // User-triggered check
  };

  const handleInstall = () => {
    installUpdate();
  };

  return (
    <div className="update-manager">
      {showVersion && (
        <div className="version-info">
          <span className="version-label">Current Version:</span>
          <span className="version-number">v1.0.0</span>
          {updateAvailable && updateInfo && (
            <span className="update-badge">v{updateInfo.version} available</span>
          )}
        </div>
      )}

      <div className="update-button-group">
        {!updateAvailable ? (
          <button
            className="update-check-button"
            onClick={handleCheck}
            disabled={isChecking}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M2 10H4M10 2V4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </button>
        ) : (
          <button
            className="update-install-button"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3V13M10 13L13 10M10 13L7 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 15V16C3 16.5304 3.21071 17.0391 3.58579 17.4142C3.96086 17.7893 4.46957 18 5 18H15C15.5304 18 16.0391 17.7893 16.4142 17.4142C16.7893 17.0391 17 16.5304 17 16V15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isInstalling ? 'Installing...' : `Install v${updateInfo?.version}`}
          </button>
        )}
      </div>

      {updateAvailable && updateInfo && (
        <div className="update-notes">
          <div className="update-notes-label">Release Notes:</div>
          <div className="update-notes-content">{updateInfo.notes}</div>
        </div>
      )}
    </div>
  );
};
