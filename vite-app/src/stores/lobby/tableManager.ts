import type { TableConfig } from '../types';

/**
 * Create a new table with the specified configuration
 */
export async function createTable(
  socket: any,
  config: TableConfig,
  timeoutMs: number = 10000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Table creation timeout')), timeoutMs);
    
    socket.emit('createTable', config, (response: any) => {
      clearTimeout(timeout);
      if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Join a table by navigating to the table route
 */
export function joinTable(tableId: string): void {
  try {
    window.location.hash = `#poker/${tableId}`;
  } catch (error) {
    console.error('Failed to navigate to table:', error);
  }
}

/**
 * Spectate a table (placeholder for future implementation)
 */
export function spectateTable(tableId: string): void {
  // TODO: Implement spectate functionality
  console.log('Spectating table:', tableId);
}

/**
 * Refresh the list of available tables
 */
export function refreshTables(
  socket: any,
  setState: (updater: any) => void,
  getState: () => any
): void {
  if (!socket) return;
  
  setState((state: any) => ({
    ui: {
      ...state.ui,
      refreshingTables: true
    }
  }));
  
  socket.emit('listTables', {}, (resp: any) => {
    if (Array.isArray(resp?.tables)) {
      setState({ 
        tables: resp.tables,
        ui: {
          ...getState().ui,
          refreshingTables: false
        }
      });
    }
  });
}

/**
 * Set the selected table ID
 */
export function setSelectedTable(
  setState: (updater: any) => void,
  tableId: string | null
): void {
  setState((state: any) => ({
    ui: {
      ...state.ui,
      selectedTableId: tableId
    }
  }));
}
