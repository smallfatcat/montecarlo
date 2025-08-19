import { useState, useEffect } from 'react';

// Route constants for better maintainability
export const ROUTES = {
  CARDS: '#cards',
  POKER: '#poker',
  POKER_TEST: '#poker-test',
  POKER_HISTORY: '#poker-history',
  POKER_LAYOUT_EDITOR: '#poker-layout-editor',
  LOBBY: '#lobby',
  POKER_LOBBY: '#poker-lobby',
  DESIGN_SYSTEM: '#design-system',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];

interface AppRoutingState {
  currentRoute: Route | string;
  showDeck: boolean;
  showPoker: boolean;
  showPokerTest: boolean;
  showPokerHistory: boolean;
  showPokerLayoutEditor: boolean;
  showBlackjack: boolean;
  showPokerLobby: boolean;
  showDesignSystem: boolean;
  pokerTableId: string;
}

/**
 * Custom hook for managing app routing logic
 */
export function useAppRouting(): AppRoutingState {
  const [currentRoute, setCurrentRoute] = useState<string>(
    typeof window !== 'undefined' ? window.location.hash : ''
  );

  useEffect(() => {
    const onHashChange = () => setCurrentRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Compute route states
  const showDeck = currentRoute === ROUTES.CARDS;
  const showPoker = currentRoute === ROUTES.POKER || currentRoute.startsWith('#poker/');
  const showPokerTest = currentRoute === ROUTES.POKER_TEST;
  const showPokerHistory = currentRoute === ROUTES.POKER_HISTORY;
  const showPokerLayoutEditor = currentRoute === ROUTES.POKER_LAYOUT_EDITOR;
  const showBlackjack = false; // Currently disabled
  const showPokerLobby = currentRoute === ROUTES.LOBBY || currentRoute === ROUTES.POKER_LOBBY;
  const showDesignSystem = currentRoute === ROUTES.DESIGN_SYSTEM;
  
  // Extract poker table ID from route
  const pokerTableId = showPoker && currentRoute.startsWith('#poker/') 
    ? currentRoute.slice('#poker/'.length) 
    : 'table-1';

  return {
    currentRoute,
    showDeck,
    showPoker,
    showPokerTest,
    showPokerHistory,
    showPokerLayoutEditor,
    showBlackjack,
    showPokerLobby,
    showDesignSystem,
    pokerTableId,
  };
}
