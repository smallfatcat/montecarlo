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

const Action = Object.freeze({
    FOLD: 'fold',
    CHECK: 'check',
    CALL: 'call',
    BET: 'bet',
    RAISE: 'raise',
    ALL_IN: 'all_in'
});

const numberOfPlayers = 6;
const blinds = [10, 20];

class Game {
    constructor(players, buttonPosition, blinds) {
        this.buttonPosition = buttonPosition;
        this.bigBlindPosition = (buttonPosition + 1) % numberOfPlayers;
        this.smallBlindPosition = (buttonPosition + 2) % numberOfPlayers;
        this.players = players;
        this.activePlayer = (buttonPosition + 3) % numberOfPlayers;
        this.currentStreet = Street.PREFLOP;
        this.bets = [];
        this.totalBets = [];
        this.sidePots = [];
        this.pot = 0;
        
        // Initialize betting arrays
        for (let streetIdx = 0; streetIdx < Street.MAX; streetIdx++) {
            const streetPot = [];
            for (let playerIdx = 0; playerIdx < numberOfPlayers; playerIdx++) {
                streetPot.push(0);
            }
            this.bets.push(streetPot);
        }
        
        // Initialize total bets array
        for (let playerIdx = 0; playerIdx < numberOfPlayers; playerIdx++) {
            this.totalBets.push(0);
        }
        
        // Post blinds
        this.postBlind(this.bigBlindPosition, blinds[1]);
        this.postBlind(this.smallBlindPosition, blinds[0]);
    }

    postBlind = (player, amount) => {
        const actualAmount = Math.min(amount, this.players[player].chips);
        this.players[player].chips -= actualAmount;
        this.bets[this.currentStreet][player] += actualAmount;
        this.totalBets[player] += actualAmount;
        this.pot += actualAmount;
        
        // Check if player went all-in (chips are now 0)
        if (this.players[player].chips === 0) {
            this.players[player].isAllIn = true;
        }
    }

    addBet = (player, street, bet) => {
        const actualBet = Math.min(bet, this.players[player].chips);
        this.players[player].chips -= actualBet;
        this.bets[street][player] += actualBet;
        this.totalBets[player] += actualBet;
        this.pot += actualBet;
        
        if (actualBet === this.players[player].chips) {
            this.players[player].isAllIn = true;
        }
        
        return actualBet;
    }

    getNextActivePlayer = () => {
        let nextPlayer = (this.activePlayer + 1) % numberOfPlayers;
        
        // Skip folded and all-in players
        while ((this.players[nextPlayer].isFolded || this.players[nextPlayer].isAllIn) && 
               nextPlayer !== this.activePlayer) {
            nextPlayer = (nextPlayer + 1) % numberOfPlayers;
        }
        
        this.activePlayer = nextPlayer;
        return this.activePlayer;
    }

    getStreetPotTotal = (street) => {
        return this.bets[street].reduce((acc, bet) => acc + bet, 0);
    }

    getStreetPot = (street) => {
        return this.bets[street];
    }

    nextStreet = () => {
        this.activePlayer = (this.buttonPosition + 1) % numberOfPlayers;
        this.currentStreet++;
        
        // Reset street bets but keep total bets
        for (let streetIdx = 0; streetIdx < Street.MAX; streetIdx++) {
            for (let playerIdx = 0; playerIdx < numberOfPlayers; playerIdx++) {
                this.bets[streetIdx][playerIdx] = 0;
            }
        }
    }

    getStreet = () => {
        return this.currentStreet;
    }

    getPlayerChips = (playerIdx) => {
        return this.players[playerIdx].chips;
    }

    getAllPlayerChips = () => {
        return this.players.map(player => player.chips);
    }

    getPlayerSeat = (playerIdx) => {
        return this.players[playerIdx].seat;
    }

    getToCall = (streetIdx, playerIdx) => {
        const maxBetOnStreet = Math.max(...this.bets[streetIdx]);
        return maxBetOnStreet - this.bets[streetIdx][playerIdx];
    }

    getCallAmount = (streetIdx) => {
        return Math.max(...this.bets[streetIdx]);
    }

    canCheck = (playerIdx) => {
        const maxBetOnStreet = Math.max(...this.bets[this.currentStreet]);
        return this.bets[this.currentStreet][playerIdx] === maxBetOnStreet;
    }

