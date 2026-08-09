import { supabase } from './supabaseClient';
import { log } from './logger';
import { runAgentTurn } from './claudeAgent';

const AUTO_RESPOND_ENABLED = process.env.AUTO_RESPOND_ENABLED === 'true';
const WHATSAPP_DAILY_MESSAGE_LIMIT_PER_LEAD = Math.max(1, Number(process.env.WHATSAPP_DAILY_MESSAGE_LIMIT_PER_LEAD || 40));

export interface IncomingWhatsAppMessage {
  waMessageId: string;
  phoneNumber: string;
  waJid: string;
  displayName: string | null;
  text: string;
}

export interface AutoRespondResult {
  replyText: string;
}

async function upsertConversationForInboundMessage(msg: IncomingWhatsAppMessage) {
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone_number', msg.phoneNumber)
    .maybeSingle();

  if (existing) {
    const update: Record<string, unknown> = { last_inbound_at: new Date().toISOString() };
    if (msg.displayName && !existing.display_name) update.display_name = msg.displayName;
    if (existing.stage === 'new') update.stage = 'qualifying';
    const { data: updated } = await supabase
      .from('whatsapp_conversations')
      .update(update)
      .eq('id', existing.id)
      .select('*')
      .single();
    return updated || existing;
  }

  const { data: created, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      phone_number: msg.phoneNumber,
      wa_jid: msg.waJid,
      display_name: msg.displayName,
      stage: 'qualifying',
      last_inbound_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return created;
}

async function countTodayUserMessages(conversationId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('whatsapp_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .gte('created_at', todayStart.toISOString());
  return count || 0;
}

/**
 * Single entry point for every inbound WhatsApp message. Persists first, unconditionally --
 * that happens even with auto-respond off. The AUTO_RESPOND_ENABLED check below is the
 * entire kill switch: deliberately one early return, not spread across multiple gates, so
 * it's easy to audit. Nothing below that line runs while the switch is off.
 */
export async function handleIncomingMessage(msg: IncomingWhatsAppMessage): Promise<AutoRespondResult | null> {
  const conversation = await upsertConversationForInboundMessage(msg);

  const { error: insertError } = await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    role: 'user',
    content: msg.text,
    wa_message_id: msg.waMessageId,
    delivery_status: 'n/a',
    auto_responded: false,
  });
  // wa_message_id has a unique index (partial, where not null) for inbound dedupe -- a
  // duplicate delivery from Baileys' own retry logic should not be processed twice.
  if (insertError) {
    if (String(insertError.code) === '23505') {
      log.info({ event: 'whatsapp_inbound_duplicate_ignored', waMessageId: msg.waMessageId });
      return null;
    }
    throw insertError;
  }

  if (!AUTO_RESPOND_ENABLED) {
    log.info({ event: 'whatsapp_auto_respond_disabled_message_logged_only', conversationId: conversation.id });
    return null; // <-- the entire kill switch. No AI call, no send, below this line.
  }

  const todayCount = await countTodayUserMessages(conversation.id);
  if (todayCount > WHATSAPP_DAILY_MESSAGE_LIMIT_PER_LEAD) {
    log.warn({ event: 'whatsapp_daily_limit_reached', conversationId: conversation.id, todayCount });
    return null; // stay silent rather than send an automated "you've hit a limit" message
  }

  const { data: historyRows } = await supabase
    .from('whatsapp_messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit(50);

  const history = ((historyRows || []) as { role: string; content: string }[])
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .slice(-10)
    .map((row) => ({ role: row.role as 'user' | 'assistant', content: row.content }));
  // Drop the just-inserted inbound row from history -- runAgentTurn appends newUserMessage
  // itself, so including it twice would duplicate the latest turn.
  if (history.length && history[history.length - 1]?.content === msg.text) {
    history.pop();
  }

  const { replyText, updatedLeadContext, toolCalls } = await runAgentTurn({
    conversationId: conversation.id,
    phoneNumber: msg.phoneNumber,
    history,
    newUserMessage: msg.text,
    leadContext: conversation.lead_context || {},
  });

  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversation.id,
    role: 'assistant',
    content: replyText,
    tool_calls: toolCalls.length ? toolCalls : null,
    delivery_status: 'sent', // sent directly below, in the same process that holds the socket
    auto_responded: true,
  });

  const conversationUpdate: Record<string, unknown> = { last_outbound_at: new Date().toISOString() };
  if (updatedLeadContext) conversationUpdate.lead_context = { ...conversation.lead_context, ...updatedLeadContext };
  await supabase.from('whatsapp_conversations').update(conversationUpdate).eq('id', conversation.id);

  log.info({ event: 'whatsapp_agent_replied', conversationId: conversation.id, toolCallCount: toolCalls.length });

  return { replyText };
}
