# State Machine System Flowcharts

This document provides visual representations of the state machine system implemented in the Montecarlo poker engine. All diagrams use Mermaid syntax for easy viewing and maintenance.

## Overview

The state machine system consists of several interconnected components:
1. **Game State Machine** - High-level game flow management
2. **Hand Progression Machine** - Detailed hand progression through betting rounds
3. **Timer Integration** - Centralized timer management system
4. **Runtime Integration** - Seamless integration with existing PokerRuntime
5. **Debug Controls** - Real-time debugging and monitoring capabilities

## 1. Game State Machine Flow

```mermaid
stateDiagram-v2
    [*] --> idle
    
    idle --> waiting_for_players : PLAYERS_READY
    waiting_for_players --> hand_in_progress : START_HAND
    waiting_for_players --> idle : PLAYERS_LEFT
    
    hand_in_progress --> hand_complete : HAND_COMPLETE
    hand_in_progress --> game_over : GAME_OVER
    
    hand_complete --> hand_in_progress : START_NEXT_HAND
    hand_complete --> game_over : GAME_OVER
    
    game_over --> [*]
    
    note right of idle
        Initial state
        No players connected
    end note
    
    note right of waiting_for_players
        Players seated
        Ready to start hand
    end note
    
    note right of hand_in_progress
        Active hand in progress
        Players taking actions
    end note
    
    note right of hand_complete
        Hand finished
        Pot distributed
    end note
    
    note right of game_over
        Game ended
        Table reset required
    end note
```

## 2. Hand Progression State Machine

```mermaid
stateDiagram-v2
    [*] --> preflop
    
    preflop --> flop : ROUND_COMPLETE
    preflop --> showdown : ALL_BUT_ONE_FOLDED
    
    flop --> turn : ROUND_COMPLETE
    flop --> showdown : ALL_BUT_ONE_FOLDED
    
    turn --> river : ROUND_COMPLETE
    turn --> showdown : ALL_BUT_ONE_FOLDED
    
    river --> showdown : ROUND_COMPLETE
    river --> showdown : ALL_BUT_ONE_FOLDED
    
    showdown --> hand_complete : HAND_SETTLED
    
    hand_complete --> [*]
    
    note right of preflop
        Initial betting round
        Hole cards dealt
        Blinds posted
    end note
    
    note right of flop
        First community cards
        3 cards dealt
        Betting round
    end note
    
    note right of turn
        Fourth community card
        Betting round
    end note
    
    note right of river
        Fifth community card
        Final betting round
    end note
    
    note right of showdown
        All players reveal
        Best hand wins
    end note
```

## 3. Player Action Flow Within Betting Rounds

```mermaid
stateDiagram-v2
    [*] --> waiting_for_action
    
    waiting_for_action --> processing_action : Player Action
    processing_action --> action_complete : Action Processed
    
    action_complete --> checking_round : Round Check
    
    checking_round --> waiting_for_action : More Players Need to Act
    checking_round --> round_complete : Round Complete
    
    round_complete --> checking_game : Game Check
    
    checking_game --> waiting_for_action : Game Not Complete
    checking_game --> hand_complete : Hand Complete
    
    hand_complete --> [*]
    
    note right of waiting_for_action
        Actions available:
        - fold, check, call
        - bet, raise
        
        Validated based on:
        - Current street
        - Player position
        - Betting history
        - Chip stack
    end note
    
    note right of action_complete
        Updates include:
        - Player chips
        - Pot size
        - Action history
        - Timer reset
    end note
```

## 4. Timer Integration System

```mermaid
stateDiagram-v2
    [*] --> timer_idle
    
    timer_idle --> player_action_timer : Player Action Timer
    timer_idle --> cpu_action_timer : CPU Action Timer
    timer_idle --> autodeal_timer : Autodeal Timer
    timer_idle --> street_transition_timer : Street Transition Timer
    
    player_action_timer --> player_responded : Player Responded
    player_action_timer --> player_timeout : Timeout
    
    player_responded --> timer_idle : Cancel Timer
    player_timeout --> auto_action : Execute Auto Action
    
    cpu_action_timer --> cpu_decision : CPU Decision Time
    cpu_decision --> cpu_action_executed : Execute CPU Action
    
    autodeal_timer --> autoplay_check : Check Autoplay
    
    autoplay_check --> next_hand_started : Autoplay Enabled
    autoplay_check --> manual_wait : Wait for Manual Start
    
    street_transition_timer --> street_advanced : Advance Street
    
    auto_action --> timer_idle : Continue Game
    cpu_action_executed --> timer_idle : Continue Game
    next_hand_started --> timer_idle : Continue Game
    manual_wait --> timer_idle : Continue Game
    street_advanced --> timer_idle : Continue Game
    
    note right of timer_idle
        Timer events triggered by:
        - State transitions
        - Player actions
        - Game progression
    end note
    
    note right of player_timeout
        Auto actions based on:
        - Player preferences
        - Game rules
        - Default strategies
    end note
```

