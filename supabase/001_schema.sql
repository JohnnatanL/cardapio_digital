-- =============================================================================
-- CARDÁPIO DIGITAL — Migration 001: schema
-- Postgres 15+ / Supabase
-- Rode no SQL Editor do Supabase, em ordem: 001 -> 002 -> 003 -> 004
--
-- ATENÇÃO: tudo vive no schema `cardapio`, não no `public`.
-- Depois de rodar, vá em Settings -> API -> Exposed schemas e adicione
-- `cardapio`. Sem isso o PostgREST devolve 404 em toda query.
-- =============================================================================

create schema if not exists cardapio;

-- Extensões ficam onde o Supabase já as instala; não movemos nada.
create extension if not exists pgcrypto;
create extension if not exists pg_net;

-- =============================================================================
-- TIPOS
-- =============================================================================

create type cardapio.membership_role     as enum ('owner', 'admin', 'staff');
create type cardapio.tag_kind            as enum ('allergen', 'diet', 'other');
create type cardapio.tag_mode            as enum ('contains', 'may_contain');
create type cardapio.billing_interval    as enum ('month', 'year');
create type cardapio.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
create type cardapio.menu_event_type     as enum ('menu_view', 'item_view', 'filter_use', 'qr_scan', 'locale_switch');

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- =============================================================================

-- Valida que TODOS os valores de um campo i18n respeitam o limite de caracteres.
-- Ex.: description = {"pt-BR": "...", "en": "..."} -> cada idioma <= 160 chars.
create or replace function cardapio.jsonb_max_len(v jsonb, n int)
returns boolean
language sql immutable
as $$
  select coalesce(bool_and(char_length(value) <= n), true)
  from jsonb_each_text(coalesce(v, '{}'::jsonb))
$$;

-- Garante que o campo i18n tem pelo menos um idioma preenchido e não-vazio.
create or replace function cardapio.jsonb_has_content(v jsonb)
returns boolean
language sql immutable
as $$
  select coalesce(bool_or(btrim(value) <> ''), false)
  from jsonb_each_text(coalesce(v, '{}'::jsonb))
$$;

-- Slug a partir de texto livre (usado no onboarding pra sugerir o link público).
create or replace function cardapio.slugify(txt text)
returns text
language sql immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(translate(
          coalesce(txt, ''),
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
        )),
        '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g')
  )
$$;

create or replace function cardapio.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- CONTAS E PLANOS
-- =============================================================================

create table cardapio.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cria o profile automaticamente quando o Supabase Auth cria o usuário.
create or replace function cardapio.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into cardapio.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_cardapio on auth.users;
create trigger on_auth_user_created_cardapio
  after insert on auth.users
  for each row execute function cardapio.handle_new_user();


create table cardapio.plans (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,          -- 'free', 'essencial', 'pro'
  name          text not null,
  tagline       text,
  price_cents   integer not null check (price_cents >= 0),
  interval      cardapio.billing_interval not null default 'month',
  trial_days    integer not null default 14 check (trial_days >= 0),

  -- Limites. NULL = ilimitado.
  max_menus     integer check (max_menus  is null or max_menus  > 0),
  max_items     integer check (max_items  is null or max_items  > 0),
  max_tables    integer check (max_tables is null or max_tables > 0),
  max_locales   integer not null default 1 check (max_locales >= 1),

  -- Flags de recurso: {"analytics": true, "pdf_export": true, "custom_theme": false}
  features      jsonb not null default '{}'::jsonb,

  sort_order    integer not null default 0,
  is_public     boolean not null default true,  -- false = plano legado/interno
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- TENANT
-- =============================================================================

create table cardapio.restaurants (
  id            uuid primary key default gen_random_uuid(),

  -- Link público: /r/{slug}
  slug          text not null unique
                  check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),

  name          text not null check (btrim(name) <> ''),
  description   text check (char_length(description) <= 280),

  logo_url      text,
  cover_url     text,

  -- Visual
  theme         text not null default 'terracota'
                  check (theme in ('terracota', 'vinho', 'oliva', 'noturno', 'custom')),
  brand_color   text check (brand_color ~ '^#[0-9a-fA-F]{6}$'),

  -- Contato
  whatsapp      text,
  phone         text,
  instagram     text,
  address       jsonb,

  -- Localização / formatação
  timezone      text not null default 'America/Fortaleza',
  currency      text not null default 'BRL',
  locales       text[] not null default array['pt-BR']::text[]
                  check (array_length(locales, 1) between 1 and 5),
  default_locale text not null default 'pt-BR',

  -- Informações obrigatórias ao consumidor
  service_fee_percent numeric(5,2) check (service_fee_percent between 0 and 100),
  couvert_cents       integer check (couvert_cents >= 0),
  allergen_disclaimer text not null default
    'Informações declaradas pelo estabelecimento. Não garantimos ausência de contaminação cruzada — consulte nossa equipe.',

  is_published  boolean not null default false,
  published_at  timestamptz,

  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint default_locale_in_locales check (default_locale = any(locales))
);

