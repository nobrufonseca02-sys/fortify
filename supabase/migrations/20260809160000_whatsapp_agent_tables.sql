-- WhatsApp AI sales/qualification agent: conversation + message persistence.
-- Leads are NOT authenticated Fortify users -- there is no auth.uid() to scope
-- RLS against. Every row here is written/read exclusively by the gateway and
-- whatsapp-agent services via their service-role Supabase clients, which
-- always bypass RLS. RLS is enabled with ZERO policies for anon/authenticated
-- roles, which is a default-deny for every non-service-role caller. Additive
-- only.

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,                 -- E.164, e.g. +5521999999999
  wa_jid text,                                 -- normalized WhatsApp JID (phone@s.whatsapp.net)
  display_name text,                           -- WhatsApp push name, best-effort, not verified identity
  stage text not null default 'new',           -- new | qualifying | demoed | objection | converted_beta | converted_paid | lost
  lead_context jsonb not null default '{}'::jsonb, -- prop firm, account size, past violations, plan interest, etc.
  linked_user_id uuid references auth.users(id) on delete set null, -- set once this lead becomes a real Fortify account
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_conversations_stage_check check (
    stage in ('new', 'qualifying', 'demoed', 'objection', 'converted_beta', 'converted_paid', 'lost')
  )
);

create unique index if not exists whatsapp_conversations_phone_uq
  on public.whatsapp_conversations(phone_number);
create index if not exists whatsapp_conversations_linked_user_idx
  on public.whatsapp_conversations(linked_user_id);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  role text not null,                          -- 'user' | 'assistant' | 'system'
  content text not null,
  wa_message_id text,                          -- Baileys message key id, for inbound dedupe
  tool_calls jsonb,                             -- raw tool_use/tool_result blocks, audit/debug only
  delivery_status text not null default 'n/a', -- 'n/a' (inbound) | 'pending' | 'sent' | 'failed'
  delivery_attempts integer not null default 0,
  auto_responded boolean not null default false, -- false whenever AUTO_RESPOND_ENABLED was off at receive time
  created_at timestamptz not null default now(),
  constraint whatsapp_messages_role_check check (role in ('user', 'assistant', 'system')),
  constraint whatsapp_messages_delivery_status_check check (delivery_status in ('n/a', 'pending', 'sent', 'failed'))
);

create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages(conversation_id, created_at);
create index if not exists whatsapp_messages_pending_idx
  on public.whatsapp_messages(delivery_status) where delivery_status = 'pending';
create unique index if not exists whatsapp_messages_wa_message_id_uq
  on public.whatsapp_messages(wa_message_id) where wa_message_id is not null;

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
-- No policies created for anon/authenticated -- this is intentional (see header comment).

drop trigger if exists whatsapp_conversations_set_updated_at on public.whatsapp_conversations;
create trigger whatsapp_conversations_set_updated_at
before update on public.whatsapp_conversations
for each row execute function public.set_updated_at();
