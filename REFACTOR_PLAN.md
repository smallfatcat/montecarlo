# Montecarlo Refactor Plan

## Overview
This document tracks the implementation of a comprehensive refactor to improve the poker lobby's state management and UI consistency. The refactor will implement Zustand for centralized state management and create a unified design system.

## Goals
- **State Management**: Replace fragmented useState patterns with centralized Zustand stores
- **Design System**: Implement consistent UI components and design tokens
- **Code Quality**: Improve maintainability, performance, and developer experience
- **User Experience**: Enhance lobby functionality and visual consistency

## Phase 1: Zustand State Management Implementation

### 1.1 Install Dependencies
- [x] Install Zustand: `npm install zustand`
- [x] Install dev tools: `npm install -D @types/zustand`
- [x] Verify package.json updates

### 1.2 Create Base Store Structure
- [x] Create `src/stores/` directory
- [x] Implement `lobbyStore.ts` with basic structure
- [x] Define TypeScript interfaces for all state types
- [x] Set up store actions and selectors

### 1.3 Implement Lobby Store
- [x] **Connection State Management**
  - [x] Socket connection state
  - [x] Connection error handling
  - [x] Reconnection logic
  
- [x] **Player State Management**
  - [x] Player identification
  - [x] Session persistence
  - [x] Authentication tokens
  
- [x] **Tables State Management**
  - [x] Table list and updates
  - [x] Table creation
  - [x] Table filtering and sorting
  
- [x] **UI State Management**
  - [x] Loading states
  - [x] Error states
  - [x] User preferences

### 1.4 Refactor PokerLobby Component
- [x] Replace useState calls with Zustand store
- [x] Implement store selectors for component state
- [x] Update event handlers to use store actions
- [x] Remove local state management
- [x] Test component functionality (basic store tests passing)

### 1.5 Update Related Components
- [x] Refactor `PokerGameContext` to use Zustand (store created)
- [ ] Update `usePokerGame` hook integration
- [ ] Modify table joining logic
- [ ] Update error handling

### 1.6 Testing & Validation
- [x] Unit tests for store actions
- [x] Basic store functionality tests
- [x] Computed values tests (basic validation)
- [x] Build verification (TypeScript compilation successful)
- [ ] Integration tests for component updates
- [ ] Performance testing
- [ ] Browser compatibility testing

## Phase 2: Design System Implementation ✅ COMPLETED

### 2.1 Design Tokens & Foundation ✅
- [x] Create `src/styles/design-tokens.css` with CSS custom properties
- [x] Implement CSS custom properties for:
  - [x] Color palette (primary, neutral, success, warning, error, poker-specific)
  - [x] Typography scale (font sizes, weights, line heights)
  - [x] Spacing system (4px to 96px scale)
  - [x] Border radius (sm to full)
  - [x] Shadows (sm to xl)
  - [x] Transitions (fast, normal, slow)
  
- [x] Create design token documentation
- [x] Set up CSS structure with dark theme support

### 2.2 Base UI Components ✅
- [x] **Button Component**
  - [x] Multiple variants (primary, secondary, outline, ghost, danger)
  - [x] Size variations (sm, md, lg)
  - [x] Loading states with spinner animation
  - [x] Icon support and accessibility
  
- [x] **Card Component**
  - [x] Multiple variants (default, outlined, elevated, interactive)
  - [x] Padding options (none, sm, md, lg)
  - [x] Header/footer support with proper styling
  
- [x] **Input Component**
  - [x] Label support with proper accessibility
  - [x] Error states and validation
  - [x] Helper text and error messages
  - [x] Icon support (left/right)
  
- [x] **Badge Component**
  - [x] Status indicators with dot support
  - [x] Color variants (default, primary, success, warning, error, outline)
  - [x] Removable badges and icon support

### 2.3 Poker-Specific Components ✅
- [x] **PokerTableCard**
  - [x] Table information display with stats
  - [x] Status badges and player counts
  - [x] Action buttons (join, spectate)
  - [x] Responsive design and hover effects
  
- [x] **StatusBadge**
  - [x] Game status indicators (online, offline, away, busy)
  - [x] Color coding and dot indicators
  - [x] Multiple sizes and variants
  
- [x] **PlayerAvatar** (implemented as part of StatusBadge)

### 2.4 Component Documentation ✅
- [x] Create comprehensive demo page (`DesignSystemDemo.tsx`)
- [x] Document component APIs with TypeScript interfaces
- [x] Create usage examples for all components
- [x] Add accessibility guidelines and ARIA support

