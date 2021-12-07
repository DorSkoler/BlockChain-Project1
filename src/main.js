//import {mempool} from './transactions.js';
const { Blockchain, Transaction,SPV } = require('./blockchain');
const SHA256 = require('crypto-js/sha256')
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const {memPool} = require('./transactions');



// Your private key goes here
const myKey = ec.genKeyPair();

// From that we can calculate your public key (which doubles as your wallet address)
const myWalletAddress = myKey.getPublic('hex');
console.log(myWalletAddress);
// Create new instance of Blockchain class
const savjeeCoin = new Blockchain();
savjeeCoin.pendingTransactions=memPool();
console.log(savjeeCoin.pendingTransactions);

// Mine first block
savjeeCoin.minePendingTransactions(myWalletAddress);


// // Create a transaction & sign it with your key
const tx1 = new Transaction(myWalletAddress, 'address2', 100);
tx1.signTransaction(myKey);
savjeeCoin.addTransaction(tx1);
console.log(tx1);

// // Mine block
savjeeCoin.minePendingTransactions(myWalletAddress);

// // Create second transaction
const tx2 = new Transaction(myWalletAddress, 'address1', 50);
tx2.signTransaction(myKey);
savjeeCoin.addTransaction(tx2);

// // Mine block
savjeeCoin.minePendingTransactions(myWalletAddress);

console.log();
console.log(`Balance of xavier is ${savjeeCoin.getBalanceOfAddress(myWalletAddress)}`);

// // Check if the chain is valid

console.log();
console.log('Blockchain valid?', savjeeCoin.isChainValid() ? 'Yes' : 'No');
const SPVWallet =new SPV(savjeeCoin.chain)

console.log(savjeeCoin.getAllTransactionsForWallet(myWalletAddress));



