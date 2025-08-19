import { type ReactNode } from 'react';
import { DeckGallery } from '../DeckGallery';
import { PokerTableHorseshoe } from '../poker/PokerTableHorseshoe';
import { PokerLobby } from '../poker/PokerLobby';
import { PokerGameProvider } from '../poker/PokerGameContext';
import { PokerTestDashboard } from '../poker/PokerTestDashboard';
import { PokerHistoryPage } from '../poker/PokerHistoryPage';
import { PokerLayoutEditorPage } from '../poker/PokerLayoutEditorPage';
import { Landing } from '../Landing';
import { DesignSystemDemo } from './DesignSystemDemo';

interface AppContentRendererProps {
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
 * Component responsible for rendering the appropriate content based on routing state
 */
export function AppContentRenderer({
  showDeck,
  showPoker,
  showPokerTest,
  showPokerHistory,
  showPokerLayoutEditor,
  showBlackjack,
  showPokerLobby,
  showDesignSystem,
  pokerTableId,
}: AppContentRendererProps): ReactNode {
  // Determine which content to render based on route
  if (showDeck) {
    return <DeckGallery />;
  }
  
  if (showPokerTest) {
    return <PokerTestDashboard />;
  }
  
  if (showPokerHistory) {
    return (
      <PokerGameProvider>
        <PokerHistoryPage />
      </PokerGameProvider>
    );
  }
  
  if (showPokerLayoutEditor) {
    return (
      <PokerGameProvider>
        <PokerLayoutEditorPage />
      </PokerGameProvider>
    );
  }
  
  if (showPokerLobby) {
    return <PokerLobby />;
  }
  
  if (showDesignSystem) {
    return <DesignSystemDemo />;
  }
  
  if (showPoker) {
    return (
      <PokerGameProvider key={pokerTableId}>
        <PokerTableHorseshoe />
      </PokerGameProvider>
    );
  }
  
  if (showBlackjack) {
    return null; // Currently disabled
  }
  
  // Default to landing page
  return <Landing />;
}