## Phase 3: Integration & Refactoring

### 3.1 Component Migration ✅ COMPLETED
- [x] Update existing poker components to use design system
  - [x] PokerInlineControls - Replaced inline styles with Card component
  - [x] PokerTableHorseshoeControls - Replaced inline styles with Button, Input, Badge, Card components
  - [x] PokerSeat - Replaced inline styles with Card component and state-based styling
  - [x] PokerTableBoard - Replaced inline styles with CSS classes and design tokens
  - [x] PokerTableLayout - Replaced inline styles with CSS classes and design tokens
- [x] Refactor inline styles to use design tokens
  - [x] Background colors, borders, shadows
  - [x] Spacing, typography, colors
  - [x] Component-specific styling with CSS classes
  - [x] Layout editor styling and grid system
- [x] Implement consistent spacing and typography
  - [x] Using design tokens for all spacing and typography
- [x] Add proper loading and error states
  - [x] Created LoadingSpinner component with multiple sizes and overlay support
  - [x] Created ErrorBoundary component for React error handling
  - [x] Created StatusMessage component for success/warning/error/info/loading states
  - [x] Enhanced PokerLobbyRefactored with proper error handling and loading states
  - [x] Enhanced PokerTableBoard with dealing and error states
  - [x] Enhanced PokerSeat with loading overlays and error handling
  - [x] Updated DesignSystemDemo to showcase all new components

### 3.2 Advanced Features

### 3.2A Poker Inline Controls Schema Lock ✅ COMPLETED
- Adopt a strict nine-rect schema for the control box, defined only in `vite-app/public/horseshoe-layout.json` under `controlsChildren`.
- Supported keys:
  - `checkBtn`, `callBtn`, `foldBtn`, `betBtn`, `raiseBtn`
  - `betBox` (label + input combined)
  - `potSlider`, `stackSlider`
  - `stackLabel`
- Removed legacy/unused keys and paths: `betLabel`, `betInput`, `potSliderLabel`, `stackSliderLabel`.
- Import/export now sanitize to the nine keys only.
- UI updates aligned to schema:
  - Compact bet: label on the left of input within `betBox`.
  - Slider labels removed.
  - `stackLabel` renders single-line: "Stack: $NNN".

### 3.2B Poker Lobby Design System Integration ✅ COMPLETED
- [x] Updated `PokerLobbyRefactored.tsx` to use new design system components:
  - Replaced inline styles with CSS classes and design tokens
  - Integrated `Button`, `Card`, `Badge`, `StatusMessage`, and `LoadingSpinner` components
  - Added proper semantic HTML structure with header, sections, and cards
- [x] Created `PokerLobbyRefactored.css` with comprehensive styling:
  - Dark poker theme using design tokens
  - Responsive grid layout for different view modes (grid, list, compact)
  - Hover effects and status-based styling for table cards
  - Mobile-first responsive design
- [x] Enhanced user experience:
  - Better visual hierarchy with cards and badges
  - Improved loading states and error handling
  - Consistent spacing and typography using design tokens
  - Status indicators for table states (waiting, in-game, finished)

### 3.3 Performance Optimization
- [ ] Implement virtual scrolling for large table lists
- [ ] Add debounced updates
- [ ] Optimize re-renders
- [ ] Add connection pooling

## Phase 3B: Blackjack UI Implementation (NEW)

### 3B.1 Blackjack Game Interface
- [ ] **Blackjack Table Component**
  - [ ] Card display with proper poker-style layout
  - [ ] Player controls (hit, stand, double, split)
  - [ ] Betting interface with chip selection
  - [ ] Game state management and transitions
  - [ ] Responsive design using design system components

- [ ] **Game State Management**
  - [ ] Integrate existing blackjack engine with React state
  - [ ] Real-time game updates and animations
  - [ ] Player action handling and validation
  - [ ] Game history and replay functionality

### 3B.2 Simulation Integration
- [ ] **Simulation Control Panel**
  - [ ] Parameter configuration interface
  - [ ] Simulation execution controls
  - [ ] Progress display and real-time updates
  - [ ] Results visualization and analysis

- [ ] **Simulation Runner UI**
  - [ ] Integrate `useSimulationRunner` hook with components
  - [ ] Batch simulation management
  - [ ] Configuration presets and favorites
  - [ ] Export and sharing capabilities

