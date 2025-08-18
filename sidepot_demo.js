class Pots {
    constructor(playerData) {
        this.sidepots = []
        this.players = []
        this.stacks = []
        for (let player in playerData) {
            this.stacks.push(playerData[player].stack)
        }
        for (let player in playerData) {
            this.players.push(player)
        }
        const levels = []
        for (let i = 0; i < this.stacks.length; i++) {
            if (!levels.includes(this.stacks[i])) {
                levels.push(this.stacks[i])
            }
        }
        levels.sort((a, b) => a - b)
        let prevLevel = 0
        for (let i = 0; i < levels.length; i++) {
            let level = levels[i]
            let newLevel = level - prevLevel
            prevLevel = level
            let sidepot = {}
            this.players.map(player => { sidepot[player] = 0 })
            sidepot.level = newLevel
            this.sidepots.push(sidepot)
        }
        info("Pots", "Created " + this.sidepots.length + " sidepots")
    }

    addBet(player, amount) {
        info("addBet", "Player " + player + " -" + amount)
        for (let i = 0; i < this.sidepots.length; i++) {
            let level = this.sidepots[i].level
            let allowedBetForLevel = Math.min(amount, level)
            this.sidepots[i][player] = allowedBetForLevel
            amount = amount - allowedBetForLevel
            if (amount === 0) {
                return
            }
        }
    }

    playersEligibleForPot(sidepotIndex) {
        let eligibleForPot = []
        this.players.map(player => { this.sidepots[sidepotIndex][player] > 0 ? eligibleForPot.push(player) : null })
        return eligibleForPot
    }

    getPotTotal(sidepotIndex) {
        let total = 0
        this.players.map(player => { total += this.sidepots[sidepotIndex][player] })
        return total
    }

}

const allIn = (playerData, pots, player) => {
    playerData[player].isAllIn = true
    amount = playerData[player].stack
    pots.addBet(player, amount)
    playerData[player].stack = playerData[player].stack - amount
}

const getWinners = (playerData, handStrengths, playersEligibleForPot) => {
    let winners = []
    let maxHandStrength = 0
    for (let player in handStrengths) {
        if (playersEligibleForPot.includes(player)) {
            if (handStrengths[player] > maxHandStrength && !playerData[player].isFolded) {
                maxHandStrength = handStrengths[player]
            }
        }
    }
    playersEligibleForPot.map(player => {
        if (handStrengths[player] === maxHandStrength && !playerData[player].isFolded) {
            winners.push(player)
        }
    })
    return winners
}

const calculateSidepotWinners = (playerData, pots) => {
    let handStrengths = {}
    for (let player in playerData) {
        handStrengths[player] = playerData[player].handStrength
    }

    for (let i = 0; i < pots.sidepots.length; i++) {
        let winners = getWinners(playerData, handStrengths, pots.playersEligibleForPot(i))
        let payout = pots.getPotTotal(i) / winners.length
        winners.map(winner => {
            playerData[winner].stack = playerData[winner].stack + payout
            info("calculateSidepotWinners", "Player " + winner + " +" + payout)
        })
    }
}

class Player {
    constructor(stack, handStrength) {
        this.stack = stack
        this.handStrength = handStrength
        this.isFolded = false
        this.isAllIn = false
        info("Player", "Created player with stack " + stack + " and hand strength " + handStrength)
    }
    fold() {
        this.isFolded = true
    }
    allIn() {
        this.isAllIn = true
    }
}

const runAllInTest = (playerData) => {
    // Create pots
    const pots = new Pots(playerData)

    for (let player in playerData) {
        info("beforeAllIn", player + " " + playerData[player].stack)
    }

    // All in every player, mutates playerData and pots
    for (let player in playerData) {
        allIn(playerData, pots, player)
    }

    // Calculate sidepot winners, mutates playerData
    calculateSidepotWinners(playerData, pots)

    for (let player in playerData) {
        info("afterAllIn", player + " " + playerData[player].stack)
    }
}

const info = (type, message) => {
    timestamp = new Date().toISOString()
    if (config.debug[type]) {
        console.log(timestamp + " " + type + ": " + message)
    }
    logData.push({ timestamp, type, message })
}

const logData = []

const config = {
    debug: {
        addBet: true,
        calculateSidepotWinners: true,
        beforeAllIn: true,
        afterAllIn: true,
        Pots: true,
        Player: true,
        logData: false,
    }
}

const main = () => {
    let playerData = {
        a: new Player(10, 100),
        b: new Player(100, 90),
        c: new Player(100, 90),
        d: new Player(200, 70),
        e: new Player(200, 60),
        f: new Player(500, 50),
    }

    runAllInTest(playerData)
    if (config.debug.logData) {
        console.log(logData)
    }
}

main()













