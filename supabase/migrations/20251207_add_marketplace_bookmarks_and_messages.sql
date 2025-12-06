-- Marketplace bookmarks and messaging primitives (idempotent)

create table if not exists public.marketplace_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id text not null,
  listing_title text not null,
  listing_repo text,
  severity text,
  status text,
  owner text,
  created_at timestamptz default now()
);

alter table public.marketplace_bookmarks enable row level security;

create index if not exists marketplace_bookmarks_user_idx on public.marketplace_bookmarks (user_id);
create index if not exists marketplace_bookmarks_listing_idx on public.marketplace_bookmarks (listing_id);

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow user read bookmarks' and tablename = 'marketplace_bookmarks'
  ) then
    create policy "Allow user read bookmarks"
      on public.marketplace_bookmarks
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Allow user manage bookmarks' and tablename = 'marketplace_bookmarks'
  ) then
    create policy "Allow user manage bookmarks"
      on public.marketplace_bookmarks
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

create table if not exists public.marketplace_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  listing_title text,
  listing_owner text,
  created_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.marketplace_conversations enable row level security;

create index if not exists marketplace_conversations_user_idx on public.marketplace_conversations (created_by);
create index if not exists marketplace_conversations_listing_idx on public.marketplace_conversations (listing_id);

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow owner read conversations' and tablename = 'marketplace_conversations'
  ) then
    create policy "Allow owner read conversations"
      on public.marketplace_conversations
      for select
      using (auth.uid() = created_by);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Allow owner write conversations' and tablename = 'marketplace_conversations'
  ) then
    create policy "Allow owner write conversations"
      on public.marketplace_conversations
      for all
      using (auth.uid() = created_by)
      with check (auth.uid() = created_by);
  end if;
end$$;

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  body text not null,
  message_type text default 'text' check (message_type in ('text', 'bug_card')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.marketplace_messages enable row level security;

create index if not exists marketplace_messages_convo_idx on public.marketplace_messages (conversation_id);
create index if not exists marketplace_messages_sender_idx on public.marketplace_messages (sender_id);

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow conversation owner read messages' and tablename = 'marketplace_messages'
  ) then
    create policy "Allow conversation owner read messages"
      on public.marketplace_messages
      for select
      using (
        exists (
          select 1 from public.marketplace_conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Allow conversation owner write messages' and tablename = 'marketplace_messages'
  ) then
    create policy "Allow conversation owner write messages"
      on public.marketplace_messages
      for all
      using (
        exists (
          select 1 from public.marketplace_conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.marketplace_conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      );
  end if;
end$$;

create table if not exists public.marketplace_bug_cards (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.marketplace_conversations (id) on delete cascade,
  listing_id text not null,
  listing_title text,
  severity text,
  status text,
  owner text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz default now()
);

alter table public.marketplace_bug_cards enable row level security;

create index if not exists marketplace_bug_cards_convo_idx on public.marketplace_bug_cards (conversation_id);
create index if not exists marketplace_bug_cards_listing_idx on public.marketplace_bug_cards (listing_id);

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Allow conversation owner read bug cards' and tablename = 'marketplace_bug_cards'
  ) then
    create policy "Allow conversation owner read bug cards"
      on public.marketplace_bug_cards
      for select
      using (
        exists (
          select 1 from public.marketplace_conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Allow conversation owner write bug cards' and tablename = 'marketplace_bug_cards'
  ) then
    create policy "Allow conversation owner write bug cards"
      on public.marketplace_bug_cards
      for all
      using (
        exists (
          select 1 from public.marketplace_conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.marketplace_conversations c
          where c.id = conversation_id
            and c.created_by = auth.uid()
        )
      );
  end if;
end$$;

