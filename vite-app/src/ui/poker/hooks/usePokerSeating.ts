export function usePokerSeating(
  mySeatIndex: number | null,
  table: any,
  runtimeRef: React.MutableRefObject<any>,
  clearAutoplayOnLeave: () => void,
) {
  // Rename current player (reuses 'sit' to update name; only allowed when not in hand)
  function renameCurrentPlayer(newName: string) {
    if (!newName) return
    if (mySeatIndex == null) return
    if (table.status === 'in_hand') return
    try { sessionStorage.setItem('playerName', newName) } catch {}
    runtimeRef.current?.sit?.(mySeatIndex, newName)
  }

  const sit = (seatIndex: number, name: string) => {
    // Clear autoplay when switching seats
    clearAutoplayOnLeave()
    return runtimeRef.current?.sit?.(seatIndex, name)
  }
  
  const leave = () => {
    // Clear autoplay when leaving seat
    clearAutoplayOnLeave()
    return runtimeRef.current?.leave?.()
  }

  return {
    renameCurrentPlayer,
    sit,
    leave,
  }
}
