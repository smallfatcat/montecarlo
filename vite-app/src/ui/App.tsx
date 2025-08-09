import { Table } from './Table'
import { useBlackjackGame } from './useBlackjackGame'

export function App() {
  const game = useBlackjackGame()
  return (
    <div className="table">
      <h1>Blackjack</h1>
      <Table {...game} />
    </div>
  )
}


