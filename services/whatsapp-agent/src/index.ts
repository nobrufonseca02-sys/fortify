import 'dotenv/config';
import { log } from './logger';
import { startBaileys } from './baileysClient';
import { startOutboundPoller } from './outboundPoller';
import { startHealthServer } from './health';

const AUTO_RESPOND_ENABLED = process.env.AUTO_RESPOND_ENABLED === 'true';
const WHATSAPP_PAIRING_MODE = process.env.WHATSAPP_PAIRING_MODE === 'true';

log.info({
  event: 'whatsapp_agent_starting',
  autoRespondEnabled: AUTO_RESPOND_ENABLED,
  pairingMode: WHATSAPP_PAIRING_MODE,
  anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  whatsappServiceSecretConfigured: Boolean(process.env.WHATSAPP_SERVICE_SECRET),
  model: process.env.WHATSAPP_AGENT_MODEL || 'claude-sonnet-5',
});

let connectionOpen = false;

startHealthServer(() => ({
  autoRespondEnabled: AUTO_RESPOND_ENABLED,
  connectionOpen,
}));

startBaileys()
  .then((sock) => {
    sock.ev.on('connection.update', (update) => {
      if (update.connection === 'open') connectionOpen = true;
      if (update.connection === 'close') connectionOpen = false;
    });
  })
  .catch((err) => {
    log.error({ event: 'whatsapp_agent_baileys_start_failed', error: err?.message });
    process.exitCode = 1;
  });

startOutboundPoller();

process.on('unhandledRejection', (reason: any) => {
  log.error({ event: 'whatsapp_agent_unhandled_rejection', error: reason?.message || String(reason) });
});
