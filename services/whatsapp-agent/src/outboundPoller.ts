import { supabase } from './supabaseClient';
import { log } from './logger';
import { getSocket } from './baileysClient';

const AUTO_RESPOND_ENABLED = process.env.AUTO_RESPOND_ENABLED === 'true';
const POLL_INTERVAL_MS = 5000;

/**
 * Handles the one cross-process case: the gateway's Stripe webhook handler has no Baileys
 * socket of its own, so it queues outbound messages (payment confirmations) as
 * whatsapp_messages rows with delivery_status='pending'. This poller -- running inside the
 * process that actually holds the live socket -- picks them up and sends them. Normal AI
 * replies from runAgentTurn don't go through this path; they send directly and persist with
 * delivery_status='sent' immediately.
 *
 * Respects AUTO_RESPOND_ENABLED by design: during the warmup window, paid leads' magic
 * links sit here as 'pending' rather than being auto-sent. See the plan file for the
 * reasoning -- this keeps the safety story to one flag, at the cost of needing a manual
 * fallback (query this table, or read the magic link from gateway logs) for any WhatsApp
 * lead who pays before the number finishes warming up.
 */
export function startOutboundPoller() {
  const interval = setInterval(async () => {
    try {
      const { data: pending, error } = await supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, content, delivery_attempts')
        .eq('delivery_status', 'pending')
        .lt('delivery_attempts', 5)
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      if (!pending || pending.length === 0) return;

      if (!AUTO_RESPOND_ENABLED) return;

      const sock = getSocket();
      if (!sock) return;

      for (const row of pending) {
        const { data: conversation } = await supabase
          .from('whatsapp_conversations')
          .select('phone_number')
          .eq('id', row.conversation_id)
          .maybeSingle();

        if (!conversation?.phone_number) {
          await supabase
            .from('whatsapp_messages')
            .update({ delivery_status: 'failed', delivery_attempts: row.delivery_attempts + 1 })
            .eq('id', row.id);
          continue;
        }

        try {
          const jid = `${conversation.phone_number.replace('+', '')}@s.whatsapp.net`;
          await sock.sendMessage(jid, { text: row.content });
          await supabase.from('whatsapp_messages').update({ delivery_status: 'sent' }).eq('id', row.id);
          await supabase
            .from('whatsapp_conversations')
            .update({ last_outbound_at: new Date().toISOString() })
            .eq('id', row.conversation_id);
          log.info({ event: 'whatsapp_outbound_poller_sent', messageId: row.id });
        } catch (sendErr: any) {
          await supabase
            .from('whatsapp_messages')
            .update({ delivery_status: 'failed', delivery_attempts: row.delivery_attempts + 1 })
            .eq('id', row.id);
          log.error({ event: 'whatsapp_outbound_poller_send_failed', messageId: row.id, error: sendErr?.message });
        }
      }
    } catch (err: any) {
      log.error({ event: 'whatsapp_outbound_poller_failed', error: err?.message });
    }
  }, POLL_INTERVAL_MS);

  return () => clearInterval(interval);
}