    // Simplified validation - just check basic rules
    validateAction = (playerIdx, action, amount = 0) => {
        const player = this.players[playerIdx];
        
        if (player.isFolded || player.isAllIn) {
            return { valid: false, reason: 'Player cannot act' };
        }
        
        switch (action) {
            case Action.FOLD:
                return { valid: true };
                
            case Action.CHECK:
                if (!this.canCheck(playerIdx)) {
                    return { valid: false, reason: 'Cannot check, must call or raise' };
                }
                return { valid: true };
                
            case Action.CALL:
                return { valid: true }; // Always valid, will handle all-in in execution
                
            case Action.BET:
                const maxBetOnStreet = Math.max(...this.bets[this.currentStreet]);
                if (maxBetOnStreet > 0) {
                    return { valid: false, reason: 'Cannot bet when there is a bet to call, use raise instead' };
                }
                if (amount < blinds[1]) {
                    return { valid: false, reason: `Bet must be at least ${blinds[1]}` };
                }
                if (amount > player.chips) {
                    return { valid: false, reason: 'Not enough chips' };
                }
                return { valid: true };
                
            case Action.RAISE:
                const currentMaxBet = Math.max(...this.bets[this.currentStreet]);
                if (currentMaxBet === 0) {
                    return { valid: false, reason: 'Cannot raise when there is no bet, use bet instead' };
                }
                if (amount < blinds[1]) {
                    return { valid: false, reason: `Raise must be at least ${blinds[1]}` };
                }
                if (amount > player.chips) {
                    return { valid: false, reason: 'Not enough chips' };
                }
                return { valid: true };
                
            case Action.ALL_IN:
                if (player.chips === 0) {
                    return { valid: false, reason: 'No chips to bet' };
                }
                return { valid: true };
                
            default:
                return { valid: false, reason: 'Invalid action' };
        }
    }

    executeAction = (playerIdx, action, amount = 0) => {
        const validation = this.validateAction(playerIdx, action, amount);
        if (!validation.valid) {
            throw new Error(validation.reason);
        }
        
        switch (action) {
            case Action.FOLD:
                this.players[playerIdx].isFolded = true;
                break;
                
            case Action.CHECK:
                // No action needed
                break;
                
            case Action.CALL:
                const callAmount = this.getToCall(this.currentStreet, playerIdx);
                if (callAmount === 0) {
                    return true; // Already matched the bet
                }
                // If player can't afford to call, they go all-in
                const actualCallAmount = Math.min(callAmount, this.players[playerIdx].chips);
                this.addBet(playerIdx, this.currentStreet, actualCallAmount);
                break;
                
            case Action.BET:
                this.addBet(playerIdx, this.currentStreet, amount);
                break;
                
            case Action.RAISE:
                const currentMaxBet = Math.max(...this.bets[this.currentStreet]);
                const totalAmount = currentMaxBet + amount;
                this.addBet(playerIdx, this.currentStreet, totalAmount);
                break;
                
            case Action.ALL_IN:
                const allInAmount = this.players[playerIdx].chips;
                this.addBet(playerIdx, this.currentStreet, allInAmount);
                break;
        }
        
        return true;
    }

    checkFinished = () => {
        const activePlayers = this.players.filter(p => !p.isFolded && !p.isAllIn);
        if (activePlayers.length <= 1) return true;
        
        const streetBets = this.bets[this.currentStreet];
        const maxBet = Math.max(...streetBets);
        
        // Check if all active players have matched the current bet
        for (let i = 0; i < numberOfPlayers; i++) {
            if (!this.players[i].isFolded && !this.players[i].isAllIn) {
                if (streetBets[i] < maxBet) {
                    return false;
                }
            }
        }
        
        return true;
    }

    calculateSidePots = () => {
        this.sidePots = [];
        
        // Get all unique bet amounts, sorted
        const betAmounts = [...new Set(this.totalBets.filter(bet => bet > 0))].sort((a, b) => a - b);
        
        let previousAmount = 0;
        for (const amount of betAmounts) {
            const sidePot = {
                amount: 0,
                eligiblePlayers: []
            };
            
            // Calculate pot amount for this level
            for (let i = 0; i < numberOfPlayers; i++) {
                if (this.totalBets[i] >= amount) {
                    sidePot.amount += Math.min(amount - previousAmount, this.totalBets[i] - previousAmount);
                }
            }
            
            // Determine eligible players
            for (let i = 0; i < numberOfPlayers; i++) {
                if (this.totalBets[i] >= amount && !this.players[i].isFolded) {
                    sidePot.eligiblePlayers.push(i);
                }
            }
            
            if (sidePot.amount > 0) {
                this.sidePots.push(sidePot);
            }
            
            previousAmount = amount;
        }
        
        return this.sidePots;
    }

