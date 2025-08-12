## Poker Autoplay Orchestrator Rewrite – Tracking Doc

Scope: Replace rAF-based event queue with a background-safe timer scheduler; centralize orchestration for poker autoplay, reveals, and auto-deal; ensure idempotent, unique scheduling.

### Goals
- Reliable autoplay in background/low-FPS tabs
- Eliminate duplicate-timer races via scheduler-level uniqueness
- Keep game engines pure; move orchestration out of UI timing effects over time

### Plan and Status

1) Implement timeout-based scheduler with unique scheduling
- API: `schedule(fn, delayMs)`, `scheduleUnique(fn, delayMs, tag)`, `cancel(id)`, `clearByTag(tag)`, `clearAll()`
- File: `vite-app/src/ui/poker/useTimerQueue.ts`
- Status: DONE

2) Switch poker autoplay to new scheduler
- Replace `useEventQueue` with `useTimerQueue`
- Use `scheduleUnique` for: cpu-action, player-action, auto-deal, deal-next
- Add unmount cleanup to clear pending timers
- File: `vite-app/src/ui/poker/usePokerGame.ts`
- Status: DONE

3) Validate with build and tests
- `npm run build` and `npm test`
- Status: DONE

4) Improve reveal orchestration (phase 2)
- Move `revealBusyUntilMs` and staged reveal logic into an orchestrator module
- UI emits `animationDone` instead of keeping guard timestamps (partial: blocker API in place via `busyUntilMs`/`blockFor`)
- Files: `vite-app/src/ui/poker/usePokerOrchestrator.ts`, refactors in `usePokerGame.ts`
- Status: DONE (phase 2 initial extraction)

5) Create a shared orchestration pattern for blackjack (phase 3)
- Reuse `useTimerQueue` and unique scheduling
- Status: TODO

6) Tests to add/expand
- Scheduler unit tests (ordering, uniqueness, cancellation, earliest re-arm)
- Orchestrator tests with virtual-time scheduler (future)
- Autoplay integration assertions (hands advance, no stalls)
- Status: TODO

### Notes
- React StrictMode and HMR can double-run effects; `scheduleUnique(tag, ...)` plus turn-key checks keep executions idempotent.
- rAF is not suitable for timers; use setTimeout to survive background throttling.


