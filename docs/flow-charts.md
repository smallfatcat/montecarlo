# Montecarlo Application Flow Charts

This document contains comprehensive flow charts representing the major components in the frontend and backend and how they communicate in the Montecarlo casino game application.

## Frontend Architecture Flow

```mermaid
graph TD
    A[User Browser] --> B[Vite App Entry Point]
    B --> C[React App with Convex Provider]
    C --> D[App Component]
    D --> E[App Content Renderer]
    E --> F[Game Selection Router]
    
    F --> G[Poker Game Components]
    F --> H[Blackjack Game Components]
    F --> I[UI Components]
    
    G --> J[Poker Flow Modules]
    G --> K[Poker Strategy Modules]
    G --> L[Poker Hand Evaluation]
    
    H --> M[Blackjack Simulation Engine]
    H --> N[Blackjack Table State]
    
    I --> O[Shared UI Components]
    I --> P[Game Controls]
    I --> Q[Hand Layouts]
    
    R[Zustand Store] --> S[Lobby Store]
    S --> T[Connection Manager]
    S --> U[Player Manager]
    S --> V[Table Manager]
    S --> W[UI Manager]
    
    X[Web Workers] --> Y[Equity Calculator]
    X --> Z[Simulation Worker]
    
    AA[Configuration] --> BB[Poker Config]
    AA --> CC[Blackjack Config]
    AA --> DD[UI Config]
    AA --> EE[Legacy Config]
    
    style A fill:#e1f5fe
    style R fill:#f3e5f5
    style X fill:#e8f5e8
    style AA fill:#fff3e0
```

## Backend Architecture Flow

```mermaid
graph TD
    A[Game Server Entry Point] --> B[Server Configuration]
    B --> C[HTTP Server Setup]
    B --> D[Socket.IO Setup]
    B --> E[Environment Configuration]
    
    C --> F[Fastify HTTP Server]
    D --> G[Socket.IO Server]
    
    H[Identity Management] --> I[Token Store]
    I --> J[User Resolution]
    
    K[Table Management] --> L[Runtime Table Factory]
    L --> M[Server Runtime Table]
    M --> N[Table State Management]
    M --> O[Player Management]
    M --> P[Game Flow Control]
    
    Q[Convex Integration] --> R[Convex Publisher]
    R --> S[Event Ingestion]
    S --> T[Database Storage]
    
    U[Socket Event Handlers] --> V[Join Table]
    U --> W[Player Actions]
    U --> X[Game State Updates]
    U --> Y[Table Management]
    
    Z[Database Schema] --> AA[Users Table]
    Z --> BB[Tables Table]
    Z --> CC[Participants Table]
    Z --> DD[Hands Table]
    Z --> EE[Actions Table]
    
    style A fill:#e1f5fe
    style H fill:#f3e5f5
    style Q fill:#e8f5e8
    style Z fill:#fff3e0
```

## Real-time Communication Flow

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant Socket as Socket.IO Server
    participant Table as Runtime Table
    participant Convex as Convex Database
    participant Game as Game Engine
    
    Client->>Socket: Connect to server
    Socket->>Client: Connection confirmed
    
    Client->>Socket: Join table request
    Socket->>Table: Create/get table instance
    Table->>Client: Table state update
    
    Client->>Socket: Sit at seat
    Socket->>Table: Process seating
    Table->>Client: Updated table state
    Table->>Convex: Publish seating event
    
    Client->>Socket: Start hand
    Socket->>Table: Begin new hand
    Table->>Game: Generate hand
    Table->>Client: Hand state
    Table->>Convex: Publish hand started
    
    Client->>Socket: Player action (bet/fold)
    Socket->>Table: Process action
    Table->>Game: Validate and apply action
    Table->>Client: Updated game state
    Table->>Convex: Publish action event
    
    Table->>Game: Check hand completion
    Game->>Table: Hand results
    Table->>Client: Final hand state
    Table->>Convex: Publish hand ended
