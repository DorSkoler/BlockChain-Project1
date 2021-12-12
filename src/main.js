const { Blockchain, Transaction, SPV } = require('./blockchain');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

class Main {
    constructor() {
        // Your private key goes here
        const myKey = ec.genKeyPair();
        const myKey2 = ec.genKeyPair();
        const minerKey = ec.genKeyPair();

        // From that we can calculate your public key (which doubles as your wallet address)
        const myWalletAddress = myKey.getPublic('hex');
        const myWalletAddress2 = myKey2.getPublic('hex');
        this.miner = minerKey.getPublic('hex');

        // Create new instance of Blockchain class
        this.blockchain = new Blockchain();
        this.SPVWallet = new SPV(this.blockchain.chain, myKey, myWalletAddress)
        this.SPVWallet2 = new SPV(this.blockchain.chain, myKey2, myWalletAddress2)
        const tx = new Transaction(null, myWalletAddress, 100);
        const tx1 = new Transaction(null, myWalletAddress2, 100);
        const tx2 = new Transaction(null, this.miner, 100);
        this.blockchain.pendingTransactions.push(tx);
        this.blockchain.pendingTransactions.push(tx1);
        this.blockchain.pendingTransactions.push(tx2);
        this.blockchain.minePendingTransactions(this.miner);

        // savjeeCoin.pendingTransactions=memPool();
        for (let i = 0; i < 9; i++) {
            for (let i = 0; i < 3; i++) {
                const amount = Math.floor(Math.random() * 10) + 1
                try {
                    const tx = new Transaction(myWalletAddress, myWalletAddress2, amount);
                    tx.signTransaction(myKey);
                    this.blockchain.addTransaction(tx);
                } catch (error) {
                    const tx = new Transaction(myWalletAddress2, myWalletAddress, amount);
                    tx.signTransaction(myKey2);
                    this.blockchain.addTransaction(tx);
                }
            }
            this.mine()
        }

        this.SPVWallet.addSPVHeaders(this.blockchain.chain)
        this.SPVWallet2.addSPVHeaders(this.blockchain.chain)
    }

    getTotalNetBalance() {
        return this.blockchain.totalCoins
    }

    getTotalBlocksMinedCoins() {
        return this.blockchain.minedCoins
    }

    addTrans(from, to, amount) {
        //burn fee of the current transaction for the intended block.
        const fee = this.blockchain.pendingTransactions.length / 3 + this.blockchain.chain.length
        //main tx is the main transaction from one address to the second address
        const mainTx = new Transaction(from.publicKey, to.publicKey, amount);
        mainTx.signTransaction(from.keyPair);
        this.blockchain.addTransaction(mainTx);
        //first we need to make a new transaction to to miner for 1 coin
        try {
            const toMinerTx = new Transaction(from.publicKey, this.miner, this.blockchain.minerExtra);
            toMinerTx.signTransaction(from.keyPair);
            this.blockchain.addTransaction(toMinerTx)
        } catch (error) {
            //if any of the last transaction failed due to not enough balance we need to pop those last transactions from the pending transactions array.
            this.blockchain.pendingTransactions[this.blockchain.pendingTransactions.length - 1].pop()
            throw new Error('Not enough balance');
        }
        //after that we need to send the burn fee to the burning address
        try {
            const burnTx = new Transaction(from.publicKey, "Burned-Coins-Address", fee);
            burnTx.signTransaction(from.keyPair);
            this.blockchain.addTransaction(burnTx);
        } catch (error) {
            //if any of the last transaction failed due to not enough balance we need to pop those last transactions from the pending transactions array.
            this.blockchain.pendingTransactions[this.blockchain.pendingTransactions.length - 1].pop()
            this.blockchain.pendingTransactions[this.blockchain.pendingTransactions.length - 1].pop()
            throw new Error('Not enough balance');
        }
        return `amount transfered: ${mainTx.amount}, amount burnt: ${fee}, extra for miner: ${this.blockchain.minerExtra}\nTotal transfered: ${mainTx.amount + this.blockchain.minerExtra + fee}`
    }

    mine(){
        this.blockchain.minePendingTransactions(this.miner);
        this.SPVWallet.addSPVHeaders(this.blockchain.chain)
        this.SPVWallet2.addSPVHeaders(this.blockchain.chain)
    }

    showSPVWallet(wallet) {
        return this.blockchain.getBalanceOfAddress(wallet.publicKey)
    }

    showMinerWallet(wallet) {
        return this.blockchain.getBalanceOfAddress(wallet)
    }

    // showAllTrans(){
    //     for (const block of this.blockchain.chain){
    //             console.log(block.transactions);
    //     }
    // }

    showTotalBurntCoins() {
        return `Total burnt coins: ${this.blockchain.burntCoins}`
    }
}

module.exports.Main = Main;


