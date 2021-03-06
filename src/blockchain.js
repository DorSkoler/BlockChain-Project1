const crypto = require('crypto');
const { MerkleTree } = require('merkletreejs')
const SHA256 = require('crypto-js/sha256')
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const debug = require('debug')('savjeecoin:blockchain');
const { BloomFilter } = require('bloom-filters');

class Transaction {
  /**
   * @param {string} fromAddress
   * @param {string} toAddress
   * @param {number} amount
   */
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = Date.now();
  }

  /**
   * Creates a SHA256 hash of the transaction
   *
   * @returns {string}
   */
  calculateHash() {
    return crypto.createHash('sha256').update(this.fromAddress + this.toAddress + this.amount + this.timestamp).digest('hex');
  }



  /**
   * Signs a transaction with the given signingKey (which is an Elliptic keypair
   * object that contains a private key). The signature is then stored inside the
   * transaction object and later stored on the blockchain.
   *
   * @param {string} signingKey
   */
  signTransaction(signingKey) {
    // You can only send a transaction from the wallet that is linked to your
    // key. So here we check if the fromAddress matches your publicKey
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }


    // Calculate the hash of this transaction, sign it with the key
    // and store it inside the transaction object
    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');

    this.signature = sig.toDER('hex');
  }

  /**
   * Checks if the signature is valid (transaction has not been tampered with).
   * It uses the fromAddress as the public key.
   *
   * @returns {boolean}
   */
  isValid() {
    // If the transaction doesn't have a from address we assume it's a
    // mining reward and that it's valid. You could verify this in a
    // different way (special field for instance)
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }
    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

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

    return crypto.createHash('sha256').update(this.previousHash + this.timestamp + this.merkleTreeRoot + this.nonce).digest('hex');

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

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 10;
    this.minedCoins = 0;
    this.minerExtra = 1;
    this.burntCoins = 0;
    this.totalCoins = 300;
  }

  /**
   * @returns {Block}
   */
  createGenesisBlock() {
    return new Block(Date.parse('2017-01-01'), [], '0', 0);
  }

  /**
   * Returns the latest block on our chain. Useful when you want to create a
   * new Block and you need the hash of the previous Block.
   *
   * @returns {Block[]}
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Takes all the pending transactions, puts them in a Block and starts the
   * mining process. It also adds a transaction to send the mining reward to
   * the given address.
   *
   * @param {string} miningRewardAddress
   */
  minePendingTransactions(miningRewardAddress) {
    // for each mining we need to push 4 transactions to the new block. 
    // We will take the first 3 pending transactions and we will add the reward for the miner.
    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
    const pending3trans = this.pendingTransactions.slice(0, 3)
    for (const trans of pending3trans) {
      if (trans.toAddress === 'Burned-Coins-Address') {
        this.burntCoins += trans.amount
        this.totalCoins -= trans.amount
      }
      this.minedCoins += trans.amount
    }
    pending3trans.push(rewardTx);
    const block = new Block(Date.now(), pending3trans, this.getLatestBlock().hash, this.chain.length);
    block.mineBlock(this.difficulty);

    debug('Block successfully mined!');
    this.minedCoins += this.miningReward
    this.totalCoins += this.miningReward
    this.chain.push(block);
    // finally we need to keep the pending transactions as it was but without the 3 last transactions
    this.pendingTransactions = this.pendingTransactions.slice(3)
  }

  /**
   * Add a new transaction to the list of pending transactions (to be added
   * next time the mining process starts). This verifies that the given
   * transaction is properly signed.
   *
   * @param {Transaction} transaction
   */
  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    // Verify the transactiion
    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }

    if (transaction.amount <= 0) {
      throw new Error('Transaction amount should be higher than 0');
    }

    // Making sure that the amount sent is not greater than existing balance

    if (this.getBalanceOfAddress(transaction.fromAddress) < transaction.amount) {
      throw new Error('Not enough balance');
    }

    this.pendingTransactions.push(transaction);
    debug('transaction added: %s', transaction);
  }

  /**
   * Returns the balance of a given wallet address.
   *
   * @param {string} address
   * @returns {number} The balance of the wallet
   */
  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }

        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }
    // console.log("before: " + balance);
    for (const trans of this.pendingTransactions) {
      if (trans.fromAddress === address) {
        balance -= trans.amount
      }
      if (trans.toAddress === address) {
        balance += trans.amount
      }
    }
    // console.log("after: " + balance);
    debug('getBalanceOfAdrees: %s', balance);
    return balance;
  }

  /**
   * Returns a list of all transactions that happened
   * to and from the given wallet address.
   *
   * @param  {string} address
   * @return {Transaction[]}
   */
  getAllTransactionsForWallet(address) {
    const txs = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          txs.push(tx);
        }
      }
    }

    // If the user want to print the transactions, 
    // we will print also the pending transactions so if the user want to search for specific transaction,
    // it will return boolean value if the transaction is Valid.
    for (const trans of this.pendingTransactions) {
      txs.push(trans);
    }

    debug('get transactions for wallet count: %s', txs.length);
    return txs;
  }

  /**
   * Loops over all the blocks in the chain and verify if they are properly
   * linked together and nobody has tampered with the hashes. By checking
   * the blocks it also verifies the (signed) transactions inside of them.
   *
   * @returns {boolean}
   */
  isChainValid() {
    // Check if the Genesis block hasn't been tampered with by comparing
    // the output of createGenesisBlock with the first block on our chain
    const realGenesis = JSON.stringify(this.createGenesisBlock());

    if (realGenesis !== JSON.stringify(this.chain[0])) {
      return false;
    }

    // Check the remaining blocks on the chain to see if there hashes and
    // signatures are correct
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (previousBlock.hash !== currentBlock.previousHash) {
        return false;
      }

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
    }
    return true;
  }
}

