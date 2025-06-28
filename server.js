import WebSocket from 'ws';
import { createServer } from 'http'
import { authenticate } from './auth.js';
import { getJid, logger, sendMessage } from './utils.js';
import { WASocketManager } from './socket.js';

// Create an HTTP server (optional, but common for WebSocket servers)
const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server running\n');
});

// Create a WebSocket server instance
const wss = new WebSocket.Server({ noServer:true }); // Attach to the HTTP server
let baileysSock = {};
let waConnected = {}

server.on('upgrade', async (request, socket, head) => {

    const authed = await authenticate(request)

    if (!authed) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        console.log("rejected")
        return
    }

    wss.handleUpgrade(request, socket, head, connection => {
        // Manually emit the 'connection' event on a WebSocket 
        // server (we subscribe to this event below).
        wss.emit('connection', connection, authed)
    })
})

// Event listener for new connections
wss.on('connection', async (ws,token) => {
    waConnected[token]?waConnected[token].push(1):waConnected[token] = [1]
    if (baileysSock[token]?.getCurrentSocket()) {
        const msg = {
            dataType: "conn",
            data: "open"
        };
        ws.send(JSON.stringify(msg));
    } else {
        baileysSock[token] = new WASocketManager(ws, token); // ✅ await here
        await baileysSock[token].connect()
    }
    // Store reference to the Baileys socket for this WebSocket connection

    // Event listener for messages from clients
    ws.on('message', async message => {
        try {
            message = JSON.parse(String(message));
            console.log(message);
        } catch (error) {
            console.log("message not json");
            console.log(String(message));
            message = {};
        }

        if (message.dataType == "message") {
            try {
                const number = getJid(message.data.number)
                const result = await sendMessage(baileysSock[token].getCurrentSocket(), number, message.data.text)
                ws.send(JSON.stringify(result))
            } catch (error) {
                const result = { dataType: "error", data: "Couldn't send message" }
                ws.send(JSON.stringify(result))
                console.log("sendMessage error:", error);
            }
        }
    });

    // Event listener for connection close
    ws.on('close',async () => {
        waConnected[token].pop()
        console.log('Client disconnected');
        // Close baileys connection on disconnect
        if (baileysSock[token].getCurrentSocket() && waConnected[token].length === 0) {
            baileysSock[token].cleanup("bailey-close");
        }
    });

    // Event listener for errors
    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});

// Start the HTTP server to listen for connections
const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`WebSocket server listening on port ${port}`);
});