    getPotInfo = () => {
        this.calculateSidePots();
        return {
            mainPot: this.pot,
            sidePots: this.sidePots,
            totalPot: this.pot + this.sidePots.reduce((sum, pot) => sum + pot.amount, 0)
        };
    }

    getActivePlayers = () => {
        return this.players.filter(p => !p.isFolded && p.isInHand);
    }

    getWinners = () => {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length === 1) {
            return [activePlayers[0]];
        }
        
        // This is a simplified winner determination
        // In a real game, you'd evaluate hand rankings here
        return activePlayers;
    }

    distributePots = () => {
        const potInfo = this.getPotInfo();
        const winners = this.getWinners();
        
        if (winners.length === 0) return;
        
        // Distribute main pot
        const mainPotPerWinner = Math.floor(potInfo.mainPot / winners.length);
        winners.forEach(winner => {
            winner.chips += mainPotPerWinner;
        });
        
        // Distribute side pots
        potInfo.sidePots.forEach(sidePot => {
            const eligibleWinners = winners.filter(winner => 
                sidePot.eligiblePlayers.includes(winner.seat)
            );
            
            if (eligibleWinners.length > 0) {
                const sidePotPerWinner = Math.floor(sidePot.amount / eligibleWinners.length);
                eligibleWinners.forEach(winner => {
                    winner.chips += sidePotPerWinner;
                });
            }
        });
    }

    // Utility methods for game state
    getGameState = () => {
        return {
            currentStreet: this.currentStreet,
            activePlayer: this.activePlayer,
            pot: this.pot,
            sidePots: this.sidePots,
            players: this.players.map(p => ({
                name: p.name,
                chips: p.chips,
                seat: p.seat,
                isFolded: p.isFolded,
                isAllIn: p.isAllIn,
                currentStreetBet: this.bets[this.currentStreet][p.seat],
                totalBet: this.totalBets[p.seat]
            }))
        };
    }

    resetHand = () => {
        // Reset player states for new hand
        this.players.forEach(player => {
            player.isFolded = false;
            player.isAllIn = false;
            player.isInHand = true;
        });
        
        // Reset game state
        this.currentStreet = Street.PREFLOP;
        this.activePlayer = (this.buttonPosition + 3) % numberOfPlayers;
        this.pot = 0;
        this.sidePots = [];
        
        // Reset betting arrays
        for (let streetIdx = 0; streetIdx < Street.MAX; streetIdx++) {
            for (let playerIdx = 0; playerIdx < numberOfPlayers; playerIdx++) {
                this.bets[streetIdx][playerIdx] = 0;
            }
        }
        
        for (let playerIdx = 0; playerIdx < numberOfPlayers; playerIdx++) {
            this.totalBets[playerIdx] = 0;
        }
        
        // Post blinds for new hand
        this.postBlind(this.bigBlindPosition, blinds[1]);
        this.postBlind(this.smallBlindPosition, blinds[0]);
    }

    moveButton = () => {
        this.buttonPosition = (this.buttonPosition + 1) % numberOfPlayers;
        this.bigBlindPosition = (this.buttonPosition + 1) % numberOfPlayers;
        this.smallBlindPosition = (this.buttonPosition + 2) % numberOfPlayers;
        this.activePlayer = (this.buttonPosition + 3) % numberOfPlayers;
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
    const tempStreet = game.currentStreet;
    const tempActivePlayer = game.activePlayer;
    
    console.log('\n' + '='.repeat(80));
    console.log(`GAME STATE - Street: ${['PREFLOP', 'FLOP', 'TURN', 'RIVER'][game.currentStreet]}`);
    console.log(`Active Player: ${game.players[game.activePlayer].name} (Seat ${game.activePlayer})`);
    console.log('='.repeat(80));
    
    // Player status table
    console.log('\nPLAYER STATUS:');
    console.log('Seat | Name      | Chips | Street Bet | Total Bet | Status');
    console.log('-----|-----------|-------|------------|-----------|--------');
    
    for (let i = 0; i < numberOfPlayers; i++) {
        const player = game.players[i];
        const streetBet = game.bets[game.currentStreet][i];
        const totalBet = game.totalBets[i];
        let status = 'Active';
        if (player.isFolded) status = 'Folded';
        else if (player.isAllIn) status = 'All-In';
        
        console.log(`${i.toString().padStart(4)} | ${player.name.padEnd(9)} | ${player.chips.toString().padStart(5)} | ${streetBet.toString().padStart(10)} | ${totalBet.toString().padStart(9)} | ${status}`);
    }
    
    // Pot information
    const potInfo = game.getPotInfo();
    console.log(`\nMAIN POT: ${potInfo.mainPot}`);
    if (potInfo.sidePots.length > 0) {
        console.log('\nSIDE POTS:');
        potInfo.sidePots.forEach((sidePot, index) => {
            const eligibleNames = sidePot.eligiblePlayers.map(idx => game.players[idx].name).join(', ');
            console.log(`  Side Pot ${index + 1}: ${sidePot.amount} (Eligible: ${eligibleNames})`);
        });
    }
    console.log(`TOTAL POT: ${potInfo.totalPot}`);
    
    // Street progression info
    // console.log('\nSTREET PROGRESSION:');
    // const headers = ['Street', 'Pot', 'Active Player', 'Call Amount', 'Finished'];
    // const widths = headers.map(header => header.length);
    
    // game.currentStreet = Street.PREFLOP;
    // const dataLines = [];
    
    // for (let streetIdx = 0; streetIdx < Street.MAX; streetIdx++) {
    //     const data = [
    //         ['PREFLOP', 'FLOP', 'TURN', 'RIVER'][streetIdx],
    //         game.getStreetPotTotal(streetIdx),
    //         game.players[game.activePlayer].name,
    //         game.getCallAmount(streetIdx),
    //         game.checkFinished()
    //     ];
        
    //     const strings = data.map(item => String(item));
    //     widths.forEach((width, index) => {
    //         widths[index] = Math.max(width, strings[index].length);
    //     });
    //     dataLines.push(strings);
        
    //     if (streetIdx < Street.MAX - 1) {
    //         game.nextStreet();
    //     }
    // }
    
    // console.log(headers.map((header, index) => header.padEnd(widths[index], ' ')).join(' | '));
    // dataLines.forEach(line => {
    //     console.log(line.map((string, index) => string.padStart(widths[index], ' ')).join(' | '));
    // });
    
    // Restore original state
    game.currentStreet = tempStreet;
    game.activePlayer = tempActivePlayer;
    console.log('='.repeat(80));
}