## 5. Runtime Integration Architecture

```mermaid
stateDiagram-v2
    [*] --> runtime_idle
    
    runtime_idle --> adapter_active : State Machine Enabled
    runtime_idle --> legacy_only : State Machine Disabled
    
    adapter_active --> state_machine_processing : Process Events
    legacy_only --> direct_runtime_calls : Direct Calls
    
    state_machine_processing --> state_synchronization : Sync State
    direct_runtime_calls --> update_runtime_state : Update State
    
    state_synchronization --> update_runtime_state : Update Runtime
    
    update_runtime_state --> emit_events : Emit to Clients
    
    emit_events --> runtime_idle : Continue
    
    %% Debug Control Flow
    debug_controls --> debug_toggle : Toggle Debug Mode
    debug_toggle --> websocket_message : Send Message
    websocket_message --> server_handler : Server Process
    server_handler --> update_debug_state : Update Debug
    update_debug_state --> toggle_logging : Toggle Logging
    
    toggle_logging --> runtime_idle : Continue
    
    note right of adapter_active
        Adapter provides:
        - Seamless integration
        - Feature toggles
        - State synchronization
        - Error recovery
    end note
    
    note right of state_synchronization
        Synchronization ensures:
        - State consistency
        - Data integrity
        - Event ordering
    end note
```

## 6. Debug Control Flow

```mermaid
stateDiagram-v2
    [*] --> debug_idle
    
    debug_idle --> ui_interaction : User clicks debug toggle
    ui_interaction --> websocket_message : Send toggleDebugMode
    
    websocket_message --> server_processing : Server receives message
    server_processing --> runtime_update : Update runtime debug state
    runtime_update --> state_machine_update : Update state machine debug
    
    state_machine_update --> logging_toggle : Toggle logging
    logging_toggle --> debug_active : Debug mode active
    
    debug_active --> state_transition_logging : Log state transitions
    debug_active --> timer_event_logging : Log timer events
    debug_active --> player_action_logging : Log player actions
    debug_active --> performance_metrics : Collect performance metrics
    
    state_transition_logging --> debug_operation : Continue debug operations
    timer_event_logging --> debug_operation : Continue debug operations
    player_action_logging --> debug_operation : Continue debug operations
    performance_metrics --> debug_operation : Continue debug operations
    
    debug_operation --> debug_active : Continue debugging
    
    %% UI Update Flow
    server_processing --> ui_update : Send debugModeChanged event
    ui_update --> ui_state_updated : Update UI state
    
    note right of ui_interaction
        Debug toggle button
        in table controls
    end note
    
    note right of debug_active
        Comprehensive logging:
        - State changes
        - Timer operations
        - Performance metrics
        - Error conditions
    end note
```

## 7. Complete State Machine Integration Flow

```mermaid
stateDiagram-v2
    [*] --> game_start
    
    game_start --> initializing : Initialize State Machines
    initializing --> game_idle : Machines Ready
    
    game_idle --> players_joining : Players Join
    players_joining --> waiting_for_players : Players Seated
    
    waiting_for_players --> starting_hand : Start Hand
    starting_hand --> hand_in_progress : Hand Started
    
    hand_in_progress --> preflop_state : Preflop
    
    preflop_state --> player_actions : Player Actions
    player_actions --> action_validation : Validate Action
    
    action_validation --> invalid_action : Invalid Action
    action_validation --> valid_action : Valid Action
    
    invalid_action --> player_actions : Retry Action
    valid_action --> context_update : Update Context
    
    context_update --> round_check : Check Round
    
    round_check --> player_actions : More Actions Needed
    round_check --> street_advancement : Round Complete
    
    street_advancement --> game_check : Check Game
    
    game_check --> player_actions : Game Not Complete
    game_check --> hand_complete : Hand Complete
    
    hand_complete --> continue_check : Continue Game?
    
    continue_check --> starting_hand : Yes - Start Next
    continue_check --> game_over : No - End Game
    
    game_over --> [*]
    
    %% Timer System
    timer_system --> monitoring_timers : Monitor All Timers
    monitoring_timers --> handling_timeouts : Handle Timeouts
    handling_timeouts --> auto_actions : Execute Auto Actions
    auto_actions --> player_actions : Continue Actions
    
    %% Debug System
    debug_system --> monitoring_changes : Monitor State Changes
    monitoring_changes --> logging_transitions : Log Transitions
    logging_transitions --> performance_metrics : Performance Metrics
    
    note right of initializing
        Initialize:
        - Game state machine
        - Hand progression machine
        - Timer manager
        - Runtime adapter
    end note
    
    note right of player_actions
        Actions include:
        - fold, check, call
        - bet, raise
        - Timer management
        - State validation
    end note
```

## 8. Error Handling and Recovery Flow

