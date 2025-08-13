import { C2S } from '../protocol';
export function createInMemoryTable(tableId, opts) {
    // For now, stub state transitions server-side; we will later extract PokerRuntime/flow.
    let lastAction = null;
    let auto = false;
    let handId = 0;
    return {
        tableId,
        beginHand() {
            handId += 1;
        },
        act(action) {
            // Basic validation only
            const parsed = C2S.act.safeParse({ tableId, action });
            if (!parsed.success)
                throw new Error('invalid action');
            lastAction = action;
        },
        setAuto(v) {
            auto = v;
        },
        getState() {
            return { tableId, handId, auto, lastAction };
        },
    };
}
