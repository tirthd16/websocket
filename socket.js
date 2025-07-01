import { DisconnectReason, makeWASocket, useMultiFileAuthState, } from 'baileys';
import { useSupabaseAuthState } from './useSupabaseAuthState.js';
import { logger } from './utils.js';

export class WASocketManager {
    constructor(ws, filePath) {
        this.ws = ws
        this.filePath = filePath
        this.currentSocket = null
        this.isReconnecting = false
    }
    
    async connect() {
        const { state, saveCreds, deleteCreds } = await useSupabaseAuthState(this.filePath)
        const sock = makeWASocket({
            logger,
            auth: state,
        })
        
        this.currentSocket = sock
        
        sock.ev.process(async (events) => {
                console.log(events)
            if (events['connection.update']) {
                const update = events['connection.update']
                const { connection, lastDisconnect, qr } = update
                
                if (qr) {
                    console.log(qr)
                    const msg = {
                        dataType: "qr",
                        data: qr
                    }
                    this.ws.send(JSON.stringify(msg))
                }
                
                if (connection === 'close') {
                    console.log(lastDisconnect)
                    if ( (lastDisconnect?.error)?.output?.statusCode == DisconnectReason.loggedOut ) {
                        console.log('You are logged out.')
                        deleteCreds()
                        this.reconnect()
                            
                    } else if (
                         (lastDisconnect?.error)?.output?.statusCode == DisconnectReason.restartRequired 
                        && !this.isReconnecting
                    ) {
                        this.reconnect()
                    } else if (!this.isReconnecting) {
                        console.log('Connection closed.')
                        this.cleanup()
                    }
                }
                
                if (connection === 'open') {
                    this.isReconnecting = false
                    const msg = {
                        dataType: "conn",
                        data: "open"
                    }
                    this.ws.send(JSON.stringify(msg))
                }
            }
            
            if (events['creds.update']) {
                saveCreds()
            }
        })
        
        return sock
    }
    
    async reconnect() {
        if (this.isReconnecting) {
            console.log("Already reconnecting")
            return
        }
        
        this.isReconnecting = true
        console.log('Attempting to reconnect...')
        
        // Clean up current socket
        if (this.currentSocket) {
            this.currentSocket.end()
            this.currentSocket = null
        }
        
            try {
                await this.connect()
                console.log('Reconnected successfully')
            } catch (error) {
                console.error('Reconnection failed:', error)
                // Could implement exponential backoff here
            } finally {
                this.isReconnecting = false
            }
    }
    
    cleanup(msg=null) {
        if (this.currentSocket) {
            this.currentSocket.end(msg)
            this.currentSocket = null
        }
        this.isReconnecting = false
    }
    
    getCurrentSocket() {
        return this.currentSocket
    }
}

// Usage example:
// const socketManager = new WASocketManager(ws, filePath)
// const initialSocket = await socketManager.connect()
// Later, you can get current socket: socketManager.getCurrentSocket()
