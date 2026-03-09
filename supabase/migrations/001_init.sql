-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── user_profiles ─────────────────────────────────────────────────────────────
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  shipping_cost integer not null default 500,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── subscriptions ─────────────────────────────────────────────────────────────
create table public.subscriptions (
  id serial primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  status text not null check (status in ('active', 'canceled', 'past_due')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ── price_history ─────────────────────────────────────────────────────────────
create table public.price_history (
  id serial primary key,
  asin varchar(10) not null,
  price integer not null,
  sales_rank integer,
  seller_count integer,
  out_of_stock_rate decimal(5,2),
  recorded_at timestamptz not null default now()
);

create index idx_price_history_asin on public.price_history(asin);
create index idx_price_history_recorded_at on public.price_history(recorded_at);

alter table public.price_history enable row level security;

create policy "Authenticated users can read price history"
  on public.price_history for select
  using (auth.role() = 'authenticated');

-- ── scored_items ──────────────────────────────────────────────────────────────
create table public.scored_items (
  id serial primary key,
  asin varchar(10) not null,
  title text not null,
  image_url text,
  buy_price integer not null,
  sell_price integer not null,
  profit integer not null,
  roi decimal(7,2) not null,
  demand_score integer not null,
  sedori_score integer not null,
  daily_drop integer not null default 0,
  sales_rank integer not null default 0,
  seller_count integer not null default 0,
  bsr_drop_count integer not null default 0,
  out_of_stock_rate integer not null default 0,
  price_recovery_days integer not null default 14,
  bsr_trend integer not null default 0,
  fee integer not null default 0,
  shipping_cost integer not null default 500,
  review_count integer not null default 0,
  category text not null default 'その他',
  detected_at timestamptz not null default now()
);

create unique index idx_scored_items_asin on public.scored_items(asin);
create index idx_scored_items_detected_at on public.scored_items(detected_at desc);
create index idx_scored_items_sedori_score on public.scored_items(sedori_score desc);

alter table public.scored_items enable row level security;

create policy "Authenticated users can read scored items"
  on public.scored_items for select
  using (auth.role() = 'authenticated');

-- Cleanup: keep only the latest 200 scored items
create or replace function public.cleanup_old_scored_items()
returns void language plpgsql security definer as $$
begin
  delete from public.scored_items
  where id not in (
    select id from public.scored_items
    order by detected_at desc
    limit 200
  );
end;
$$;
