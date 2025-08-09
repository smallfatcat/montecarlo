import './style.css'
import {
  type Card,
  createInitialState,
  startRoundWithBet,
  playerHit,
  playerStand,
  playerDoubleDown,
  playerSurrender,
  finalizeRound,
  evaluateHand,
  getAvailableActions,
  canSplit,
  playerSplit,
  placeInsurance,
  declineInsurance,
} from './blackjack'
import { createShoe, shuffleInPlace } from './blackjack/deck'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="table">
    <h1>Blackjack</h1>

    <div class="controls">
      <div class="bankroll">Bankroll: $<span id="bankroll">0</span></div>
      <label>Bet: $ <input id="bet" type="number" value="10" min="1" step="1" /></label>
      <button id="deal">Deal</button>
      <button id="finalize">Finalize Payout</button>
      <span class="sep"></span>
      <label>Shoe decks: <input id="decks" type="number" value="6" min="1" step="1" /></label>
      <button id="new-shoe">New Shoe</button>
      <button id="reset-bankroll">Reset Bankroll</button>
      <span class="cards-left">Cards left: <span id="cards-left">0</span></span>
    </div>

    <div class="actions">
      <button id="hit">Hit</button>
      <button id="stand">Stand</button>
      <button id="double">Double</button>
      <button id="surrender">Surrender</button>
      <button id="split">Split</button>
      <button id="insure">Insurance</button>
      <button id="no-insure">No Insurance</button>
    </div>

    <div class="hands">
      <div class="hand">
        <h2>Dealer</h2>
        <div id="dealer-cards" class="cards"></div>
        <div id="dealer-total" class="total"></div>
      </div>
      <div class="hand">
        <h2>Player</h2>
        <div id="player-cards" class="cards"></div>
        <div id="player-total" class="total"></div>
      </div>
    </div>

    <div id="status" class="status"></div>
  </div>
