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

class Pots {
    constructor(playerData) {
        this.sidepots = []
        this.players = []
        this.stacks = []
        for (let playerName in playerData) {
            this.stacks.push(playerData[playerName].stack)
        }
        for (let playerName in playerData) {
            this.players.push(playerName)
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
            this.players.map(playerName => { sidepot[playerName] = 0 })
            sidepot.level = newLevel
            this.sidepots.push(sidepot)
        }
        info("Pots", "Created " + this.sidepots.length + " sidepots")
    }

    addBet(playerName, amount) {
        info("addBet", "Player " + playerName + " -" + amount)
        for (let i = 0; i < this.sidepots.length; i++) {
            let level = this.sidepots[i].level
            let allowedBetForLevel = Math.min(amount, level)
            this.sidepots[i][playerName] = allowedBetForLevel
            amount = amount - allowedBetForLevel
            if (amount === 0) {
                return
            }
        }
    }

    playersEligibleForPot(sidepotIndex) {
        let eligibleForPot = []
        this.players.map(playerName => { this.sidepots[sidepotIndex][playerName] > 0 ? eligibleForPot.push(playerName) : null })
        return eligibleForPot
    }

    getPotTotal(sidepotIndex) {
        let total = 0
        this.players.map(playerName => { total += this.sidepots[sidepotIndex][playerName] })
        return total
    }

}

const allIn = (playerData, playerName, pots) => {
    playerData[playerName].isAllIn = true
    amount = playerData[playerName].stack
    pots.addBet(playerName, amount)
    playerData[playerName].stack = playerData[playerName].stack - amount
}

const getWinners = (playerData, eligiblePlayers) => {
    let handStrengths = {}
    for (let playerName in playerData) {
        handStrengths[playerName] = playerData[playerName].handStrength
    }
    let winners = []
    let maxHandStrength = 0
    for (let playerName in handStrengths) {
        if (eligiblePlayers.includes(playerName)) {
            if (handStrengths[playerName] > maxHandStrength && !playerData[playerName].isFolded) {
                maxHandStrength = handStrengths[playerName]
            }
        }
    }
    eligiblePlayers.map(playerName => {
        if (handStrengths[playerName] === maxHandStrength && !playerData[playerName].isFolded) {
            winners.push(playerName)
        }
    })
    return winners
}

const calculateSidepotWinners = (playerData, pots) => {
    for (let i = 0; i < pots.sidepots.length; i++) {
        let winners = getWinners(playerData, pots.playersEligibleForPot(i))
        if (winners.length === 0) {
            continue
        }
        let payout = pots.getPotTotal(i) / winners.length
        winners.map(winner => {
            playerData[winner].stack = playerData[winner].stack + payout
            info("calculateSidepotWinners", "Player " + winner + " +" + payout)
        })
    }
}

const runAllInTest = (playerData) => {
    // Create pots
    const pots = new Pots(playerData)

    for (let playerName in playerData) {
        info("beforeAllIn", playerName + " " + playerData[playerName].stack)
    }

    // All in every player, mutates playerData and pots
    for (let playerName in playerData) {
        allIn(playerData, playerName, pots)
    }

    // Calculate sidepot winners, mutates playerData
    calculateSidepotWinners(playerData, pots)

    for (let playerName in playerData) {
        info("afterAllIn", playerName + " " + playerData[playerName].stack)
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