// Enhanced test simulation
const runAdvancedSimulation = () => {
    console.log('\n🚀 STARTING ADVANCED TEXAS HOLD\'EM SIMULATION 🚀\n');
    
    let round = 0;
    const maxRounds = 50;
    
    while (round < maxRounds && !currentGame.checkFinished()) {
        round++;
        console.log(`\n--- ROUND ${round} ---`);
        
        const player = currentGame.players[currentGame.activePlayer];
        const toCall = currentGame.getToCall(currentGame.currentStreet, currentGame.activePlayer);
        
        // Simulate different player actions based on situation
        if (player.isFolded || player.isAllIn) {
            console.log(`${player.name} cannot act (${player.isFolded ? 'Folded' : 'All-In'})`);
        } else {
            const currentMaxBet = Math.max(...currentGame.bets[currentGame.currentStreet]);
            
            if (currentMaxBet === 0) {
                // No bet yet, can check or bet
                if (Math.random() < 0.3 && player.chips >= 20) {
                    const betAmount = Math.min(20 + Math.floor(Math.random() * 30), player.chips);
                    console.log(`${player.name} bets ${betAmount}`);
                    currentGame.executeAction(currentGame.activePlayer, Action.BET, betAmount);
                } else {
                    console.log(`${player.name} checks`);
                    currentGame.executeAction(currentGame.activePlayer, Action.CHECK);
                }
            } else {
                // There's a bet, must call, raise, or fold
                if (Math.random() < 0.1) {
                    console.log(`${player.name} folds`);
                    currentGame.executeAction(currentGame.activePlayer, Action.FOLD);
                } else if (toCall === 0) {
                    // Player has already matched the bet, can check
                    console.log(`${player.name} checks`);
                    currentGame.executeAction(currentGame.activePlayer, Action.CHECK);
                } else if (Math.random() < 0.2 && player.chips > toCall * 2) {
                    // Only raise if there's actually a bet to raise against
                    const currentMaxBet = Math.max(...currentGame.bets[currentGame.currentStreet]);
                    if (currentMaxBet > 0) {
                        const raiseAmount = Math.max(20, Math.floor(Math.random() * 50) + 1); // At least 20
                        console.log(`${player.name} raises to ${currentMaxBet + raiseAmount}`);
                        currentGame.executeAction(currentGame.activePlayer, Action.RAISE, raiseAmount);
                    } else {
                        console.log(`${player.name} checks`);
                        currentGame.executeAction(currentGame.activePlayer, Action.CHECK);
                    }
                } else if (player.chips <= toCall) {
                    console.log(`${player.name} goes all-in with ${player.chips}`);
                    currentGame.executeAction(currentGame.activePlayer, Action.ALL_IN);
                } else {
                    console.log(`${player.name} calls ${toCall}`);
                    currentGame.executeAction(currentGame.activePlayer, Action.CALL);
                }
            }
        }
        
        currentGame.getNextActivePlayer();
        
        if (currentGame.checkFinished()) {
            if (currentGame.currentStreet === Street.RIVER) {
                console.log('\n🎯 REACHED RIVER - HAND COMPLETE! 🎯');
                break;
            }
            console.log(`\n✅ Street ${['PREFLOP', 'FLOP', 'TURN', 'RIVER'][currentGame.currentStreet]} complete, moving to next street`);
            currentGame.nextStreet();
        }
        
        if (round % 10 === 0) {
            debugState(currentGame);
        }
    }
    
    console.log(`\n🏁 SIMULATION COMPLETE - ${round} rounds played 🏁`);
    
    // Final state and pot distribution
    debugState(currentGame);
    
    // Distribute pots
    currentGame.distributePots();
    
    console.log('\n💰 FINAL CHIP COUNTS AFTER POT DISTRIBUTION:');
    currentGame.players.forEach(player => {
        console.log(`${player.name}: ${player.chips} chips`);
    });
}