`

const el = {
  bankroll: document.getElementById('bankroll') as HTMLSpanElement,
  bet: document.getElementById('bet') as HTMLInputElement,
  decks: document.getElementById('decks') as HTMLInputElement,
  cardsLeft: document.getElementById('cards-left') as HTMLSpanElement,
  dealerCards: document.getElementById('dealer-cards') as HTMLDivElement,
  dealerTotal: document.getElementById('dealer-total') as HTMLDivElement,
  playerCards: document.getElementById('player-cards') as HTMLDivElement,
  playerTotal: document.getElementById('player-total') as HTMLDivElement,
  status: document.getElementById('status') as HTMLDivElement,
  buttons: {
    deal: document.getElementById('deal') as HTMLButtonElement,
    finalize: document.getElementById('finalize') as HTMLButtonElement,
    hit: document.getElementById('hit') as HTMLButtonElement,
    stand: document.getElementById('stand') as HTMLButtonElement,
    double: document.getElementById('double') as HTMLButtonElement,
    surrender: document.getElementById('surrender') as HTMLButtonElement,
    split: document.getElementById('split') as HTMLButtonElement,
    insure: document.getElementById('insure') as HTMLButtonElement,
    noInsure: document.getElementById('no-insure') as HTMLButtonElement,
    newShoe: document.getElementById('new-shoe') as HTMLButtonElement,
    resetBankroll: document.getElementById('reset-bankroll') as HTMLButtonElement,
  },
}

let state = createInitialState(100)
let shoe: Card[] = []

function suitSymbol(suit: Card['suit']): string {
  switch (suit) {
    case 'Clubs':
      return '♣'
    case 'Diamonds':
      return '♦'
    case 'Hearts':
      return '♥'
    case 'Spades':
      return '♠'
  }
}

function formatCard(card: Card): string {
  return `${card.rank}${suitSymbol(card.suit)}`
}

function render() {
  el.bankroll.textContent = state.bankroll.toString()
  el.cardsLeft.textContent = String(state.deck?.length ?? 0)

  // Render hands
  const dealerCardsMasked = maskDealerCards(state.dealerHand)
  el.dealerCards.textContent = dealerCardsMasked.join(' ')
  el.playerCards.innerHTML = renderPlayerHands()

  const d = evaluateHand(state.dealerHand)
  const p = evaluateHand(state.playerHand)
  el.dealerTotal.textContent = dealerTotalLabel(state, d)
  el.playerTotal.textContent = totalLabel(p)

  // Status / outcome
  const outcomeLabel = state.outcome ? `Outcome: ${state.outcome}` : ''
  el.status.textContent = `Status: ${state.status} ${outcomeLabel}`.trim()

  // Enable/disable buttons
  const available = new Set(getAvailableActions(state))
  el.buttons.hit.disabled = !available.has('hit')
  el.buttons.stand.disabled = !available.has('stand')
  el.buttons.double.disabled = !available.has('double')
  el.buttons.surrender.disabled = !available.has('surrender')
  el.buttons.split.disabled = !canSplit(state)
  const insuranceActive = !!state.canOfferInsurance
  el.buttons.insure.disabled = !insuranceActive
  el.buttons.noInsure.disabled = !insuranceActive

  // Deal enabled when idle or round_over
  el.buttons.deal.disabled = !(state.status === 'idle' || state.status === 'round_over')
  el.buttons.finalize.disabled = state.status !== 'round_over'
}

function totalLabel(v: ReturnType<typeof evaluateHand>): string {
  if (v.isBust) return `Bust (${v.hardTotal})`
  if (v.isBlackjack) return 'Blackjack (21)'
  if (v.isSoft) return `Soft ${v.bestTotal}`
  return `${v.bestTotal}`
}

function maskDealerCards(cards: Card[]): string[] {
  // Hide hole card while it's the player's turn
  if (state.status === 'player_turn' && cards.length >= 2) {
    return [formatCard(cards[0]), '🂠']
  }
  return cards.map(formatCard)
}

function dealerTotalLabel(s: typeof state, d: ReturnType<typeof evaluateHand>): string {
  if (s.status === 'player_turn') return ''
  return totalLabel(d)
}

function renderPlayerHands(): string {
  if (!state.playerHands || state.activeHandIndex === undefined) {
    return state.playerHand.map(formatCard).join(' ')
  }
  return state.playerHands
    .map((h, i) => {
      const active = i === state.activeHandIndex ? ' (active)' : ''
      return `<div class="hand-line">Hand ${i + 1}${active}: ${h.map(formatCard).join(' ')}</div>`
    })
    .join('')
}

// Wire actions
el.buttons.deal.addEventListener('click', () => {
  const bet = Number(el.bet.value)
  try {
    // If previous round over, finalize first
    if (state.status === 'round_over') {
      state = finalizeRound(state)
    }
    // Use existing shoe if present; otherwise build a fresh standard deck
    const existing = shoe.length ? shoe : undefined
    state = startRoundWithBet(state, bet, existing, { shuffleDeck: !existing })
    // Persist shoe across rounds
    shoe = state.deck
  } catch (err) {
    alert((err as Error).message)
  }
  render()
})

el.buttons.finalize.addEventListener('click', () => {
  state = finalizeRound(state)
  render()
})

el.buttons.hit.addEventListener('click', () => {
  state = playerHit(state)
  render()
})

el.buttons.stand.addEventListener('click', () => {
  state = playerStand(state)
  render()
})

el.buttons.double.addEventListener('click', () => {
  state = playerDoubleDown(state)
  render()
})

el.buttons.surrender.addEventListener('click', () => {
  state = playerSurrender(state)
  render()
})

el.buttons.split.addEventListener('click', () => {
  state = playerSplit(state)
  render()
})

el.buttons.insure.addEventListener('click', () => {
  state = placeInsurance(state)
  render()
})

el.buttons.noInsure.addEventListener('click', () => {
  state = declineInsurance(state)
  render()
})

el.buttons.newShoe.addEventListener('click', () => {
  const n = Math.max(1, Math.floor(Number(el.decks.value) || 6))
  shoe = shuffleInPlace(createShoe(n))
  // Adopt the shoe into state for cards-left display
  state = { ...state, deck: shoe }
  render()
})

el.buttons.resetBankroll.addEventListener('click', () => {
  state = { ...state, bankroll: 100 }
  render()
})

render()
