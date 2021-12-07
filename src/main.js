//import {mempool} from './transactions.js';
const { Blockchain, Transaction, SPV } = require('./blockchain');
const SHA256 = require('crypto-js/sha256')
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const { memPool } = require('./transactions');



// Your private key goes here
const myKey = ec.genKeyPair();
const myKey2 = ec.genKeyPair();
const minerKey = ec.genKeyPair();

// From that we can calculate your public key (which doubles as your wallet address)
const myWalletAddress = myKey.getPublic('hex');
console.log(myWalletAddress);
const myWalletAddress2 = myKey2.getPublic('hex');
console.log(myWalletAddress2);
const miner = minerKey.getPublic('hex');
console.log(miner);

// Create new instance of Blockchain class
const savjeeCoin = new Blockchain();
const tx = new Transaction(null, myWalletAddress, 100);
const tx1 = new Transaction(null, myWalletAddress2, 100);
const tx2 = new Transaction(null, miner, 100);
savjeeCoin.pendingTransactions.push(tx);
savjeeCoin.pendingTransactions.push(tx1);
savjeeCoin.pendingTransactions.push(tx2);
savjeeCoin.minePendingTransactions(miner);

// savjeeCoin.pendingTransactions=memPool();
for (let i = 0; i < 9; i++) {
    for (let i = 0; i < 3; i++) {
        try {
            const amount = Math.floor(Math.random() * 10) + 1
            const tx = new Transaction(myWalletAddress, myWalletAddress2, amount);
            tx.signTransaction(myKey);
            savjeeCoin.addTransaction(tx);
        } catch (error) {
            const tx = new Transaction(myWalletAddress2, myWalletAddress, amount);
            tx.signTransaction(myKey2);
            savjeeCoin.addTransaction(tx);
        }
    }
    savjeeCoin.minePendingTransactions(miner);
}

console.log();
console.log(`Balance of wallet1 is ${savjeeCoin.getBalanceOfAddress(myWalletAddress)}`);
console.log(`Balance of wallet2 is ${savjeeCoin.getBalanceOfAddress(myWalletAddress2)}`);
console.log(`Balance of miner is ${savjeeCoin.getBalanceOfAddress(miner)}`);

// // Check if the chain is valid

console.log();
console.log('Blockchain valid?', savjeeCoin.isChainValid() ? 'Yes' : 'No');
const SPVWallet = new SPV(savjeeCoin.chain)

// console.log(savjeeCoin.getAllTransactionsForWallet(myWalletAddress));
// console.log(savjeeCoin.chain)