```mermaid
stateDiagram-v2
    [*] --> normal_operation
    
    normal_operation --> error_check : Check for Errors
    
    error_check --> continue_normal : No Errors
    error_check --> error_classification : Error Detected
    
    continue_normal --> normal_operation : Continue
    
    error_classification --> invalid_transition : Invalid Transition
    error_classification --> state_inconsistency : State Inconsistency
    error_classification --> timer_failure : Timer Failure
    error_classification --> runtime_error : Runtime Error
    
    invalid_transition --> prevent_transition : Prevent Transition
    state_inconsistency --> state_recovery : Restore Valid State
    timer_failure --> timer_reset : Restart Timer
    runtime_error --> runtime_recovery : Fallback to Legacy
    
    prevent_transition --> log_error : Log Error
    state_recovery --> log_error : Log Recovery
    timer_reset --> log_error : Log Reset
    runtime_recovery --> log_error : Log Recovery
    
    log_error --> notify_debug : Notify Debug System
    notify_debug --> continue_operation : Continue Operation
    
    continue_operation --> normal_operation : Resume Normal
    
    note right of error_classification
        Error types:
        - Validation errors
        - State conflicts
        - Timer failures
        - Runtime errors
    end note
    
    note right of continue_operation
        Recovery ensures:
        - Game continuity
        - State consistency
        - Player experience
        - Debug visibility
    end note
```

## 9. Performance Monitoring and Metrics

```mermaid
stateDiagram-v2
    [*] --> performance_monitoring
    
    performance_monitoring --> metrics_collection : Collect Metrics
    
    metrics_collection --> timer_metrics : Timer Metrics
    metrics_collection --> transition_metrics : State Transition Metrics
    metrics_collection --> action_metrics : Action Processing Metrics
    
    timer_metrics --> timer_statistics : Timer Usage Statistics
    transition_metrics --> transition_timing : Transition Timing
    action_metrics --> action_response_times : Action Response Times
    
    timer_statistics --> performance_dashboard : Performance Dashboard
    transition_timing --> performance_dashboard : Add to Dashboard
    action_response_times --> performance_dashboard : Add to Dashboard
    
    performance_dashboard --> performance_analysis : Analyze Performance
    
    performance_analysis --> no_issues : No Issues Detected
    performance_analysis --> issues_detected : Issues Detected
    
    no_issues --> continue_monitoring : Continue Monitoring
    issues_detected --> performance_optimization : Optimize Performance
    
    continue_monitoring --> performance_monitoring : Resume Monitoring
    
    performance_optimization --> optimize_operations : Optimize Slow Operations
    optimize_operations --> update_configs : Update Timer Configs
    update_configs --> performance_monitoring : Resume Monitoring
    
    note right of metrics_collection
        Metrics tracked:
        - Timer efficiency
        - State change speed
        - Action processing time
        - Memory usage
    end note
    
    note right of performance_optimization
        Optimization includes:
        - Timer tuning
        - State caching
        - Action batching
        - Memory management
    end note
```

## 10. Production Deployment Flow

```mermaid
stateDiagram-v2
    [*] --> development_complete
    
    development_complete --> feature_testing : Start Testing
    
    feature_testing --> state_machine_tests : State Machine Tests
    feature_testing --> integration_tests : Integration Tests
    feature_testing --> performance_tests : Performance Tests
    
    state_machine_tests --> test_evaluation : Evaluate Tests
    integration_tests --> test_evaluation : Add Results
    performance_tests --> test_evaluation : Add Results
    
    test_evaluation --> tests_passed : All Tests Pass
    test_evaluation --> tests_failed : Tests Failed
    
    tests_failed --> fix_issues : Fix Issues
    fix_issues --> feature_testing : Retest
    
    tests_passed --> production_deployment : Deploy to Production
    
    production_deployment --> enable_state_machines : Enable State Machines
    enable_state_machines --> monitor_performance : Monitor Performance
    
    monitor_performance --> issues_detected : Issues Found
    monitor_performance --> no_issues : No Issues
    
    no_issues --> full_production : Full Production
    issues_detected --> rollback_or_fix : Rollback or Fix
    
    rollback_or_fix --> update_configuration : Update Configuration
    update_configuration --> redeploy : Re-deploy
    redeploy --> monitor_performance : Resume Monitoring
    
    full_production --> production_monitoring : Production Monitoring
    
    note right of production_deployment
        Deployment options:
        - Gradual migration
        - Full replacement
        - Hybrid approach
    end note
    
    note right of production_monitoring
        Monitor:
        - Performance metrics
        - Error rates
        - User experience
        - System stability
    end note
```

## Summary

These flowcharts provide a comprehensive visual representation of the state machine system implementation. Key features include:

- **Clear State Transitions**: Explicit game flow with validation
- **Hand Progression**: Detailed betting round management
- **Timer Integration**: Centralized timer system for all game events
- **Runtime Integration**: Seamless integration with existing systems
- **Debug Controls**: Real-time debugging and monitoring
- **Error Handling**: Comprehensive error recovery and validation
- **Performance Monitoring**: Built-in metrics and optimization tools
- **Production Ready**: Full integration with deployment options

The system is designed to be maintainable, testable, and production-ready while providing significant improvements over the previous manual state management approach.
