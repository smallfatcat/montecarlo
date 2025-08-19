import React, { useState } from 'react';
import { useVersionInfo } from '../ui/hooks/useVersionInfo';
import './VersionDisplay.css';

const VersionDisplay: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { versionInfo, componentVersions, isLoading, error } = useVersionInfo();
  
  // Detect development mode
  const isDevelopment = import.meta.env.DEV;

  // Show loading state
  if (isLoading) {
    return (
      <div className="version-display">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="version-toggle"
        >
          Loading...
        </button>
      </div>
    );
  }

  // Show error state
  if (error || !versionInfo) {
    return (
      <div className="version-display">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="version-toggle"
        >
          Version Info
        </button>
      </div>
    );
  }

  return (
    <div className="version-display">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="version-toggle"
      >
        v{versionInfo.version} {isExpanded ? '▼' : '▶'}
      </button>
      
      {isExpanded && (
        <div className="version-details">
          <BuildInformationSection versionInfo={versionInfo} isDevelopment={isDevelopment} />
          
          {componentVersions.length > 0 && (
            <ComponentVersionsSection componentVersions={componentVersions} />
          )}
          
          {isDevelopment && versionInfo.status === 'fallback' && (
            <DevelopmentModeSection />
          )}
        </div>
      )}
    </div>
  );
};

// Extracted components for better readability
const BuildInformationSection: React.FC<{
  versionInfo: any;
  isDevelopment: boolean;
}> = ({ versionInfo, isDevelopment }) => (
  <div className="version-section">
    <h4>Build Information</h4>
    <div className="version-grid">
      <VersionItem label="Version" value={versionInfo.version} />
      <VersionItem label="Build" value={`#${versionInfo.buildNumber}`} />
      <VersionItem label="Commit" value={versionInfo.commitHash} />
      <VersionItem label="Branch" value={versionInfo.branch} />
      <VersionItem label="Date" value={versionInfo.buildDate} />
      <VersionItem 
        label="Status" 
        value={versionInfo.status} 
        className={`status-${versionInfo.status}`}
      />
      <VersionItem 
        label="Mode" 
        value={isDevelopment ? 'Development' : 'Production'} 
        className={`mode-${isDevelopment ? 'dev' : 'prod'}`}
      />
    </div>
  </div>
);

const ComponentVersionsSection: React.FC<{
  componentVersions: Array<{ name: string; version: string }>;
}> = ({ componentVersions }) => (
  <div className="version-section">
    <h4>Component Versions</h4>
    <div className="component-versions">
      {componentVersions.map((component, index) => (
        <div key={index} className="component-version">
          <span className="component-name">{component.name}:</span>
          <span className="component-version-value">{component.version}</span>
        </div>
      ))}
    </div>
  </div>
);

const DevelopmentModeSection: React.FC = () => (
  <div className="version-section">
    <h4>Development Mode</h4>
    <div className="dev-info">
      <p>Running in development mode. Version files may not be available.</p>
      <p>To generate version information, run:</p>
      <code>bash scripts/version.sh generate</code>
    </div>
  </div>
);

const VersionItem: React.FC<{
  label: string;
  value: string;
  className?: string;
}> = ({ label, value, className }) => (
  <div className="version-item">
    <span className="label">{label}:</span>
    <span className={`value ${className || ''}`}>{value}</span>
  </div>
);

export default VersionDisplay;
