import { io } from 'socket.io-client';
import type { LobbyState } from '../types';

/**
 * WebSocket connection configuration
 */
const SOCKET_CONFIG = {
  path: '/socket.io',
  transports: ['websocket'] as string[],
  upgrade: false,
  withCredentials: false,
  timeout: 12000,
} as const;

/**
 * Get WebSocket URL from environment
 */
export function getWebSocketUrl(): string | undefined {
  return (import.meta as any).env?.VITE_WS_URL as string | undefined;
}

/**
 * Create and configure WebSocket connection
 */
export function createSocketConnection(wsUrl: string) {
  return io(wsUrl, SOCKET_CONFIG);
}

/**
 * Handle socket connection events
 */
export function setupConnectionHandlers(
  socket: any,
  setState: (updater: (state: LobbyState) => Partial<LobbyState>) => void,
  getState: () => LobbyState,
  onAutoIdentify?: () => void
) {
  // Connection events
  socket.on('connect', () => {
    setState(state => ({
      connection: {
        ...state.connection,
        socket,
        isConnected: true,
        isConnecting: false,
        connectionError: null
      }
    }));
    
    // Auto-identify if we have a stored player name
    if (onAutoIdentify) {
      onAutoIdentify();
    }
  });

  socket.on('connect_error', (err: any) => {
    setState(state => ({
      connection: {
        ...state.connection,
        isConnected: false,
        isConnecting: false,
        connectionError: err.message || 'Connection failed'
      }
    }));
    
    // Auto-reconnect after delay
    setTimeout(() => {
      const { actions } = getState();
      actions.reconnectSocket();
    }, 1000);
  });

  socket.on('disconnect', () => {
    setState(state => ({
      connection: {
        ...state.connection,
        isConnected: false,
        isConnecting: false
      }
    }));
  });
}

/**
 * Handle table update events
 */
export function setupTableHandlers(
  socket: any,
  setState: (updater: (state: LobbyState) => Partial<LobbyState>) => void,
  getState: () => LobbyState
) {
  // Table update events
  socket.on('table_update', (summary: any) => {
    const { tables } = getState();
    const existingIndex = tables.findIndex(t => t.tableId === summary.tableId);
    
    if (existingIndex === -1) {
      setState(() => ({ tables: [...tables, summary] }));
    } else {
      const updatedTables = [...tables];
      updatedTables[existingIndex] = summary;
      setState(() => ({ tables: updatedTables }));
    }
  });

  socket.on('table_removed', (message: { tableId: string }) => {
    const { tables } = getState();
    setState(() => ({ 
      tables: tables.filter(t => t.tableId !== message.tableId)
    }));
  });
}

/**
 * Disconnect socket connection
 */
export function disconnectSocket(socket: any) {
  if (socket) {
    socket.disconnect();
  }
}
