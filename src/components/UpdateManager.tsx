import React from 'react';
import './UpdateManager.css';

interface UpdateButtonProps {
  showVersion?: boolean;
}

export const UpdateButton: React.FC<UpdateButtonProps> = ({ showVersion = true }) => {
  const version = '1.0.10';

  return (
    <div className="update-manager">
      {showVersion && (
        <div className="version-info">
          <span className="version-label">Current Version:</span>
          <span className="version-number">v{version}</span>
        </div>
      )}

      <div className="brew-update-note">
        Run <code>brew upgrade todo-app</code> to check for updates
      </div>
    </div>
  );
};
