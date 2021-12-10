const { ChainUtil } = require('../keyGen')

class SPV {
    constructor(Blockchain) {
        this.blockChainHeaders = this.addSPVHeaders(Blockchain)
        this.keyPair = ChainUtil.genKeyPair()
        this.publicKey = this.keyPair.genPublic().encode('hex');
    }

    toString() {
        return `Wallet - 
        publicKey: ${this.publicKey.toString()}
        balance  : ${this.balance}`
    }

    /**
      * Add all headers from the blockchain without the transactions of each block.
      *
      * @param {Blockchain} Blockchain
      */
    addSPVHeaders(Blockchain) {
        const blockHeaders = []
        for (let index = 0; index < Blockchain.length; index++) {
            const block = Blockchain[index]
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
        }
        return blockHeaders
    }
    /**
     * Checking whether a transaction is inside a block and if that transaction is valid.
     *
     * @param {Transaction} transaction
     */
    isTsxInBlockChain(tsx) {
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

module.exports.SPV = SPV