-- Slugs que não podem virar link de restaurante.
create or replace function cardapio.check_reserved_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug in (
    'admin','api','app','auth','blog','cardapio','checkout','dashboard','docs',
    'entrar','help','login','logout','painel','planos','precos','pricing','r',
    'signup','sobre','suporte','termos','privacidade','www','static','assets'
  ) then
    raise exception 'Slug reservado: %', new.slug using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger restaurants_reserved_slug
  before insert or update of slug on cardapio.restaurants
  for each row execute function cardapio.check_reserved_slug();


create table cardapio.memberships (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references cardapio.restaurants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          cardapio.membership_role not null default 'staff',
  created_at    timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index on cardapio.memberships (user_id);
create index on cardapio.memberships (restaurant_id);


create table cardapio.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null unique references cardapio.restaurants(id) on delete cascade,
  plan_id                  uuid not null references cardapio.plans(id),
  status                   cardapio.subscription_status not null default 'trialing',

  -- Mercado Pago
  provider                 text not null default 'mercadopago',
  provider_customer_id     text,
  provider_subscription_id text,

  trial_ends_at            timestamptz,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  canceled_at              timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index on cardapio.subscriptions (provider_subscription_id);
create index on cardapio.subscriptions (status);

-- Log cru de webhooks. Nunca confie no payload do gateway sem rastro.
create table cardapio.billing_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'mercadopago',
  event_id      text,
  event_type    text,
  restaurant_id uuid references cardapio.restaurants(id) on delete set null,
  payload       jsonb not null,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  unique (provider, event_id)
);

-- =============================================================================
-- CATÁLOGO
-- =============================================================================

create table cardapio.categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references cardapio.restaurants(id) on delete cascade,
  name          jsonb not null check (cardapio.jsonb_has_content(name)
                                 and cardapio.jsonb_max_len(name, 60)),
  description   jsonb check (cardapio.jsonb_max_len(description, 160)),
  icon          text,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on cardapio.categories (restaurant_id, sort_order);


create table cardapio.items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references cardapio.restaurants(id) on delete cascade,
  category_id   uuid references cardapio.categories(id) on delete set null,

  -- i18n: {"pt-BR": "Baião de dois", "en": "Baião de dois"}
  name          jsonb not null check (cardapio.jsonb_has_content(name)
                                 and cardapio.jsonb_max_len(name, 80)),
  -- Limite de 160 chars POR IDIOMA (~4 linhas em tela de 360px).
  description   jsonb check (cardapio.jsonb_max_len(description, 160)),

  -- Preço "de catálogo": pode ser NULL (rascunho).
  -- O preço que vale é o de menu_items, que é NOT NULL.
  base_price    numeric(10,2) check (base_price >= 0),

  image_url     text,
  image_alt     jsonb check (cardapio.jsonb_max_len(image_alt, 120)),

  -- Disponibilidade / botão "esgotou"
  is_available       boolean not null default true,
  unavailable_until  timestamptz,   -- NULL = volta só na mão
  unavailable_reason text check (char_length(unavailable_reason) <= 80),

  is_featured   boolean not null default false,
  prep_time_min integer check (prep_time_min between 0 and 240),
  spicy_level   smallint check (spicy_level between 0 and 3),

  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint unavailable_until_only_when_off
    check (unavailable_until is null or is_available = false)
);

create index on cardapio.items (restaurant_id, category_id, sort_order);
create index on cardapio.items (restaurant_id) where is_available = false;
create index on cardapio.items using gin (name jsonb_path_ops);


