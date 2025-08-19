# Convex Real-Time Data Flow

This document focuses on the real-time aspects of the Convex integration, showing how poker game events flow through the system in real-time.

## Real-Time Event Flow

```mermaid
graph TB
    subgraph "Game Engine"
        A[Poker Game State]
        B[Player Actions]
        C[Game Events]
    end
    
    subgraph "Event Processing"
        D[Event Emitter]
        E[Event Queue]
        F[HTTP Client]
    end
    
    subgraph "Convex Backend"
        G[HTTP Endpoints]
        H[Internal Mutations]
        I[Database Updates]
        J[Real-time Triggers]
    end
    
    subgraph "Frontend"
        K[Convex Client]
        L[React Components]
        M[Real-time UI Updates]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> E
    E --> F
    F --> G
    
    G --> H
    H --> I
    I --> J
    
    J --> K
    K --> L
    L --> M
    
    style A fill:#10b981
    style D fill:#f59e0b
    style G fill:#3b82f6
    style I fill:#8b5cf6
    style J fill:#ef4444
    style K fill:#7c3aed
    style M fill:#059669
```

## Event Processing Pipeline

```mermaid
sequenceDiagram
    participant GE as Game Engine
    participant GS as Game Server
    participant CV as Convex Backend
    participant DB as Database
    participant FC as Frontend Client
    participant UI as User Interface
    
    Note over GE,UI: Real-time Event Processing
    
    GE->>GS: Game Event Generated
    GS->>GS: Validate Event
    GS->>CV: HTTP POST /ingest/*
    CV->>CV: Verify Authentication
    CV->>CV: Check Idempotency
    CV->>DB: Execute Mutation
    
    Note over CV,UI: Real-time Propagation
    
    CV->>CV: Trigger Real-time Updates
    CV->>FC: Push Update via WebSocket
    FC->>UI: Update Component State
    UI->>UI: Re-render UI
    
    Note over GE,UI: Event Acknowledgment
    
    CV->>GS: Return 204 Success
    GS->>GE: Event Processed
    GE->>GE: Continue Game Flow
```

## WebSocket Connection Flow

```mermaid
graph LR
    A[Frontend App] --> B[Convex Client]
    B --> C[WebSocket Connection]
    C --> D[Convex Backend]
    D --> E[Authentication]
    E --> F[Subscription Setup]
    F --> G[Real-time Channel]
    
    style A fill:#10b981
    style B fill:#7c3aed
    style C fill:#3b82f6
    style D fill:#8b82f6
    style E fill:#f59e0b
    style F fill:#ef4444
    style G fill:#059669
```

## Subscription Management

```mermaid
flowchart TD
    A[Component Mount] --> B[Setup Convex Query]
    B --> C[Subscribe to Data]
    C --> D{Data Changed?}
    
    D -->|Yes| E[Update Component State]
    D -->|No| F[Wait for Changes]
    
    E --> G[Trigger Re-render]
    G --> H[Update UI]
    H --> F
    
    F --> I{Component Unmount?}
    I -->|Yes| J[Unsubscribe from Query]
    I -->|No| F
    
    style A fill:#10b981
    style B fill:#7c3aed
    style C fill:#3b82f6
    style E fill:#f59e0b
    style G fill:#ef4444
    style H fill:#8b5cf6
    style J fill:#dc2626
```

## Data Synchronization Strategy

```mermaid
graph TB
    subgraph "Optimistic Updates"
        A[User Action]
        B[Immediate UI Update]
        C[Send to Server]
    end
    
    subgraph "Server Processing"
        D[Validate Action]
        E[Update Database]
        F[Broadcast Change]
    end
    
    subgraph "Conflict Resolution"
        G[Compare Versions]
        H{Conflict?}
        H -->|Yes| I[Resolve Conflict]
        H -->|No| J[Accept Update]
    end
    
    subgraph "Final State"
        K[Sync UI State]
        L[Update History]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    I --> K
    J --> K
    K --> L
    
    style A fill:#10b981
    style B fill:#f59e0b
    style C fill:#3b82f6
    style E fill:#8b5cf6
    style F fill:#ef4444
    style I fill:#dc2626
    style J fill:#059669
    style K fill:#7c3aed
```