// Run the enhanced simulation
runAdvancedSimulation();

// Utility functions to demonstrate specific scenarios
const demonstrateAllInScenario = () => {
    console.log('\n🎲 DEMONSTRATING ALL-IN SCENARIO 🎲');
    
    // Create a new game with some players having fewer chips
    const testPlayers = createPlayers();
    testPlayers[0].chips = 50;  // Player 1 has only 50 chips
    testPlayers[1].chips = 100; // Player 2 has 100 chips
    testPlayers[2].chips = 200; // Player 3 has 200 chips
    testPlayers[3].chips = 150; // Player 4 has 150 chips
    testPlayers[4].chips = 300; // Player 5 has 300 chips
    testPlayers[5].chips = 250; // Player 6 has 250 chips
    
    const testGame = new Game(testPlayers, 0, [10, 20]);
    
    console.log('\nInitial state:');
    debugState(testGame);
    
    // Simulate some betting that leads to all-ins
    console.log('\nSimulating betting rounds...');
    
    // Player 3 raises to 100 (raises the current bet of 20 by 80)
    testGame.executeAction(2, Action.RAISE, 80);
    console.log(`\n${testGame.players[2].name} raises to 100`);
    
    // Player 1 goes all-in with 50 (can't afford to call 100)
    testGame.executeAction(0, Action.ALL_IN);
    console.log(`${testGame.players[0].name} goes all-in with 50`);
    
    // Player 2 calls 100
    testGame.executeAction(1, Action.CALL);
    console.log(`${testGame.players[1].name} calls 100`);
    
    // Player 4 raises to 150 (raises by 50)
    testGame.executeAction(3, Action.RAISE, 50);
    console.log(`${testGame.players[3].name} raises to 150`);
    
    // Player 5 calls 150
    testGame.executeAction(4, Action.CALL);
    console.log(`${testGame.players[4].name} calls 150`);
    
    // Player 6 calls 150
    testGame.executeAction(5, Action.CALL);
    console.log(`${testGame.players[5].name} calls 150`);
    
    console.log('\nAfter betting round:');
    debugState(testGame);
    
    // Show side pot calculation
    const potInfo = testGame.getPotInfo();
    console.log('\nSide pot breakdown:');
    potInfo.sidePots.forEach((sidePot, index) => {
        const eligibleNames = sidePot.eligiblePlayers.map(idx => testGame.players[idx].name).join(', ');
        console.log(`  Side Pot ${index + 1}: ${sidePot.amount} chips (Eligible: ${eligibleNames})`);
    });
}

