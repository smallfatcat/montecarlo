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
    }

    addBet(player, amount) {
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

const allIn = (playerData, pots, player, amount) => {
    playerData[player].allIn = true
    playerData[player].stack = amount
    pots.addBet(player, amount)
}

const getWinners = (handStrengths, playersEligibleForPot) => {
    let winners = []
    let maxHandStrength = 0
    for (let player in handStrengths) {
        if (playersEligibleForPot.includes(player)) {
            if (handStrengths[player] > maxHandStrength) {
                maxHandStrength = handStrengths[player]
            }
        }
    }
    playersEligibleForPot.map(player => {
        if (handStrengths[player] === maxHandStrength) {
            winners.push(player)
        }
    })
    return winners
}

let playerData = {
    'a': {
        'stack': 10,
        'handStrength': 100,
        'folded': false,
        'allIn': false,
    },
    'b': {
        'stack': 100,
        'handStrength': 90,
        'folded': false,
        'allIn': false,
    },
    'c': {
        'stack': 100,
        'handStrength': 80,
        'folded': false,
        'allIn': false,
    },
    'd': {
        'stack': 200,
        'handStrength': 70,
        'folded': false,
        'allIn': false,
    },
    'e': {
        'stack': 200,
        'handStrength': 70,
        'folded': false,
        'allIn': false,
    },
    'f': {
        'stack': 500,
        'handStrength': 50,
        'folded': false,
        'allIn': false,
    }
}

let handStrengths = {}
for (let player in playerData) {
    handStrengths[player] = playerData[player].handStrength
}

const pots = new Pots(playerData)

allIn(playerData, pots, 'a', 10)
allIn(playerData, pots, 'b', 100)
allIn(playerData, pots, 'c', 100)
allIn(playerData, pots, 'd', 200)
allIn(playerData, pots, 'e', 200)
allIn(playerData, pots, 'f', 500)

console.log('Final sidepots state:')
console.log(pots)

for (let i = 0; i < pots.sidepots.length; i++) {
    console.log(pots.playersEligibleForPot(i), pots.getPotTotal(i))
}

for (let i = 0; i < pots.sidepots.length; i++) {
    console.log(getWinners(handStrengths, pots.playersEligibleForPot(i)))
}

console.log(playerData)














