const topology = require('fully-connected-topology')
const { Main } = require('./main')
const MINER_PORT = '1111'
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
}

//connect to peers
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
    const peerPort = extractPortFromIp(peerIp)
    log('connected to peer - ', peerPort)
    sockets[peerPort] = socket

    stdin.on('data', data => { //on user input
        let message = data.toString().trim()
        if (message === 'exit') { //on exit
            log('Bye bye')
            exit(0)
        }
        // all the miner actions
        if (peerIp === toLocalIp(peers[0]) && me === MINER_PORT){
            if (message === 'net balance') {
                const balance = blockchain.getTotalNetBalance()
                console.log(`Net balance is: ${balance}`)
                return
            }
            if (message === 'total mined coins') {
                const coins = blockchain.showTotalMinedCoins()
                console.log(`Total mined coins: ${coins}`)
                return
            }
            if (message === 'mine') {
                blockchain.mine()
                console.log('Mined successfully');
                return
            }
        }

        if (message.slice(0, 6) === 'wallet' && peerIp === toLocalIp(peers[0])) {
            if (message.length === 6 && me === MINER_PORT) {
                console.log(`Balance of ${peers[0]} - ${blockchain.showWallet(wallets[peers[0]])}`)
                console.log(`Balance of ${peers[1]} - ${blockchain.showWallet(wallets[peers[1]])}`)
            }
            else if (me === MINER_PORT) {
                try {
                    const wallet = message.slice(7)
                    console.log(`Balance of ${wallet} - ${blockchain.showWallet(wallets[wallet])}`)
                    return
                } catch (error) {
                    console.log('No such wallet');
                }
            }
            else{
                sockets[MINER_PORT].write(`$ ${me}`)
            }
        }

        const receiverPeer = extractReceiverPeer(message)
        message = extractMessageToSpecificPeer(message)

        if (!isNaN(message) && peerIp === toLocalIp(MINER_PORT)) {
            sockets[MINER_PORT].write(`# ${me} ${receiverPeer} ${message}`)
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
            }
        }
        if (me === MINER_PORT && message[0] === '$'){
            const array = message.split(' ')
            const wallet = array[1]
            sockets[wallet].write(`Balance of ${wallet} - ${blockchain.showWallet(wallets[wallet])}`)
            return
        }
        console.log(message)
    })
})


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