## Performance Optimization

```mermaid
graph LR
    subgraph "Query Optimization"
        A[Indexed Queries]
        B[Pagination]
        C[Selective Fields]
    end
    
    subgraph "Caching Strategy"
        D[Query Result Cache]
        E[Subscription Reuse]
        F[Background Updates]
    end
    
    subgraph "Network Efficiency"
        G[WebSocket Connection]
        H[Batch Updates]
        I[Delta Updates]
    end
    
    A --> J[Fast Response]
    B --> J
    C --> J
    
    D --> K[Reduced Latency]
    E --> K
    F --> K
    
    G --> L[Real-time Sync]
    H --> L
    I --> L
    
    style A fill:#10b981
    style B fill:#10b981
    style C fill:#10b981
    style D fill:#f59e0b
    style E fill:#f59e0b
    style F fill:#f59e0b
    style G fill:#3b82f6
    style H fill:#3b82f6
    style I fill:#3b82f6
    style J fill:#059669
    style K fill:#f59e0b
    style L fill:#3b82f6
```

## Error Handling and Recovery

```mermaid
flowchart TD
    A[Event Processing] --> B{Success?}
    
    B -->|Yes| C[Continue Flow]
    B -->|No| D[Error Handler]
    
    D --> E{Error Type?}
    E -->|Network| F[Retry Logic]
    E -->|Validation| G[User Feedback]
    E -->|Server| H[Fallback Mode]
    
    F --> I{Retry Count < Max?}
    I -->|Yes| J[Exponential Backoff]
    I -->|No| K[Permanent Failure]
    
    J --> L[Re-attempt Event]
    L --> A
    
    G --> M[Show Error Message]
    H --> N[Use Cached Data]
    
    style A fill:#10b981
    style B fill:#dbeafe
    style C fill:#059669
    style D fill:#fef3c7
    style F fill:#f59e0b
    style G fill:#ef4444
    style H fill:#8b5cf6
    style J fill:#f59e0b
    style K fill:#dc2626
    style L fill:#3b82f6
    style M fill:#ef4444
    style N fill:#8b5cf6
```

## Real-Time Metrics

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Event Latency | <100ms | TBD | End-to-end processing |
| UI Update Time | <50ms | TBD | Component re-render |
| WebSocket Ping | <10ms | TBD | Connection health |
| Query Response | <20ms | TBD | Database operations |
| Mutation Success | >99% | TBD | Event processing rate |

## Scaling Considerations

```mermaid
graph TB
    subgraph "Current Architecture"
        A[Single Convex Instance]
        B[Single Game Server]
        C[Multiple Frontend Clients]
    end
    
    subgraph "Scaled Architecture"
        D[Load Balanced Convex]
        E[Multiple Game Servers]
        F[Redis Event Bus]
        G[Horizontal Scaling]
    end
    
    A --> H[Vertical Scaling]
    B --> H
    C --> H
    
    D --> I[Horizontal Scaling]
    E --> I
    F --> I
    G --> I
    
    style A fill:#10b981
    style B fill:#f59e0b
    style C fill:#3b82f6
    style D fill:#8b5cf6
    style E fill:#ef4444
    style F fill:#7c3aed
    style G fill:#059669
    style H fill:#f59e0b
    style I fill:#8b5cf6
```

## Development Workflow

```mermaid
graph LR
    A[Code Changes] --> B[Convex Dev Mode]
    B --> C[Hot Reload Functions]
    C --> D[Test Real-time Updates]
    D --> E{Working?}
    
    E -->|Yes| F[Commit Changes]
    E -->|No| G[Debug & Fix]
    
    G --> A
    F --> H[Deploy to Production]
    
    style A fill:#10b981
    style B fill:#7c3aed
    style C fill:#3b82f6
    style D fill:#f59e0b
    style E fill:#dbeafe
    style F fill:#059669
    style G fill:#ef4444
    style H fill:#8b5cf6
```

This real-time architecture ensures:

- **Immediate UI updates** for better user experience
- **Efficient data synchronization** between game server and frontend
- **Robust error handling** with automatic retry mechanisms
- **Scalable infrastructure** for handling multiple concurrent games
- **Developer-friendly workflow** with hot reloading and real-time testing
