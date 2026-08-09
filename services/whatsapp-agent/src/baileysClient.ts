import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  type WASocket,
} from '@whiskeysockets/baileys';
import { log } from './logger';
import { handleIncomingMessage } from './autoRespond';

const WHATSAPP_PAIRING_MODE = process.env.WHATSAPP_PAIRING_MODE === 'true';
const WHATSAPP_BUSINESS_PHONE_NUMBER = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER || '';

let currentSocket: WASocket | null = null;

export function getSocket(): WASocket | null {
  return currentSocket;
}

function extractMessageText(message: any): string | null {
  if (!message) return null;
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

// WhatsApp has been migrating some contexts to LID (linked-device identifier) JIDs
// instead of phone-number JIDs -- jidNormalizedUser is Baileys' own normalization
// helper, used deliberately instead of hand-rolled regex on the raw JID. Not fully
// verified against every JID shape Baileys can hand back; watch real inbound traffic
// during the warmup window before trusting this fully.
function phoneNumberFromJid(jid: string): string {
  const normalized = jidNormalizedUser(jid);
  const digits = normalized.split('@')[0].replace(/\D/g, '');
  return digits ? `+${digits}` : normalized;
}

export async function startBaileys(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_state');
  const sock = makeWASocket({ auth: state });
  currentSocket = sock;

  sock.ev.on('creds.update', saveCreds);

  if (WHATSAPP_PAIRING_MODE && !sock.authState.creds.registered) {
    const phoneDigitsOnly = WHATSAPP_BUSINESS_PHONE_NUMBER.replace(/\D/g, '');
    if (!phoneDigitsOnly) {
      log.error({ event: 'whatsapp_pairing_missing_phone_number' });
    } else {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneDigitsOnly);
          // Deliberately the one place this service prints to stdout directly, in
          // addition to structured logging -- the operator needs this visible in a
          // plain SSH terminal during the one-time interactive pairing step.
          // eslint-disable-next-line no-console
          console.log(`\n\n>>> WhatsApp pairing code: ${code}\n>>> Enter this on the phone: WhatsApp > Linked Devices > Link with phone number\n\n`);
          log.info({ event: 'whatsapp_pairing_code_generated' });
        } catch (err: any) {
          log.error({ event: 'whatsapp_pairing_code_failed', error: err?.message });
        }
      }, 3000); // give the socket a moment to establish before requesting a code
    }
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      log.info({ event: 'whatsapp_connection_open' });
    }
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      log.warn({ event: 'whatsapp_connection_closed', statusCode, shouldReconnect });
      if (shouldReconnect) {
        startBaileys().catch((err) => log.error({ event: 'whatsapp_reconnect_failed', error: err?.message }));
      } else {
        log.error({ event: 'whatsapp_logged_out', message: 'Session was logged out from the phone. Re-pairing required (npm run pair).' });
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue; // never process our own outbound messages as inbound
      if (!msg.key.remoteJid || msg.key.remoteJid.endsWith('@g.us')) continue; // ignore group chats
      const text = extractMessageText(msg.message);
      if (!text) continue;

      try {
        const result = await handleIncomingMessage({
          waMessageId: msg.key.id || `${msg.key.remoteJid}-${Date.now()}`,
          phoneNumber: phoneNumberFromJid(msg.key.remoteJid),
          waJid: jidNormalizedUser(msg.key.remoteJid),
          displayName: msg.pushName || null,
          text,
        });

        if (result) {
          await sock.sendMessage(msg.key.remoteJid, { text: result.replyText });
        }
      } catch (err: any) {
        log.error({ event: 'whatsapp_message_handling_failed', error: err?.message });
      }
    }
  });

  return sock;
}
