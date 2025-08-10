import { useEffect, useState } from 'react'
import { CONFIG } from '../config'
import { useTableGame } from './useTableGame'
import { useSimulationRunner } from './useSimulationRunner'
import { TableControls } from './controls/TableControls'
import { ActionBar } from './controls/ActionBar'
import { HandsMulti } from './handLayouts/HandsMulti'
import { HandsFlat } from './handLayouts/HandsFlat'

export function Table() {
  const {
    table,
    bankrolls,
    setBankrolls,
    casinoBank,
    setCasinoBank,
    numPlayers,
    setPlayers,
    betsBySeat,
    // setBetsBySeat,
    roundId,
    deal,
    newShoe,
    hit,
    stand,
    double,
    split,
    available,
    deckCount,
    autoPlay,
    setAutoPlay,
    suggested,
    histories,
    // rulesVersion,
    updateRules,
  } = useTableGame()

  const [view, setView] = useState<'multi'|'flat'>(CONFIG.ui.defaultView)
  const [handsPerRun, setHandsPerRun] = useState<number>(CONFIG.simulation.handsPerRun)
  const [bet, setBet] = useState<number>(CONFIG.bets.defaultPerSeat)
  const [decks, setDecks] = useState<number>(deckCount)

  const sim = useSimulationRunner()
  const controlsRightExtras = (
    <label>
      View:
      <select value={view} onChange={(e) => setView(e.target.value as 'multi'|'flat')}>
        <option value="multi">Multi-seat Grid</option>
        <option value="flat">Flat (Dealer Top, Players Bottom)</option>
      </select>
    </label>
  )

  const runSim = () => sim.run({
    numHands: handsPerRun,
    numPlayers,
    deckCount: decks,
    initialBankrolls: bankrolls,
    casinoInitial: casinoBank,
    betsBySeat,
  }, ({ finalBankrolls, finalCasinoBank }) => {
    setBankrolls(finalBankrolls)
    setCasinoBank(finalCasinoBank)
  })

  // Adapt max app width by view to prevent wrapping in flat mode
  useEffect(() => {
    const root = document.documentElement
    if (view === 'flat') {
      // Expand app width in flat view to avoid overflow of seats
      const minFlatWidth = Math.max(
        CONFIG.layout.flatAppMaxWidthPx,
        CONFIG.layout.flat.edgePaddingPx * 2 + (CONFIG.table.maxPlayers * CONFIG.layout.flat.seatLowerBoundWidthPx) + (CONFIG.layout.flat.playersLaneGapPx * (CONFIG.table.maxPlayers - 1))
      )
      root.style.setProperty('--app-max-width', `${minFlatWidth}px`)
      // Keep controls at the narrower multi width for consistency
      root.style.setProperty('--controls-max-width', `${CONFIG.layout.appMaxWidthPx}px`)
    } else {
      // Constrain multi view to its standard width
      root.style.setProperty('--app-max-width', `${CONFIG.layout.appMaxWidthPx}px`)
      root.style.setProperty('--controls-max-width', `${CONFIG.layout.appMaxWidthPx}px`)
    }
  }, [view, numPlayers])

  return (
    <div className="table">
      <h1>Blackjack</h1>

      <div className="controls-container">
        <TableControls
          bankrolls={bankrolls}
          setBankrolls={setBankrolls}
          numPlayers={numPlayers}
          setPlayers={setPlayers}
          deckCount={decks}
          setDecks={setDecks}
          newShoe={newShoe}
          handsPerRun={handsPerRun}
          setHandsPerRun={setHandsPerRun}
          casinoBank={casinoBank}
          table={table}
          histories={histories}
          rules={CONFIG.rules}
          updateRules={updateRules}
          sim={{ run: runSim, progress: sim.progress }}
          rightExtras={controlsRightExtras}
        />
      </div>

      <ActionBar
        table={table}
        available={available}
        deal={deal}
        hit={hit}
        stand={stand}
        double={double}
        split={split}
        autoPlay={autoPlay}
        setAutoPlay={setAutoPlay}
        bet={bet}
        setBet={setBet}
      />

      {view === 'multi' ? (
        <HandsMulti table={table} roundId={roundId} bankrolls={bankrolls} suggested={suggested as any} />
      ) : (
        <div style={{ position: 'relative', minHeight: `${CONFIG.layout.flat.containerMinHeightVh}vh`, paddingTop: CONFIG.layout.flat.containerPaddingTopPx, paddingBottom: CONFIG.layout.flat.containerPaddingBottomPx }}>
          <HandsFlat table={table} roundId={roundId} />
        </div>
      )}
    </div>
  )
}


