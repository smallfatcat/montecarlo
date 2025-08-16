const Street = Object.freeze({
    PREFLOP: 0,
    FLOP: 1,
    TURN: 2,
    RIVER: 3,
    MAX: 4
});

const Player = Object.freeze({
    PLAYER_1: 0,
    PLAYER_2: 1,
    PLAYER_3: 2,
    PLAYER_4: 3,
    PLAYER_5: 4,
    PLAYER_6: 5
});
const numberOfPlayers = 6
const blinds = [10, 20]


class Game {
    constructor(players, buttonPosition, blinds) {
        this.buttonPosition = buttonPosition
        this.bigBlindPosition = (buttonPosition + 1) % numberOfPlayers
        this.smallBlindPosition = (buttonPosition + 2) % numberOfPlayers
        this.players = players
        this.activePlayer = (buttonPosition + 3) % numberOfPlayers
        this.currentStreet = Street.PREFLOP
        this.bets = []
        for (let streetIdx = 0; streetIdx < Street.MAX; streetIdx++) {
            const streetPot = []
            for (let playerIdx = 0; playerIdx < numberOfPlayers; playerIdx++) {
                streetPot.push(0)
            }
            this.bets.push(streetPot)
        }
        this.addBet(this.bigBlindPosition, Street.PREFLOP, blinds[0])
        this.addBet(this.smallBlindPosition, Street.PREFLOP, blinds[1])
    }

    addBet = (player, street, bet) => {
        console.log('addBet', player, street, bet)
        this.players[player].chips -= bet
        this.bets[street][player] += bet
    }

    getNextActivePlayer = () => {
        // Use this.activePlayer to ensure access to the current active player
        const nextActivePlayer = (this.activePlayer + 1) % numberOfPlayers;
        this.activePlayer = nextActivePlayer;
        return this.activePlayer;
    }

    getStreetPotTotal = (street) => {
        return this.bets[street].reduce((acc, bet) => acc + bet, 0)
    }

    getStreetPot = (street) => {
        return this.bets[street]
    }

    nextStreet = () => {
        this.activePlayer = (this.buttonPosition + 1) % numberOfPlayers
        this.currentStreet = this.currentStreet+ 1
    }

    getStreet = () => {
        return this.currentStreet
    }

    getPlayerChips = (playerIdx) => {
        return this.players[playerIdx].chips
    }

    getAllPlayerChips = () => {
        // console.log(this.players)
        return this.players.map(player => player.chips)
    }

    getPlayerSeat = (playerIdx) => {
        return this.players[playerIdx].seat
    }

    getToCall = (streetIdx, playerIdx) => {
        return this.getCallAmount(streetIdx) - this.bets[streetIdx][playerIdx]
    }

    getCallAmount = (streetIdx) => {
        return Math.max(...this.bets[streetIdx])
    }

    callBet = (streetIdx, playerIdx) => {
        console.log('callBet', 'streetIdx', streetIdx, 'playerIdx', playerIdx, 'toCall', this.getToCall(streetIdx, playerIdx))
        this.addBet(playerIdx, streetIdx, this.getToCall(streetIdx, playerIdx))
    }

    checkFinished = () => {
        const streetBets = this.bets[this.currentStreet];
        return streetBets.every(bet => bet === streetBets[0]);
    }
    
}

const createPlayers = () => {
    const players = []
    for (let playerIdx = 0; playerIdx < numberOfPlayers; playerIdx++) {
        const player = {
            name: 'Player ' + (playerIdx + 1),
            chips: 1000,
            seat: playerIdx,
            isCPU: false,
            isHuman: true,
            isInHand: true,
            isFolded: false,
            isAllIn: false,
            isActive: true,
        }
        players.push(player)
    }
    return players
}

const players = createPlayers()

const currentGame = new Game(players, 0, blinds)

const debugState = (game) => {
    tempStreet = game.currentStreet
    tempActivePlayer = game.activePlayer
    game.currentStreet = Street.PREFLOP
    headers = ['street', 'pot', 'pots', 'activePlayerName', 'allPlayerChips', 'callamount', 'toCall', 'finished']
    widths = headers.map(header => header.length)
    dataLines = []
    for (let streetIdx = 0; streetIdx < Street.MAX; streetIdx++) {
        data = [
            game.getStreet(),
            game.getStreetPotTotal(streetIdx),
            game.getStreetPot(streetIdx),
            game.players[game.activePlayer].name,
            game.getAllPlayerChips(),
            game.getCallAmount(streetIdx),
            game.getToCall(streetIdx, game.activePlayer),
            game.checkFinished()
        ]
        strings = data.map(line => String(line))
        widths = strings.map((string, index) => Math.max(widths[index], string.length))
        dataLines.push(strings)
        game.nextStreet()
    }
    console.log(headers.map((header, index) => header.padEnd(widths[index], ' ')).join('|'))
    dataLines.map(line => console.log(line.map((string, index) => string.padStart(widths[index], ' ')).join('|')))
    game.currentStreet = tempStreet
    game.activePlayer = tempActivePlayer
}

debugState(currentGame)

count = 0
while(!currentGame.checkFinished()) {
    count++
    console.log('')
    console.log('round: ', count)
    currentGame.callBet(currentGame.currentStreet, currentGame.activePlayer)
    currentGame.getNextActivePlayer()
    debugState(currentGame)
    if(currentGame.checkFinished()) {
        if(currentGame.currentStreet == Street.RIVER) {
            console.log(currentGame.currentStreet)
            break
        }
        currentGame.nextStreet()
        currentGame.addBet(currentGame.activePlayer, currentGame.currentStreet, 10)
        currentGame.getNextActivePlayer()
    }
}
console.log(count, 'rounds')