-- Variações de tamanho/porção. Preço é DELTA sobre o preço do cardápio,
-- assim uma variação serve pra todos os cardápios sem duplicar valor.
create table cardapio.item_variants (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references cardapio.items(id) on delete cascade,
  name          jsonb not null check (cardapio.jsonb_has_content(name)
                                 and cardapio.jsonb_max_len(name, 40)),
  price_delta   numeric(10,2) not null default 0,
  is_default    boolean not null default false,
  is_available  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on cardapio.item_variants (item_id, sort_order);
create unique index item_variants_one_default
  on cardapio.item_variants (item_id) where is_default;

-- =============================================================================
-- TAGS (alergênicos / dietas)
-- restaurant_id NULL = tag global (seed). Preenchido = tag customizada do tenant.
-- =============================================================================

create table cardapio.tags (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid references cardapio.restaurants(id) on delete cascade,
  slug          text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  label         jsonb not null check (cardapio.jsonb_has_content(label)
                                 and cardapio.jsonb_max_len(label, 40)),
  kind          cardapio.tag_kind not null default 'allergen',
  icon          text not null default 'CircleAlert',  -- nome do ícone lucide-react
  color         text check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- true = alergênico da RDC 26/2015 (usado no filtro "esconder")
  is_regulated  boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index tags_global_slug_key
  on cardapio.tags (slug) where restaurant_id is null;
create unique index tags_tenant_slug_key
  on cardapio.tags (restaurant_id, slug) where restaurant_id is not null;


create table cardapio.item_tags (
  item_id    uuid not null references cardapio.items(id) on delete cascade,
  tag_id     uuid not null references cardapio.tags(id) on delete cascade,
  -- 'contains'   -> "Alérgicos: contém"
  -- 'may_contain'-> "Alérgicos: pode conter" (contaminação cruzada, RDC 26/2015 art. 7)
  mode       cardapio.tag_mode not null default 'contains',
  created_at timestamptz not null default now(),
  primary key (item_id, tag_id)
);

create index on cardapio.item_tags (tag_id);

-- =============================================================================
-- CARDÁPIOS
-- =============================================================================

create table cardapio.menus (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references cardapio.restaurants(id) on delete cascade,
  slug          text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,48}$'),
  name          jsonb not null check (cardapio.jsonb_has_content(name)
                                 and cardapio.jsonb_max_len(name, 60)),
  description   jsonb check (cardapio.jsonb_max_len(description, 200)),

  is_active     boolean not null default true,

  -- Janela sazonal opcional (ex.: cardápio de Natal)
  available_from date,
  available_to   date,

  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (restaurant_id, slug),
  constraint valid_season check (available_to is null
                              or available_from is null
                              or available_to >= available_from)
);


-- Dias da semana em que o cardápio aparece. Sem linha = nunca aparece.
-- weekday: 0=domingo ... 6=sábado (compatível com JS getDay()).
-- start_time/end_time opcionais permitem almoço x jantar no mesmo dia.
create table cardapio.menu_days (
  id         uuid primary key default gen_random_uuid(),
  menu_id    uuid not null references cardapio.menus(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time,
  end_time   time,
  unique (menu_id, weekday, start_time),
  constraint valid_window check (start_time is null
                              or end_time is null
                              or end_time > start_time)
);

create index on cardapio.menu_days (menu_id);


-- Pivô com o preço REAL. price NOT NULL: não existe item em cardápio sem preço.
create table cardapio.menu_items (
  id           uuid primary key default gen_random_uuid(),
  menu_id      uuid not null references cardapio.menus(id) on delete cascade,
  item_id      uuid not null references cardapio.items(id) on delete cascade,
  price        numeric(10,2) not null check (price >= 0),
  is_available boolean not null default true,   -- esgotar só neste cardápio
  is_featured  boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (menu_id, item_id)
);

create index on cardapio.menu_items (menu_id, sort_order);
create index on cardapio.menu_items (item_id);

-- Impede cruzar item de um restaurante com cardápio de outro.
create or replace function cardapio.check_menu_item_same_tenant()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  menu_tenant uuid;
  item_tenant uuid;
begin
  select restaurant_id into menu_tenant from cardapio.menus where id = new.menu_id;
  select restaurant_id into item_tenant from cardapio.items where id = new.item_id;
  if menu_tenant is distinct from item_tenant then
    raise exception 'Item e cardápio pertencem a restaurantes diferentes'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger menu_items_same_tenant
  before insert or update on cardapio.menu_items
  for each row execute function cardapio.check_menu_item_same_tenant();

-- =============================================================================
-- MESAS (QR Code)
-- =============================================================================

create table cardapio.restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references cardapio.restaurants(id) on delete cascade,
  label         text not null check (btrim(label) <> ''),   -- "Mesa 7", "Varanda 2"
  -- Token aleatório: a URL nunca expõe /r/slug?mesa=7
  qr_token      uuid not null unique default gen_random_uuid(),
  -- Cardápio específico pra essa mesa (ex.: QR do bar abre a carta de drinks)
  menu_id       uuid references cardapio.menus(id) on delete set null,
  capacity      smallint check (capacity > 0),
  zone          text,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on cardapio.restaurant_tables (restaurant_id, sort_order);

-- =============================================================================
-- ANALYTICS (sem cookie, sem PII — LGPD tranquila)
-- =============================================================================

create table cardapio.menu_events (
  id            bigserial primary key,
  restaurant_id uuid not null references cardapio.restaurants(id) on delete cascade,
  menu_id       uuid references cardapio.menus(id) on delete set null,
  item_id       uuid references cardapio.items(id) on delete set null,
  table_id      uuid references cardapio.restaurant_tables(id) on delete set null,
  event_type    cardapio.menu_event_type not null,
  locale        text,
  -- session_hash: hash efêmero por dispositivo/dia, NÃO identifica pessoa
  session_hash  text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index on cardapio.menu_events (restaurant_id, created_at desc);
create index on cardapio.menu_events (restaurant_id, event_type, created_at desc);
create index on cardapio.menu_events (item_id, created_at desc);

-- =============================================================================
-- TRIGGERS updated_at
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','plans','restaurants','subscriptions','categories','items',
    'item_variants','tags','menus','menu_items','restaurant_tables'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on cardapio.%I
       for each row execute function cardapio.set_updated_at()', t, t);
  end loop;
end $$;