const demonstrateBettingValidation = () => {
    console.log('\n🔍 DEMONSTRATING BETTING VALIDATION 🔍');
    
    const testPlayers = createPlayers();
    const testGame = new Game(testPlayers, 0, [10, 20]);
    
    console.log('\nTesting various betting scenarios:');
    
    // Test 1: Can't check when there's a bet
    console.log('\n1. Testing check validation:');
    const checkValidation = testGame.validateAction(3, Action.CHECK);
    console.log(`   Player 4 trying to check: ${checkValidation.valid ? 'Valid' : 'Invalid'} - ${checkValidation.reason || 'OK'}`);
    
    // Test 2: Can't bet when there's already a bet
    console.log('\n2. Testing bet validation:');
    const betValidation = testGame.validateAction(3, Action.BET, 30);
    console.log(`   Player 4 trying to bet 30: ${betValidation.valid ? 'Valid' : 'Invalid'} - ${betValidation.reason || 'OK'}`);
    
    // Test 3: Valid raise
    console.log('\n3. Testing raise validation:');
    const raiseValidation = testGame.validateAction(3, Action.RAISE, 30);
    console.log(`   Player 4 trying to raise 30: ${raiseValidation.valid ? 'Valid' : 'Invalid'} - ${raiseValidation.reason || 'OK'}`);
    
    // Test 4: Invalid raise (too small)
    console.log('\n4. Testing minimum raise validation:');
    const smallRaiseValidation = testGame.validateAction(3, Action.RAISE, 5);
    console.log(`   Player 4 trying to raise 5: ${smallRaiseValidation.valid ? 'Valid' : 'Invalid'} - ${smallRaiseValidation.reason || 'OK'}`);
    
    // Test 5: Valid call
    console.log('\n5. Testing call validation:');
    const callValidation = testGame.validateAction(3, Action.CALL);
    console.log(`   Player 4 trying to call: ${callValidation.valid ? 'Valid' : 'Invalid'} - ${callValidation.reason || 'OK'}`);
}

// Run demonstration scenarios
demonstrateAllInScenario();
demonstrateBettingValidation();

