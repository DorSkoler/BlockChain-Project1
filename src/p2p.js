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
 wallet_balance: '1',
 new_transaction:'2'
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
if (me === MINER_PORT) {
    blockchain = new Main()
    wallets = {}
    wallets[me] = blockchain.miner
    wallets[peers[0]] = blockchain.SPVWallet
    wallets[peers[1]] = blockchain.SPVWallet2
    console.log("\n ------- Blockchain Miner - Choose your action ------- \n1)Mine Transactions\n2)Blockchain Balance\n3)Total Burnt Coins\n4)Wallets Balance\n5)Total Mined Coins\n");
} else{
    console.log("\n ------- Blockchain Wallet - Choose your action ------- \n1)Balance\n2)New Transaction\n");

}

//connect to peers
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
    const peerPort = extractPortFromIp(peerIp)
    log('connected to peer - ', peerPort)
    sockets[peerPort] = socket
    // if (me === MINER_PORT)
    //     console.log("1)Mine Transactions\n2)Blockchain Balance\n3)Total Burnt Coins\n4)Wallets Balance\n5)Total Mined Coins\n");


    stdin.on('data', data => { //on user input
        let message = data.toString().trim()
        if (message === 'exit') { //on exit
            log('Bye bye')
            exit(0)
        }
        // all the miner actions
        if (peerIp === toLocalIp(peers[0]) && me === MINER_PORT){
            switch (message) {
                case MESSAGE_TYPE.mine_transactions:
                    blockchain.mine()
                    console.log('-------------------')
                    console.log('Mined successfully')
                    console.log('-------------------')
                    return
                case MESSAGE_TYPE.blockchain_network_balance:
                    const balance = blockchain.getTotalNetBalance()
                    console.log(`Net balance is: ${balance}`)
                    return
                case MESSAGE_TYPE.burnt_coins:
                    console.log(blockchain.showTotalBurntCoins())
                    return
                case MESSAGE_TYPE.wallets_balance:
                    console.log(`Balance of ${peers[0]} - ${blockchain.showSPVWallet(wallets[peers[0]])}`)
                    console.log(`Balance of ${peers[1]} - ${blockchain.showSPVWallet(wallets[peers[1]])}`)
                    console.log(`Balance of ${me} - ${blockchain.showMinerWallet(wallets[me])}`)
                    return   
                case MESSAGE_TYPE.mined_coins:
                    const minedCoins = blockchain.getTotalBlocksMinedCoins()
                    console.log(`Block mined: ${minedCoins}`)
                    return
                default:
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
                default:
                    break;
            }
            
        }
    })

    //print data when received
    socket.on('data', data => {
        let message = data.toString().trim()
        if (me === MINER_PORT && message[0] === '#') {
            try {
                const array = message.split(' ')
                const amount = blockchain.addTrans(wallets[array[1]], wallets[array[2]], parseInt(array[3]))
                console.log(`Added transaction from: ${array[1]} to: ${array[2]} ${amount}`);
                return
                
            } catch (error) {
                console.log('Not enough balance');
                return
            }
        }
        if (me === MINER_PORT && message[0] === '$'){
            const array = message.split(' ')
            const wallet = array[1]
            sockets[wallet].write(`Balance of ${wallet} - ${blockchain.showSPVWallet(wallets[wallet])}`)
            return
        }
        console.log(message)
    })
})

function mineChain(){

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
