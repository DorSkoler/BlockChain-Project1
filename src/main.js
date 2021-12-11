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
                const amount = Math.floor(Math.random() * 30) + 1
                try {
                    this.addTrans(this.SPVWallet, this.SPVWallet2, amount)
                } catch (error) {
                    this.addTrans(this.SPVWallet2, this.SPVWallet, amount)
                }
            }
            this.mine()
        }


        // // Check if the chain is valid

        this.SPVWallet.addSPVHeaders(this.blockchain.chain)
        this.SPVWallet2.addSPVHeaders(this.blockchain.chain)
    }

    getTotalNetBalance(){
        return this.blockchain.getBalanceOfAddress(this.SPVWallet.publicKey) + this.blockchain.getBalanceOfAddress(this.SPVWallet2.publicKey) + this.blockchain.getBalanceOfAddress(this.miner)
    }

    addTrans(from, to, amount){
        const tx = new Transaction(from.publicKey, to.publicKey, amount);
        tx.signTransaction(from.keyPair);
        this.blockchain.addTransaction(tx);
        return this.blockchain.pendingTransactions[this.blockchain.pendingTransactions.length - 1].amount
    }

    mine(){
        this.blockchain.minePendingTransactions(this.miner);
        this.SPVWallet.addSPVHeaders(this.blockchain.chain)
        this.SPVWallet2.addSPVHeaders(this.blockchain.chain)
    }

    showWallet(wallet) {
        return this.blockchain.getBalanceOfAddress(wallet.publicKey)
    }

    showTotalMinedCoins(){
        return this.blockchain.minedCoins
    }
}

module.exports.Main = Main;