// Additional comprehensive tests
const runComprehensiveTests = () => {
    console.log('\n🧪 COMPREHENSIVE TESTING SUITE 🧪');
    
    // Test 1: Multiple all-ins with different chip amounts
    console.log('\n📊 TEST 1: Multiple All-Ins with Side Pots');
    const multiAllInTest = () => {
        const testPlayers = createPlayers();
        testPlayers[0].chips = 30;   // Player 1: 30 chips
        testPlayers[1].chips = 60;   // Player 2: 60 chips  
        testPlayers[2].chips = 120;  // Player 3: 120 chips
        testPlayers[3].chips = 200;  // Player 4: 200 chips
        testPlayers[4].chips = 300;  // Player 5: 300 chips
        testPlayers[5].chips = 500;  // Player 6: 500 chips
        
        const testGame = new Game(testPlayers, 0, [10, 20]);
        
        console.log('Initial state:');
        debugState(testGame);
        
        // Complex betting sequence
        testGame.executeAction(2, Action.RAISE, 40);    // Player 3 raises from 20 to 60
        testGame.executeAction(0, Action.ALL_IN);     // Player 1 all-in 30
        
        // Player 2 calls 60 (this will make them all-in since they only have 40 chips)
        testGame.executeAction(1, Action.CALL);
        console.log(`Player 2 called 60 (went all-in)`);
        
        // Player 4 raises to 120 (raises by 60)
        testGame.executeAction(3, Action.RAISE, 60);
        console.log(`Player 4 raised to 120`);
        
        // Player 5 calls 120
        testGame.executeAction(4, Action.CALL);
        console.log(`Player 5 called 120`);
        
        // Player 6 raises to 200 (raises by 80)
        testGame.executeAction(5, Action.RAISE, 80);
        console.log(`Player 6 raised to 200`);
        
        // Player 3 goes all-in with remaining chips (120 total)
        testGame.executeAction(2, Action.ALL_IN);
        console.log(`Player 3 went all-in`);
        
        // Player 2 is already all-in from calling 60, so skip this action
        console.log(`Player 2 is already all-in from previous call`);
        
        // Player 4 calls 200
        testGame.executeAction(3, Action.CALL);
        console.log(`Player 4 called 200`);
        
        // Player 5 calls 200
        testGame.executeAction(4, Action.CALL);
        console.log(`Player 5 called 200`);
        
        // Player 6 calls 200
        testGame.executeAction(5, Action.CALL);
        console.log(`Player 6 called 200`);
        
        console.log('\nAfter complex betting:');
        debugState(testGame);
        
        // Test pot distribution
        testGame.distributePots();
        console.log('\n💰 Final chip counts after pot distribution:');
        testGame.players.forEach(player => {
            console.log(`${player.name}: ${player.chips} chips`);
        });
    };
    
    multiAllInTest();
    
    // Test 2: Street progression and betting reset
    console.log('\n🔄 TEST 2: Street Progression and Betting Reset');
    const streetProgressionTest = () => {
        const testPlayers = createPlayers();
        const testGame = new Game(testPlayers, 0, [10, 20]);
        
        console.log('Preflop state:');
        debugState(testGame);
        
        // Complete preflop
        testGame.executeAction(3, Action.CALL);
        testGame.executeAction(4, Action.CALL);
        testGame.executeAction(5, Action.CALL);
        testGame.executeAction(0, Action.CALL);
        testGame.executeAction(1, Action.CALL);
        testGame.executeAction(2, Action.CALL);
        
        console.log('\nPreflop complete, moving to flop:');
        testGame.nextStreet();
        debugState(testGame);
        
        // Bet on flop
        testGame.executeAction(1, Action.BET, 40);
        testGame.executeAction(2, Action.CALL);
        testGame.executeAction(3, Action.RAISE, 60);
        testGame.executeAction(4, Action.CALL);
        testGame.executeAction(5, Action.CALL);
        testGame.executeAction(0, Action.CALL);
        testGame.executeAction(1, Action.CALL);
        
        console.log('\nFlop complete, moving to turn:');
        testGame.nextStreet();
        debugState(testGame);
    };
    
    streetProgressionTest();
    
    // Test 3: Edge cases and error conditions
    console.log('\n⚠️ TEST 3: Edge Cases and Error Conditions');
    const edgeCaseTest = () => {
        const testPlayers = createPlayers();
        const testGame = new Game(testPlayers, 0, [10, 20]);
        
        console.log('Testing edge cases:');
        
        // Test 1: Player with 0 chips
        testPlayers[0].chips = 0;
        console.log('\n1. Player with 0 chips:');
        const zeroChipsValidation = testGame.validateAction(0, Action.ALL_IN);
        console.log(`   All-in with 0 chips: ${zeroChipsValidation.valid ? 'Valid' : 'Invalid'} - ${zeroChipsValidation.reason || 'OK'}`);
        
        // Test 2: Folded player trying to act
        testGame.executeAction(1, Action.FOLD);
        const foldedPlayerValidation = testGame.validateAction(1, Action.CALL);
        console.log(`\n2. Folded player trying to call: ${foldedPlayerValidation.valid ? 'Valid' : 'Invalid'} - ${foldedPlayerValidation.reason || 'OK'}`);
        
        // Test 3: All-in player trying to act
        testGame.executeAction(2, Action.ALL_IN);
        const allInPlayerValidation = testGame.validateAction(2, Action.RAISE, 50);
        console.log(`\n3. All-in player trying to raise: ${allInPlayerValidation.valid ? 'Valid' : 'Invalid'} - ${allInPlayerValidation.reason || 'OK'}`);
        
        // Test 4: Invalid bet amounts
        const smallBetValidation = testGame.validateAction(3, Action.BET, 5);
        console.log(`\n4. Bet below big blind: ${smallBetValidation.valid ? 'Valid' : 'Invalid'} - ${smallBetValidation.reason || 'OK'}`);
        
        const largeBetValidation = testGame.validateAction(3, Action.BET, 2000);
        console.log(`\n5. Bet above chip count: ${largeBetValidation.valid ? 'Valid' : 'Invalid'} - ${largeBetValidation.reason || 'OK'}`);
    };
    
    edgeCaseTest();
    
    // Test 4: Button movement and blind rotation
    console.log('\n🎯 TEST 4: Button Movement and Blind Rotation');
    const buttonRotationTest = () => {
        const testPlayers = createPlayers();
        const testGame = new Game(testPlayers, 0, [10, 20]);
        
        console.log('Initial button position:');
        console.log(`Button: Player ${testGame.buttonPosition + 1}`);
        console.log(`Big Blind: Player ${testGame.bigBlindPosition + 1}`);
        console.log(`Small Blind: Player ${testGame.smallBlindPosition + 1}`);
        
        // Move button
        testGame.moveButton();
        console.log('\nAfter moving button:');
        console.log(`Button: Player ${testGame.buttonPosition + 1}`);
        console.log(`Big Blind: Player ${testGame.bigBlindPosition + 1}`);
        console.log(`Small Blind: Player ${testGame.smallBlindPosition + 1}`);
        
        // Create new game with new button position
        const newGame = new Game(testPlayers, testGame.buttonPosition, [10, 20]);
        console.log('\nNew game with moved button:');
        debugState(newGame);
    };
    
    buttonRotationTest();
    
    // Test 5: Hand reset functionality
    console.log('\n🔄 TEST 5: Hand Reset Functionality');
    const handResetTest = () => {
        const testPlayers = createPlayers();
        const testGame = new Game(testPlayers, 0, [10, 20]);
        
        console.log('Initial hand state:');
        debugState(testGame);
        
        // Play some actions
        testGame.executeAction(3, Action.CALL);
        testGame.executeAction(4, Action.RAISE, 30);
        testGame.executeAction(5, Action.CALL);
        testGame.executeAction(0, Action.FOLD);
        
        console.log('\nAfter some actions:');
        debugState(testGame);
        
        // Reset hand
        testGame.resetHand();
        console.log('\nAfter hand reset:');
        debugState(testGame);
    };
    
    handResetTest();
    
    // Test 6: Performance test with many rounds
    console.log('\n⚡ TEST 6: Performance Test with Many Rounds');
    const performanceTest = () => {
        const testPlayers = createPlayers();
        const testGame = new Game(testPlayers, 0, [10, 20]);
        
        console.log('Running 100 betting rounds...');
        const startTime = Date.now();
        
        let round = 0;
        const maxRounds = 100;
        
        while (round < maxRounds && !testGame.checkFinished()) {
            round++;
            
            const player = testGame.players[testGame.activePlayer];
            const toCall = testGame.getToCall(testGame.currentStreet, testGame.activePlayer);
            
            if (player.isFolded || player.isAllIn) {
                // Skip inactive players
            } else {
                const currentMaxBet = Math.max(...testGame.bets[testGame.currentStreet]);
                
                if (currentMaxBet === 0) {
                    // No bet yet
                    if (Math.random() < 0.3) {
                        testGame.executeAction(testGame.activePlayer, Action.BET, 20 + Math.floor(Math.random() * 30));
                    } else {
                        testGame.executeAction(testGame.activePlayer, Action.CHECK);
                    }
                } else {
                    // There's a bet
                    if (Math.random() < 0.1) {
                        testGame.executeAction(testGame.activePlayer, Action.FOLD);
                    } else if (toCall === 0) {
                        testGame.executeAction(testGame.activePlayer, Action.CHECK);
                    } else if (Math.random() < 0.2) {
                        testGame.executeAction(testGame.activePlayer, Action.RAISE, 20 + Math.floor(Math.random() * 50));
                    } else {
                        testGame.executeAction(testGame.activePlayer, Action.CALL);
                    }
                }
            }
            
            testGame.getNextActivePlayer();
            
            if (testGame.checkFinished()) {
                if (testGame.currentStreet === Street.RIVER) break;
                testGame.nextStreet();
            }
        }
        
        const endTime = Date.now();
        console.log(`✅ Completed ${round} rounds in ${endTime - startTime}ms`);
        console.log(`Final pot: ${testGame.pot}`);
        console.log(`Side pots: ${testGame.sidePots.length}`);
    };
    
    performanceTest();
    
    console.log('\n🎉 ALL TESTS COMPLETED! 🎉');
};

// Run comprehensive tests
runComprehensiveTests();