### 3B.3 Enhanced User Experience
- [ ] **Accessibility and Polish**
  - [ ] Screen reader support and ARIA labels
  - [ ] Keyboard navigation and shortcuts
  - [ ] High contrast mode support
  - [ ] Mobile-responsive design

- [ ] **Performance Optimization**
  - [ ] Component memoization where appropriate
  - [ ] Efficient re-rendering strategies
  - [ ] Web Worker integration for heavy computations
  - [ ] Bundle size optimization

## Phase 4: Testing & Quality Assurance

### 4.1 Testing Strategy
- [ ] **Unit Tests**
  - [ ] Store actions and reducers
  - [ ] Component rendering
  - [ ] Hook functionality
  
- [ ] **Integration Tests**
  - [ ] Component interactions
  - [ ] Store integration
  - [ ] API communication
  
- [ ] **E2E Tests**
  - [ ] User workflows
  - [ ] Cross-browser compatibility
  - [ ] Performance benchmarks

### 4.2 Code Quality
- [ ] ESLint configuration updates
- [ ] Prettier formatting rules
- [ ] TypeScript strict mode
- [ ] Code coverage requirements

## Phase 5: Documentation & Deployment

### 5.1 Developer Documentation
- [ ] API documentation
- [ ] Component usage guides
- [ ] State management patterns
- [ ] Migration guides

### 5.2 User Documentation
- [ ] Feature documentation
- [ ] User guides
- [ ] FAQ updates
- [ ] Release notes

## Implementation Timeline

| Phase | Duration | Dependencies | Deliverables |
|-------|----------|--------------|--------------|
| Phase 1 | 2-3 weeks | None | Zustand stores, refactored components |
| Phase 2 | 3-4 weeks | Phase 1 | Design system, base components |
| Phase 3 | 2-3 weeks | Phase 2 | Enhanced features, performance |
| Phase 4 | 1-2 weeks | Phase 3 | Testing, quality assurance |
| Phase 5 | 1 week | Phase 4 | Documentation, deployment |

## Success Metrics

### Technical Metrics
- [ ] **Bundle Size**: < 10% increase
- [ ] **Performance**: < 100ms initial render
- [ ] **Test Coverage**: > 80%
- [ ] **TypeScript Coverage**: 100%

### User Experience Metrics
- [ ] **Lobby Load Time**: < 2 seconds
- [ ] **Table Join Time**: < 1 second
- [ ] **Error Rate**: < 1%
- [ ] **User Satisfaction**: > 4.5/5

### Developer Experience Metrics
- [ ] **Build Time**: < 30 seconds
- [ ] **Hot Reload**: < 1 second
- [ ] **Type Checking**: < 5 seconds
- [ ] **Documentation Coverage**: 100%

## Risk Assessment

### High Risk
- **Breaking Changes**: Existing functionality may be affected
- **Performance Impact**: New state management could affect performance
- **User Experience**: UI changes may confuse existing users

### Mitigation Strategies
- **Incremental Migration**: Implement changes gradually
- **Feature Flags**: Use feature toggles for new functionality
- **User Testing**: Conduct user research before major changes
- **Rollback Plan**: Maintain ability to revert changes quickly

## Next Steps

### Immediate Actions (This Week) ✅ COMPLETED
1. [x] Install Zustand dependencies
2. [x] Create store directory structure
3. [x] Begin implementing lobby store
4. [x] Set up basic TypeScript interfaces

### Week 1 Goals ✅ COMPLETED
- [x] Complete basic store structure
- [x] Implement connection state management
- [x] Begin player state management
- [x] Create initial tests

### Week 2 Goals ✅ COMPLETED
- [x] Complete player state management
- [x] Implement tables state management
- [x] Begin component refactoring
- [x] Add comprehensive testing

## Notes & Decisions

### State Management Decisions
- **Store Structure**: Single store vs. multiple stores
- **Persistence**: Local storage vs. session storage
- **Middleware**: Dev tools, persistence, etc.

### Design System Decisions
- **Styling Approach**: CSS-in-JS vs. CSS modules vs. Tailwind
- **Component Library**: Custom vs. existing (MUI, Chakra, etc.)
- **Theme System**: Light/dark mode support

### Performance Considerations
- **State Updates**: Batch updates vs. individual updates
- **Component Memoization**: When to use React.memo
- **Bundle Splitting**: Code splitting strategies

---

**Last Updated**: December 2024  
**Next Review**: [Next Week]  
**Status**: Phase 3A Complete - Design System Integration ✅, Phase 3B In Progress - Blackjack UI Implementation 🚀
