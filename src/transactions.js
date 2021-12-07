const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const {Transaction} = require('./blockchain');
function memPool () {
    const myKey = ec.genKeyPair();
    const walletAddress = myKey.getPublic("hex");
    const transactions = [];
    for (let i = 0; i < 30; i++){
      const tx = new Transaction(walletAddress, "address2", Math.floor(Math.random() * 100) + 1);
      tx.signTransaction(myKey);
      transactions.push(tx);
      
    }
    return transactions;
  };
module.exports.memPool = memPool;
