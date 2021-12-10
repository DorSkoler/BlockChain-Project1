const { MerkleTree } = require('merkletreejs')
const { Transaction } = require('../wallet/transactions')
const crypto = require('crypto');
const SHA256 = require('crypto-js/sha256')

class Block {
    /**
     * @param {number} timestamp
     * @param {Transaction[]} transactions
     * @param {string} previousHash
     */
    constructor(timestamp, transactions, previousHash = '', id) {
      this.previousHash = previousHash;
      this.timestamp = timestamp;
      this.transactions = transactions;
      this.nonce = 0;
      this.leaves = this.transactions.map(x => SHA256(x.signature))
      this.merkleTree = new MerkleTree(this.leaves, SHA256)
      this.merkleTreeRoot = this.merkleTree.getHexRoot()
      this.hash = this.calculateHash();
      this.id = id;
    }
  
    /**
     * Returns the SHA256 of this block (by processing all the data stored
     * inside this block)
     *
     * @returns {string}
     */
    calculateHash() {
  
      // merkleTree.toString('hex')
      // return merkleTree.getHexRoot()
      //return crypto.createHash('sha256').update(merkleTree).digest('hex');
      return crypto.createHash('sha256').update(this.previousHash + this.timestamp + this.merkleTreeRoot + this.nonce).digest('hex');
  
      // testing hash only with merkle tree root
      // return crypto.createHash('sha256').update(this.merkleTree.getHexRoot()+this.nonce).digest('hex');
    }
  
    /**
     * Starts the mining process on the block. It changes the 'nonce' until the hash
     * of the block starts with enough zeros (= difficulty)
     *
     * @param {number} difficulty
     */
    mineBlock(difficulty) {
      while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
        this.nonce++;
        this.hash = this.calculateHash();
      }
  
      debug(`Block mined: ${this.hash}`);
    }
  
    /**
     * Validates all the transactions inside this block (signature + hash) and
     * returns true if everything checks out. False if the block is invalid.
     *
     * @returns {boolean}
     */
    hasValidTransactions() {
      for (const tx of this.transactions) {
        if (!tx.isValid()) {
          return false;
        }
      }
  
      return true;
    }
  }

module.exports.Block = Block;