```

## State Management Flow

```mermaid
graph TD
    A[User Interaction] --> B[Component Event Handler]
    B --> C[Zustand Store Action]
    C --> D[Store State Update]
    D --> E[Component Re-render]
    
    F[WebSocket Message] --> G[Socket Event Handler]
    G --> H[Store Action]
    H --> D
    
    I[Web Worker] --> J[Background Processing]
    J --> K[Worker Message]
    K --> L[Store Update]
    L --> D
    
    M[Configuration Change] --> N[Config Store]
    N --> O[CSS Variables Update]
    O --> P[Layout Re-render]
    
    Q[Game State] --> R[Poker State]
    Q --> S[Blackjack State]
    Q --> T[UI State]
    
    R --> U[Hand State]
    R --> V[Player Actions]
    R --> W[Betting State]
    
    S --> X[Simulation State]
    S --> Y[Table State]
    
    T --> Z[Connection State]
    T --> AA[Player State]
    T --> BB[Table State]
    
    style A fill:#e1f5fe
    style F fill:#f3e5f5
    style I fill:#e8f5e8
    style M fill:#fff3e0
```

## Data Flow Architecture

```mermaid
graph LR
    A[Frontend Components] --> B[Zustand Stores]
    B --> C[Socket.IO Client]
    C --> D[WebSocket Server]
    D --> E[Runtime Tables]
    E --> F[Game Engine]
    
    G[Convex Functions] --> H[Convex Database]
    I[Game Server] --> J[Convex Publisher]
    J --> K[Event Ingestion]
    K --> H
    
    L[Web Workers] --> M[Background Processing]
    M --> N[Store Updates]
    N --> B
    
    O[Configuration] --> P[CSS Variables]
    P --> Q[UI Rendering]
    
    style A fill:#e1f5fe
    style G fill:#f3e5f5
    style L fill:#e8f5e8
    style O fill:#fff3e0
```

## Component Communication Patterns

```mermaid
graph TD
    A[App Component] --> B[App Content Renderer]
    B --> C[Game Selection Router]
    
    C --> D[Poker Game]
    C --> E[Blackjack Game]
    C --> F[UI Components]
    
    D --> G[Poker Flow Modules]
    D --> H[Poker Strategy]
    D --> I[Poker Hand Evaluation]
    
    E --> J[Blackjack Simulation]
    E --> K[Blackjack Table]
    
    F --> L[Shared Components]
    F --> M[Game Controls]
    F --> N[Hand Layouts]
    
    O[Stores] --> P[Lobby Store]
    P --> Q[Connection Manager]
    P --> R[Player Manager]
    P --> S[Table Manager]
    P --> T[UI Manager]
    
    U[Workers] --> V[Equity Calculator]
    U --> W[Simulation Worker]
    
    X[Configuration] --> Y[Poker Config]
    X --> Z[Blackjack Config]
    X --> AA[UI Config]
    
    style A fill:#e1f5fe
    style O fill:#f3e5f5
    style U fill:#e8f5e8
    style X fill:#fff3e0
```

## Key Communication Patterns

### 1. **Frontend to Backend Communication**
- **WebSocket**: Real-time game state updates and player actions
- **HTTP**: Static assets and initial page loads
- **Convex**: Database operations and event ingestion

### 2. **Component Communication**
- **Props**: Parent to child component data flow
- **Events**: Child to parent communication via callbacks
- **Stores**: Global state management with Zustand
- **Context**: React context for deep component trees

### 3. **State Synchronization**
- **Real-time**: WebSocket for immediate game updates
- **Persistent**: Convex database for long-term storage
- **Local**: Zustand stores for UI state and caching

### 4. **Performance Optimization**
- **Web Workers**: CPU-intensive calculations off main thread
- **Memoization**: React.memo and useMemo for expensive renders
- **Selective Updates**: Only affected components re-render
- **Background Processing**: Non-blocking UI operations

## Architecture Benefits

1. **Separation of Concerns**: Clear boundaries between frontend, backend, and database
2. **Real-time Performance**: WebSocket-based communication for immediate updates
3. **Scalability**: Modular architecture allows independent scaling of components
4. **Type Safety**: Full TypeScript coverage with runtime validation
5. **Performance**: Web Workers and optimized rendering for smooth gameplay
6. **Maintainability**: Single responsibility principle with clear module boundaries
