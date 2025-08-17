import React, { useState, useEffect } from 'react';
import './VersionDisplay.css';

interface VersionInfo {
  version: string;
  buildNumber: string;
  commitHash: string;
  branch: string;
  buildDate: string;
  status: string;
}

interface ComponentVersion {
  name: string;
  version: string;
}

const VersionDisplay: React.FC = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [componentVersions, setComponentVersions] = useState<ComponentVersion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Detect development mode
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    // Load version information
    const loadVersionInfo = async () => {
      try {
        // First try to load from BUILD_INFO file if it exists
        console.log('[VersionDisplay] Attempting to load BUILD_INFO from ./BUILD_INFO');
        const response = await fetch('./BUILD_INFO');
        
        if (response.ok) {
          const text = await response.text();
          console.log('[VersionDisplay] Successfully loaded BUILD_INFO:', text.substring(0, 100) + '...');
          
          const lines = text.split('\n');
          const info: Partial<VersionInfo> = {};
          const components: ComponentVersion[] = [];

          lines.forEach(line => {
            if (line.includes('=')) {
              const [key, value] = line.split('=');
              if (key && value) {
                switch (key.trim()) {
                  case 'BUILD_VERSION':
                    info.version = value.trim();
                    break;
                  case 'BUILD_NUMBER':
                    info.buildNumber = value.trim();
                    break;
                  case 'BUILD_COMMIT':
                    info.commitHash = value.trim();
                    break;
                  case 'BUILD_BRANCH':
                    info.branch = value.trim();
                    break;
                  case 'BUILD_DATE':
                    info.buildDate = value.trim();
                    break;
                  case 'BUILD_STATUS':
                    info.status = value.trim();
                    break;
                  default:
                    if (key.includes('_VERSION')) {
                      const componentName = key.replace('_VERSION', '').toLowerCase();
                      components.push({
                        name: componentName,
                        version: value.trim()
                      });
                    }
                }
              }
            }
          });

          setVersionInfo(info as VersionInfo);
          setComponentVersions(components);
          console.log('[VersionDisplay] Version info loaded successfully:', info);
        } else {
          console.warn(`[VersionDisplay] BUILD_INFO request failed with status: ${response.status}`);
          // Fallback: use Vite environment variables and generate basic info
          const fallbackVersion = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ? __APP_VERSION__ : '0.0.0';
          const fallbackInfo: VersionInfo = {
            version: fallbackVersion,
            buildNumber: '0',
            commitHash: 'unknown',
            branch: 'unknown',
            buildDate: new Date().toISOString(),
            status: 'fallback'
          };
          setVersionInfo(fallbackInfo);
          console.log('[VersionDisplay] Using fallback version info:', fallbackInfo);
        }
      } catch (error) {
        console.warn('[VersionDisplay] Could not load version info:', error);
        // Fallback: use Vite environment variables
        const fallbackVersion = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ? __APP_VERSION__ : '0.0.0';
        const fallbackInfo: VersionInfo = {
          version: fallbackVersion,
          buildNumber: '0',
          commitHash: 'unknown',
          branch: 'unknown',
          buildDate: new Date().toISOString(),
          status: 'fallback'
        };
        setVersionInfo(fallbackInfo);
        console.log('[VersionDisplay] Using fallback version info after error:', fallbackInfo);
      }
    };

    loadVersionInfo();
  }, []);

  if (!versionInfo) {
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
          <div className="version-section">
            <h4>Build Information</h4>
            <div className="version-grid">
              <div className="version-item">
                <span className="label">Version:</span>
                <span className="value">{versionInfo.version}</span>
              </div>
              <div className="version-item">
                <span className="label">Build:</span>
                <span className="value">#{versionInfo.buildNumber}</span>
              </div>
              <div className="version-item">
                <span className="label">Commit:</span>
                <span className="value">{versionInfo.commitHash}</span>
              </div>
              <div className="version-item">
                <span className="label">Branch:</span>
                <span className="value">{versionInfo.branch}</span>
              </div>
              <div className="version-item">
                <span className="label">Date:</span>
                <span className="value">{versionInfo.buildDate}</span>
              </div>
              <div className="version-item">
                <span className="label">Status:</span>
                <span className={`value status-${versionInfo.status}`}>
                  {versionInfo.status}
                </span>
              </div>
              <div className="version-item">
                <span className="label">Mode:</span>
                <span className={`value mode-${isDevelopment ? 'dev' : 'prod'}`}>
                  {isDevelopment ? 'Development' : 'Production'}
                </span>
              </div>
            </div>
          </div>
          
          {componentVersions.length > 0 && (
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
          )}
          
          {isDevelopment && versionInfo.status === 'fallback' && (
            <div className="version-section">
              <h4>Development Mode</h4>
              <div className="dev-info">
                <p>Running in development mode. Version files may not be available.</p>
                <p>To generate version information, run:</p>
                <code>bash scripts/version.sh generate</code>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VersionDisplay;
