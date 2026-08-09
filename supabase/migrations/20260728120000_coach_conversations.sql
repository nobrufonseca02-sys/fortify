-- Persists AI risk-coach chat history per trading account, so the conversation survives
-- page reloads and so the gateway can enforce a per-user daily message cap by counting
-- today's rows. Additive only.

create extension if not exists "pgcrypto";

create table if not exists public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid not null references public.trading_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists coach_conversations_account_uq
  on public.coach_conversations(trading_account_id);
create index if not exists coach_conversations_user_idx
  on public.coach_conversations(user_id);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint coach_messages_role_check check (role in ('user', 'assistant'))
);

create index if not exists coach_messages_conversation_idx
  on public.coach_messages(conversation_id, created_at);
create index if not exists coach_messages_user_daily_idx
  on public.coach_messages(user_id, created_at);

alter table public.coach_conversations enable row level security;
alter table public.coach_messages enable row level security;

drop policy if exists coach_conversations_select_own on public.coach_conversations;
create policy coach_conversations_select_own on public.coach_conversations
for select using (auth.uid() = user_id);

drop policy if exists coach_conversations_insert_own on public.coach_conversations;
create policy coach_conversations_insert_own on public.coach_conversations
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.trading_accounts account
    where account.id = trading_account_id
      and account.user_id = auth.uid()
  )
);

drop policy if exists coach_conversations_update_own on public.coach_conversations;
create policy coach_conversations_update_own on public.coach_conversations
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- coach_messages ownership is validated both directly (user_id on the row) and
-- indirectly (the parent conversation must also belong to the same user) — same
-- double-check pattern used for account_rule_overrides after the cross-tenant fix.
drop policy if exists coach_messages_select_own on public.coach_messages;
create policy coach_messages_select_own on public.coach_messages
for select using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coach_conversations conversation
    where conversation.id = conversation_id
      and conversation.user_id = auth.uid()
  )
);

drop policy if exists coach_messages_insert_own on public.coach_messages;
create policy coach_messages_insert_own on public.coach_messages
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coach_conversations conversation
    where conversation.id = conversation_id
      and conversation.user_id = auth.uid()
  )
);

drop trigger if exists coach_conversations_set_updated_at
  on public.coach_conversations;
create trigger coach_conversations_set_updated_at
before update on public.coach_conversations
for each row execute function public.set_updated_at();
