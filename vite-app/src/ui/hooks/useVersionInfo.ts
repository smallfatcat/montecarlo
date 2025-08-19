import { useState, useEffect } from 'react';

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

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  componentVersions: ComponentVersion[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for loading and managing version information
 */
export function useVersionInfo(): UseVersionInfoReturn {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [componentVersions, setComponentVersions] = useState<ComponentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVersionInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First try to load from BUILD_INFO file if it exists
        console.log('[useVersionInfo] Attempting to load BUILD_INFO from ./BUILD_INFO');
        const response = await fetch('./BUILD_INFO');
        
        if (response.ok) {
          const text = await response.text();
          console.log('[useVersionInfo] Successfully loaded BUILD_INFO:', text.substring(0, 100) + '...');
          
          const { info, components } = parseBuildInfo(text);
          setVersionInfo(info as VersionInfo);
          setComponentVersions(components);
          console.log('[useVersionInfo] Version info loaded successfully:', info);
        } else {
          console.warn(`[useVersionInfo] BUILD_INFO request failed with status: ${response.status}`);
          const fallbackInfo = createFallbackVersionInfo();
          setVersionInfo(fallbackInfo);
          console.log('[useVersionInfo] Using fallback version info:', fallbackInfo);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn('[useVersionInfo] Could not load version info:', err);
        setError(errorMessage);
        
        const fallbackInfo = createFallbackVersionInfo();
        setVersionInfo(fallbackInfo);
        console.log('[useVersionInfo] Using fallback version info after error:', fallbackInfo);
      } finally {
        setIsLoading(false);
      }
    };

    loadVersionInfo();
  }, []);

  return { versionInfo, componentVersions, isLoading, error };
}

/**
 * Parse BUILD_INFO file content
 */
function parseBuildInfo(content: string): { info: Partial<VersionInfo>; components: ComponentVersion[] } {
  const lines = content.split('\n');
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

  return { info, components };
}

/**
 * Create fallback version info when BUILD_INFO is not available
 */
function createFallbackVersionInfo(): VersionInfo {
  const fallbackVersion = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ? __APP_VERSION__ : '0.0.0';
  
  return {
    version: fallbackVersion,
    buildNumber: '0',
    commitHash: 'unknown',
    branch: 'unknown',
    buildDate: new Date().toISOString(),
    status: 'fallback'
  };
}
