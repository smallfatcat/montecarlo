import type { LobbyState } from '../types';

/**
 * Session storage keys
 */
const STORAGE_KEYS = {
  PLAYER_NAME: 'playerName',
  PLAYER_TOKEN: 'playerToken',
} as const;

/**
 * Get stored player name from session storage
 */
export function getStoredPlayerName(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
}

/**
 * Get stored player token from session storage
 */
export function getStoredPlayerToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.PLAYER_TOKEN);
}

/**
 * Store player name in session storage
 */
export function storePlayerName(name: string): void {
  sessionStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
}

/**
 * Store player token in session storage
 */
export function storePlayerToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEYS.PLAYER_TOKEN, token);
}

/**
 * Clear stored player data from session storage
 */
export function clearStoredPlayerData(): void {
  sessionStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
  sessionStorage.removeItem(STORAGE_KEYS.PLAYER_TOKEN);
}

/**
 * Validate player name
 */
export function validatePlayerName(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Player name cannot be empty');
  }
  return trimmedName;
}

/**
 * Handle player identification response
 */
export function handleIdentificationResponse(
  response: any,
  setState: (updater: (state: LobbyState) => Partial<LobbyState>) => void,
  socket: any
): void {
  if (response && typeof response === 'object' && 'token' in response) {
    const token = response.token as string;
    storePlayerToken(token);
    
    setState(state => ({
      player: {
        ...state.player,
        name: getStoredPlayerName() || '',
        token,
        isIdentified: true,
        isIdentifying: false
      }
    }));
    
    // Join lobby after successful identification
    joinLobby(socket);
  } else {
    throw new Error('Invalid identification response');
  }
}

/**
 * Join lobby after successful identification
 */
function joinLobby(socket: any): void {
  socket.emit('joinLobby', {}, (resp: any) => {
    if (Array.isArray(resp?.tables)) {
      // Update tables state - this will be handled by the store
      // We'll need to pass a callback or use a different approach
      console.log('Joined lobby, received tables:', resp.tables);
    }
  });
}

/**
 * Reset player state
 */
export function resetPlayerState(
  setState: (updater: (state: LobbyState) => Partial<LobbyState>) => void
): void {
  clearStoredPlayerData();
  
  setState(state => ({
    player: {
      ...state.player,
      name: '',
      token: null,
      isIdentified: false,
      isIdentifying: false
    }
  }));
}
