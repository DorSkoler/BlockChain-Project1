const topology = require('fully-connected-topology')
const { Main } = require('./main')
const prompt = require('prompt-sync')();

const MINER_PORT = '1111'

 const MESSAGE_TYPE = {
 mine_transactions: '1',
 blockchain_network_balance: '2',
 burnt_coins: '3',
 wallets_balance :'4',
 mined_coins: '5',
 exit: '6',
 wallet_balance: '1',
 new_transaction:'2',
 show_transactions_wallet:'3',
 find_transaction_index: '4'
}
const {
    stdin,
    exit,
    argv
} = process
const {
    log
} = console
const {
    me,
    peers
} = extractPeersAndMyPort()
const sockets = {}

log('---------------------')
log('Welcome to p2p chat!')
log('me - ', me)
log('peers - ', peers)
log('connecting to peers...')

const myIp = toLocalIp(me)
const peerIps = getPeerIps(peers)
let blockchain
let wallets
let hashToAddress ={}
if (me === MINER_PORT) {
    blockchain = new Main()
    wallets = {}
    wallets[me] = blockchain.miner
    wallets[peers[0]] = blockchain.SPVWallet
    wallets[peers[1]] = blockchain.SPVWallet2
    hashToAddress[wallets[peers[0]].publicKey] = "Address Wallet 1"
    hashToAddress[wallets[peers[1]].publicKey] = "Address Wallet 2"
    hashToAddress[null] = "Reward Tx - None"
    menuMiner()
} else{
    menuPeer()
}

//connect to peers
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
    const peerPort = extractPortFromIp(peerIp)
    log('connected to peer - ', peerPort)
    sockets[peerPort] = socket

    stdin.on('data', data => { //on user input
        let message = data.toString().trim()
        // all the miner actions
        if (peerIp === toLocalIp(peers[0]) && me === MINER_PORT){
            switch (message) {
                case MESSAGE_TYPE.mine_transactions:
                    blockchain.mineTransactions()
                    console.log('------------------- Mined successfully -------------------')
                    menuMiner()
                    return
                case MESSAGE_TYPE.blockchain_network_balance:
                    const balance = blockchain.getTotalBlockchainBalance()
                    console.log(` ----------- Blockchain network balance : ${balance} -----------`)
                    menuMiner()
                    return
                case MESSAGE_TYPE.burnt_coins:
                    const burntCoins = blockchain.getTotalBurntCoins()
                    console.log(` ----------- Blockchain Burnt Coins : ${burntCoins} -----------`)
                    menuMiner()
                    return
                case MESSAGE_TYPE.wallets_balance:
                    console.log(`Balance of ${peers[0]} - ${blockchain.showSPVWallet(wallets[peers[0]])}`)
                    console.log(`Balance of ${peers[1]} - ${blockchain.showSPVWallet(wallets[peers[1]])}`)
                    console.log(`Balance of ${me} - ${blockchain.showMinerWallet(wallets[me])}`)
                    menuMiner()
                    return   
                case MESSAGE_TYPE.mined_coins:
                    const minedCoins = blockchain.getTotalBlocksMinedCoins()
                    console.log(` ----------- Total Mined Coins : ${minedCoins} -----------`)
                    menuMiner()
                    return
                case MESSAGE_TYPE.exit:
                    console.log('Bye bye')
                    exit(0)
                default:
                    console.log("Please enter valid option");
                    menuMiner()
                    break
            }
        }
        if(me!== MINER_PORT && peerIp === toLocalIp(peers[0])){
            switch (message) {
                case MESSAGE_TYPE.wallet_balance:                    
                    sockets[MINER_PORT].write(`$ ${me}`)
                    return
                case MESSAGE_TYPE.new_transaction:
                    var peer = prompt("Which peer to transfer?")
                    var amount = prompt("How much do you want to transfer?")
                    sockets[MINER_PORT].write(`# ${me} ${peer} ${amount}`)
                    return
                case MESSAGE_TYPE.show_transactions_wallet:
                    sockets[MINER_PORT].write(`% ${me}`)
                    return 
                case MESSAGE_TYPE.find_transaction_index:
                    var indexTx = prompt("Which Transaction do you want to search for? Enter index >= 1 : ")
                    sockets[MINER_PORT].write(`! ${me} ${indexTx-1}`)
                    return        
                default:
                    console.log("Please enter valid option");
                    menuPeer()
                    break;
            }
            
        }
    })

    //print data when received
    socket.on('data', data => {
        let message = data.toString().trim()
        if(me===MINER_PORT){
            const array = message.split(' ')
            const wallet = array[1]
            switch (message[0]) {
                case '#':
                    try {
                        const amount = blockchain.addTrans(wallets[array[1]], wallets[array[2]], parseInt(array[3]))
                        console.log(`Added transaction from: ${array[1]} to: ${array[2]} ${amount}`);
                        return
                        
                    } catch (error) {
                        console.log('----------- Not enough balance -----------');
                        return
                    }
                case '$':
                    sockets[wallet].write(`Balance of ${wallet} - ${blockchain.showSPVWallet(wallets[wallet])}`)
                    return
                case '%':
                    const transactions = blockchain.blockchain.getAllTransactionsForWallet(wallets[wallet].publicKey)
                    var txstring=''
                    for(let i=0; i<transactions.length ; i++)
                      txstring+=`\nTransaction ${i+1}\n{\n\tFrom Address : ${hashToAddress[transactions[i].fromAddress]},\n\tTo Address : ${hashToAddress[transactions[i].toAddress]},\n\tAmount : ${transactions[i].amount},\n\tTimestamp : ${transactions[i].timestamp}\n}\n`
                    sockets[wallet].write(txstring)
                    return
                case '!':
                    const index = array[2]
                    const txs = blockchain.blockchain.getAllTransactionsForWallet(wallets[wallet].publicKey)
                    sockets[wallet].write(`Transaction is valid : ${wallets[wallet].isTsxInBlockChain(txs[index]) ? true : false}`)    
                default:
                    return
            }
        }
        console.log(message);
        menuPeer()
    })
})

function menuPeer(){
    console.log("\n ------- Blockchain Wallet - Choose your action ------- \n1)Balance\n2)New Transaction\n3)All Transactions\n4)Valid Transaction By Index");

}
function menuMiner(){
    console.log("\n ------- Blockchain Miner - Choose your action ------- \n1)Mine Transactions\n2)Blockchain Balance\n3)Total Burnt Coins\n4)Wallets Balance\n5)Total Mined Coins\n6)Exit");

}

//extract ports from process arguments, {me: first_port, peers: rest... }
function extractPeersAndMyPort() {
    return {
        me: argv[2],
        peers: argv.slice(3, argv.length)
    }
}

//'4000' -> '127.0.0.1:4000'
function toLocalIp(port) {
    return `127.0.0.1:${port}`
}

//['4000', '4001'] -> ['127.0.0.1:4000', '127.0.0.1:4001']
function getPeerIps(peers) {
    return peers.map(peer => toLocalIp(peer))
}

//'hello' -> 'myPort:hello'
function formatMessage(message) {
    return `${me}>${message}`
}

//'127.0.0.1:4000' -> '4000'
function extractPortFromIp(peer) {
    return peer.toString().slice(peer.length - 4, peer.length);
}

//'4000>hello' -> '4000'
function extractReceiverPeer(message) {
    return message.slice(0, 4);
}

//'4000>hello' -> 'hello'
function extractMessageToSpecificPeer(message) {
    return message.slice(5, message.length);
}