class SPV {
  constructor(Blockchain, key, publicKey) {
    this.blockChainHeaders = this.addSPVHeaders(Blockchain)
    this.keyPair = key
    this.publicKey = publicKey
    this.bloomFilter = new BloomFilter(30000, 6);
  }

  /**
    * Add all headers from the blockchain without the transactions of each block.
    *
    * @param {Blockchain} blockchain
    */
  addSPVHeaders(blockchain) {
    const blockHeaders = []
    for (let index = 0; index < blockchain.length; index++) {
      const block = blockchain[index]
      const newHeader = {
        blockID: index + 1,
        blockNonce: block.nonce,
        blockHash: block.hash,
        blockMerkle: block.merkleTree,
        blockMerkleRoot: block.merkleTreeRoot,
        blockTimestamp: block.timestamp,
        blockPrevHash: block.previousHash
      }
      blockHeaders.push(newHeader)
      // adding the hash of each transaction to the bloom filter structure.
    }
    for (const trans of blockchain[blockchain.length - 1].transactions) {
      this.bloomFilter.add((trans.fromAddress + trans.toAddress + trans.amount + trans.timestamp))
    }
    return blockHeaders
  }
  /**
   * Checking whether a transaction is inside a block and if that transaction is valid.
   *
   * @param {Transaction} transaction
   */
  isTsxInBlockChain(tsx) {
    // checking if the transaction is inside the bloom filter first with the false-positive method
    if (!this.bloomFilter.has((tsx.fromAddress + tsx.toAddress + tsx.amount + tsx.timestamp))) {
      return false;
    }

    const leafTx = SHA256(tsx.signature)
    for (let i = 0; i < this.blockChainHeaders.length; i++) {
      const merkleTree = this.blockChainHeaders[i].blockMerkle
      const merkleTreeRoot = this.blockChainHeaders[i].blockMerkleRoot
      const proof = merkleTree.getProof(leafTx)
      if (merkleTree.verify(proof, leafTx, merkleTreeRoot) && tsx.isValid())
        return true
    }
    return false
  }

}

module.exports.Blockchain = Blockchain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;
module.exports.SPV = SPV