import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { handleMessage } from './bot-handler';

const logger = pino({ level: 'info' });

class WhatsAppBot {
  private sock: any;
  private authDir: string;
  private qrCodeGenerated: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    this.authDir = path.join(process.cwd(), 'whatsapp-auth');
    this.ensureAuthDir();
  }

  private ensureAuthDir() {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  async start() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      
      logger.info(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false, // We'll handle QR code generation manually
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.macOS('Desktop'),
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 10_000,
        emitOwnEvents: false,
        getMessage: async (key) => {
          return { conversation: 'hello' }
        }
      });

      this.sock.ev.on('creds.update', saveCreds);
      this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
      this.sock.ev.on('messages.upsert', this.handleMessages.bind(this));

      logger.info('WhatsApp bot starting...');
    } catch (error) {
      logger.error('Error starting WhatsApp bot:', error);
      throw error;
    }
  }

  private handleConnectionUpdate(update: any) {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !this.qrCodeGenerated) {
      console.log('\n📱 Scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
      console.log('\nOr use pairing code by calling /api/whatsapp/pair-code');
      this.qrCodeGenerated = true;
    }

    if (connection === 'close') {
      this.isConnected = false;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      
      logger.info('Connection closed due to', lastDisconnect?.error);
      
      // Handle different disconnect reasons
      if (statusCode === DisconnectReason.loggedOut) {
        logger.info('Device logged out, please restart to reconnect');
        this.qrCodeGenerated = false;
      } else if (statusCode === DisconnectReason.restartRequired) {
        logger.info('Restart required, restarting...');
        setTimeout(() => this.start(), 2000);
      } else if (statusCode === DisconnectReason.timedOut || statusCode === DisconnectReason.connectionLost) {
        logger.info('Connection timed out or lost, attempting reconnect...');
        setTimeout(() => this.start(), 5000);
      } else {
        logger.info('Reconnecting in 3 seconds...');
        setTimeout(() => this.start(), 3000);
      }
    } else if (connection === 'open') {
      logger.info('WhatsApp bot connected successfully! 🎉');
      this.isConnected = true;
      this.qrCodeGenerated = false;
    } else if (connection === 'connecting') {
      logger.info('Connecting to WhatsApp...');
    }
  }

  private async handleMessages(m: any) {
    const message = m.messages[0];
    if (!message || message.key.fromMe) return;

    try {
      await handleMessage(this.sock, message);
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  async generatePairingCode(phoneNumber: string): Promise<string> {
    if (!this.sock) {
      throw new Error('WhatsApp bot not initialized');
    }

    if (!this.isConnected) {
      throw new Error('WhatsApp bot not connected. Please wait for connection or scan QR code.');
    }

    try {
      // Remove any non-digit characters and ensure proper format
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      // Validate phone number format
      if (cleanPhoneNumber.length < 10 || cleanPhoneNumber.length > 15) {
        throw new Error('Invalid phone number format');
      }
      
      const pairingCode = await this.sock.requestPairingCode(cleanPhoneNumber);
      
      logger.info(`Pairing code generated for ${cleanPhoneNumber}: ${pairingCode}`);
      return pairingCode;
    } catch (error) {
      logger.error('Error generating pairing code:', error);
      throw new Error(`Failed to generate pairing code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getConnectionStatus(): { connected: boolean; phoneNumber?: string } {
    return {
      connected: this.isConnected,
      phoneNumber: this.sock?.user?.id?.split(':')[0]
    };
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp bot not connected');
    }

    try {
      const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text: message });
      logger.info(`Message sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  async stop() {
    if (this.sock) {
      await this.sock.logout();
      this.isConnected = false;
      logger.info('WhatsApp bot stopped');
    }
  }
}

export const whatsappBot = new WhatsAppBot();
