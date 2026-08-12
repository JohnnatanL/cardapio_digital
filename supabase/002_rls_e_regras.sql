-- =============================================================================
-- CARDÁPIO DIGITAL — Migration 002: RLS, quotas de plano e revalidação
-- =============================================================================

-- =============================================================================
-- HELPERS DE AUTORIZAÇÃO
-- SECURITY DEFINER evita recursão infinita de RLS ao consultar memberships
-- de dentro de uma policy.
-- =============================================================================

create or replace function public.is_member(r uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.restaurant_id = r and m.user_id = auth.uid()
  )
$$;

create or replace function public.is_admin(r uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.restaurant_id = r
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
$$;

-- Restaurante está no ar? Precisa estar publicado E com assinatura viva.
-- É esta função que faz o paywall existir de verdade — não adianta o front
-- esconder o botão se a API continua servindo o cardápio.
create or replace function public.restaurant_is_live(r uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants rr
    join public.subscriptions s on s.restaurant_id = rr.id
    where rr.id = r
      and rr.is_published
      and s.status in ('trialing', 'active')
      and (s.current_period_end is null or s.current_period_end > now())
  )
$$;

-- Plano efetivo do restaurante (usado nas quotas).
create or replace function public.current_plan(r uuid)
returns public.plans
language sql stable security definer set search_path = public
as $$
  select p.*
  from public.plans p
  join public.subscriptions s on s.plan_id = p.id
  where s.restaurant_id = r
  limit 1
$$;

-- =============================================================================
-- QUOTAS DE PLANO (aplicadas no banco, não só no front)
-- =============================================================================

create or replace function public.enforce_quota()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  tenant   uuid;
  plan     public.plans;
  used     integer;
  limite   integer;
  rotulo   text;
begin
  tenant := new.restaurant_id;
  plan   := public.current_plan(tenant);

  if plan is null then
    return new;  -- sem assinatura ainda (onboarding); libera
  end if;

  case tg_table_name
    when 'items' then
      limite := plan.max_items;  rotulo := 'itens';
      select count(*) into used from public.items where restaurant_id = tenant;
    when 'menus' then
      limite := plan.max_menus;  rotulo := 'cardápios';
      select count(*) into used from public.menus where restaurant_id = tenant;
    when 'restaurant_tables' then
      limite := plan.max_tables; rotulo := 'mesas';
      select count(*) into used from public.restaurant_tables where restaurant_id = tenant;
    else
      return new;
  end case;

  if limite is not null and used >= limite then
    raise exception 'Limite do plano % atingido: % % (máximo %)',
      plan.name, used, rotulo, limite
      using errcode = 'P0001', hint = 'upgrade_required';
  end if;

  return new;
end;
$$;

create trigger items_quota  before insert on public.items
  for each row execute function public.enforce_quota();
create trigger menus_quota  before insert on public.menus
  for each row execute function public.enforce_quota();
create trigger tables_quota before insert on public.restaurant_tables
  for each row execute function public.enforce_quota();


-- Quantidade de idiomas limitada pelo plano.
create or replace function public.enforce_locale_quota()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare plan public.plans;
begin
  plan := public.current_plan(new.id);
  if plan is not null and array_length(new.locales, 1) > plan.max_locales then
    raise exception 'Plano % permite % idioma(s)', plan.name, plan.max_locales
      using errcode = 'P0001', hint = 'upgrade_required';
  end if;
  return new;
end;
$$;

create trigger restaurants_locale_quota
  before update of locales on public.restaurants
  for each row execute function public.enforce_locale_quota();


-- Publicar exige assinatura ativa. Este é o paywall.
create or replace function public.enforce_publish_gate()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare ok boolean;
begin
  if new.is_published and not coalesce(old.is_published, false) then
    select exists (
      select 1 from public.subscriptions s
      where s.restaurant_id = new.id
        and s.status in ('trialing', 'active')
        and (s.current_period_end is null or s.current_period_end > now())
    ) into ok;

    if not ok then
      raise exception 'Assinatura inativa: não é possível publicar o cardápio'
        using errcode = 'P0001', hint = 'upgrade_required';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger restaurants_publish_gate
  before update of is_published on public.restaurants
  for each row execute function public.enforce_publish_gate();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.plans             enable row level security;
alter table public.restaurants       enable row level security;
alter table public.memberships       enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.billing_events    enable row level security;
alter table public.categories        enable row level security;
alter table public.items             enable row level security;
alter table public.item_variants     enable row level security;
alter table public.tags              enable row level security;
alter table public.item_tags         enable row level security;
alter table public.menus             enable row level security;
alter table public.menu_days         enable row level security;
alter table public.menu_items        enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.menu_events       enable row level security;

-- ---- profiles ----
create policy "profile próprio: ler"     on public.profiles for select using (id = auth.uid());
create policy "profile próprio: editar"  on public.profiles for update using (id = auth.uid());

-- ---- plans (catálogo público, escrita só via service_role) ----
create policy "planos: leitura pública"  on public.plans for select using (is_public);

-- ---- restaurants ----
create policy "restaurante: membro lê"
  on public.restaurants for select using (public.is_member(id));

create policy "restaurante: público lê se no ar"
  on public.restaurants for select using (public.restaurant_is_live(id));

create policy "restaurante: criar"
  on public.restaurants for insert with check (created_by = auth.uid());

create policy "restaurante: admin edita"
  on public.restaurants for update using (public.is_admin(id));

create policy "restaurante: owner apaga"
  on public.restaurants for delete using (
    exists (select 1 from public.memberships m
            where m.restaurant_id = id and m.user_id = auth.uid() and m.role = 'owner')
  );

-- ---- memberships ----
create policy "membros: ver equipe"
  on public.memberships for select using (public.is_member(restaurant_id));

create policy "membros: admin gerencia"
  on public.memberships for all
  using (public.is_admin(restaurant_id))
  with check (public.is_admin(restaurant_id));

-- Primeiro membro (owner) é criado por Edge Function com service_role,
-- porque no INSERT do restaurante ainda não existe membership pra validar.

-- ---- subscriptions (leitura pelo tenant; escrita só via webhook/service_role) ----
create policy "assinatura: membro lê"
  on public.subscriptions for select using (public.is_member(restaurant_id));

-- ---- billing_events: nenhuma policy = só service_role enxerga ----

-- ---- Catálogo: padrão membro-escreve / público-lê-se-no-ar ----

create policy "categorias: membro gerencia" on public.categories for all
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
create policy "categorias: público lê" on public.categories for select
  using (is_active and public.restaurant_is_live(restaurant_id));

create policy "itens: membro gerencia" on public.items for all
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));

-- Público só vê item que está em ALGUM cardápio ativo. Rascunho não vaza.
create policy "itens: público lê" on public.items for select
  using (
    public.restaurant_is_live(restaurant_id)
    and exists (
      select 1 from public.menu_items mi
      join public.menus m on m.id = mi.menu_id
      where mi.item_id = items.id and m.is_active
    )
  );

create policy "variações: membro gerencia" on public.item_variants for all
  using (exists (select 1 from public.items i
                 where i.id = item_id and public.is_member(i.restaurant_id)))
  with check (exists (select 1 from public.items i
                      where i.id = item_id and public.is_member(i.restaurant_id)));
create policy "variações: público lê" on public.item_variants for select
  using (exists (select 1 from public.items i
                 where i.id = item_id and public.restaurant_is_live(i.restaurant_id)));

create policy "tags: globais são públicas" on public.tags for select
  using (restaurant_id is null);
create policy "tags: membro gerencia as próprias" on public.tags for all
  using (restaurant_id is not null and public.is_member(restaurant_id))
  with check (restaurant_id is not null and public.is_member(restaurant_id));
create policy "tags: público lê as do tenant" on public.tags for select
  using (restaurant_id is not null and public.restaurant_is_live(restaurant_id));

create policy "item_tags: membro gerencia" on public.item_tags for all
  using (exists (select 1 from public.items i
                 where i.id = item_id and public.is_member(i.restaurant_id)))
  with check (exists (select 1 from public.items i
                      where i.id = item_id and public.is_member(i.restaurant_id)));
create policy "item_tags: público lê" on public.item_tags for select
  using (exists (select 1 from public.items i
                 where i.id = item_id and public.restaurant_is_live(i.restaurant_id)));

create policy "cardápios: membro gerencia" on public.menus for all
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
create policy "cardápios: público lê" on public.menus for select
  using (is_active and public.restaurant_is_live(restaurant_id));

create policy "dias: membro gerencia" on public.menu_days for all
  using (exists (select 1 from public.menus m
                 where m.id = menu_id and public.is_member(m.restaurant_id)))
  with check (exists (select 1 from public.menus m
                      where m.id = menu_id and public.is_member(m.restaurant_id)));
create policy "dias: público lê" on public.menu_days for select
  using (exists (select 1 from public.menus m
                 where m.id = menu_id and public.restaurant_is_live(m.restaurant_id)));

create policy "menu_items: membro gerencia" on public.menu_items for all
  using (exists (select 1 from public.menus m
                 where m.id = menu_id and public.is_member(m.restaurant_id)))
  with check (exists (select 1 from public.menus m
                      where m.id = menu_id and public.is_member(m.restaurant_id)));
create policy "menu_items: público lê" on public.menu_items for select
  using (exists (select 1 from public.menus m
                 where m.id = menu_id and m.is_active
                   and public.restaurant_is_live(m.restaurant_id)));

create policy "mesas: membro gerencia" on public.restaurant_tables for all
  using (public.is_member(restaurant_id)) with check (public.is_member(restaurant_id));
-- Mesas NÃO são públicas: a resolução do qr_token é feita por RPC (abaixo),
-- senão qualquer um lista todas as mesas e adivinha tokens.

-- ---- analytics ----
create policy "eventos: membro lê" on public.menu_events for select
  using (public.is_member(restaurant_id));
create policy "eventos: qualquer um registra" on public.menu_events for insert
  with check (public.restaurant_is_live(restaurant_id));

-- =============================================================================
-- RPC PÚBLICA: resolve QR de mesa sem expor a tabela
-- =============================================================================

create or replace function public.resolve_table_qr(token uuid)
returns table (
  table_id        uuid,
  table_label     text,
  restaurant_slug text,
  menu_slug       text
)
language sql stable security definer set search_path = public
as $$
  select t.id, t.label, r.slug, m.slug
  from public.restaurant_tables t
  join public.restaurants r on r.id = t.restaurant_id
  left join public.menus m on m.id = t.menu_id and m.is_active
  where t.qr_token = token
    and t.is_active
    and public.restaurant_is_live(t.restaurant_id)
$$;

revoke all on function public.resolve_table_qr(uuid) from public;
grant execute on function public.resolve_table_qr(uuid) to anon, authenticated;

-- =============================================================================
-- RPC PÚBLICA: cardápio completo em UMA query (alimenta o ISR)
-- Chamada uma vez por revalidação, não uma vez por visitante.
-- =============================================================================

create or replace function public.get_public_menu(p_slug text, p_menu_slug text default null)
returns jsonb
language sql stable security definer set search_path = public
as $$
  with r as (
    select * from public.restaurants
    where slug = p_slug and public.restaurant_is_live(id)
  )
  select jsonb_build_object(
    'restaurant', (
      select jsonb_build_object(
        'id', r.id, 'slug', r.slug, 'name', r.name, 'description', r.description,
        'logo_url', r.logo_url, 'cover_url', r.cover_url,
        'theme', r.theme, 'brand_color', r.brand_color,
        'whatsapp', r.whatsapp, 'phone', r.phone, 'instagram', r.instagram,
        'address', r.address, 'timezone', r.timezone, 'currency', r.currency,
        'locales', r.locales, 'default_locale', r.default_locale,
        'service_fee_percent', r.service_fee_percent,
        'couvert_cents', r.couvert_cents,
        'allergen_disclaimer', r.allergen_disclaimer
      ) from r
    ),
    'tags', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'slug', t.slug, 'label', t.label, 'kind', t.kind,
        'icon', t.icon, 'color', t.color, 'is_regulated', t.is_regulated
      ) order by t.sort_order), '[]'::jsonb)
      from public.tags t, r
      where t.restaurant_id is null or t.restaurant_id = r.id
    ),
    'menus', (
      select coalesce(jsonb_agg(menu_json order by sort_order), '[]'::jsonb)
      from (
        select m.sort_order, jsonb_build_object(
          'id', m.id, 'slug', m.slug, 'name', m.name, 'description', m.description,
          'available_from', m.available_from, 'available_to', m.available_to,
          'days', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'weekday', d.weekday, 'start_time', d.start_time, 'end_time', d.end_time
            ) order by d.weekday), '[]'::jsonb)
            from public.menu_days d where d.menu_id = m.id
          ),
          'items', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'id', i.id,
              'name', i.name,
              'description', i.description,
              'price', mi.price,
              'image_url', i.image_url,
              'image_alt', i.image_alt,
              'category_id', i.category_id,
              'is_featured', mi.is_featured or i.is_featured,
              'prep_time_min', i.prep_time_min,
              'spicy_level', i.spicy_level,
              'is_available', i.is_available and mi.is_available,
              'unavailable_until', i.unavailable_until,
              'unavailable_reason', i.unavailable_reason,
              'variants', (
                select coalesce(jsonb_agg(jsonb_build_object(
                  'id', v.id, 'name', v.name, 'price_delta', v.price_delta,
                  'is_default', v.is_default, 'is_available', v.is_available
                ) order by v.sort_order), '[]'::jsonb)
                from public.item_variants v where v.item_id = i.id
              ),
              'tags', (
                select coalesce(jsonb_agg(jsonb_build_object(
                  'tag_id', it.tag_id, 'mode', it.mode
                )), '[]'::jsonb)
                from public.item_tags it where it.item_id = i.id
              )
            ) order by mi.sort_order), '[]'::jsonb)
            from public.menu_items mi
            join public.items i on i.id = mi.item_id
            where mi.menu_id = m.id
          )
        ) as menu_json
        from public.menus m, r
        where m.restaurant_id = r.id
          and m.is_active
          and (p_menu_slug is null or m.slug = p_menu_slug)
          and (m.available_from is null or m.available_from <= current_date)
          and (m.available_to   is null or m.available_to   >= current_date)
      ) sub
    ),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description, 'icon', c.icon
      ) order by c.sort_order), '[]'::jsonb)
      from public.categories c, r
      where c.restaurant_id = r.id and c.is_active
    )
  )
  from r;
$$;

revoke all on function public.get_public_menu(text, text) from public;
grant execute on function public.get_public_menu(text, text) to anon, authenticated;

-- =============================================================================
-- GRANTS
-- O Supabase já dá grants amplos por default privileges. Aqui a gente restringe
-- de propósito: RLS decide QUAIS linhas, GRANT decide QUAIS operações.
-- Assinatura e billing só mudam por webhook (service_role) — nunca pelo cliente.
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- Leitura pública (as policies acima já limitam às linhas no ar)
grant select on public.plans, public.restaurants, public.categories,
                public.items, public.item_variants, public.tags,
                public.item_tags, public.menus, public.menu_days,
                public.menu_items
  to anon, authenticated;

-- Escrita do painel
grant insert, update, delete on
      public.restaurants, public.categories, public.items, public.item_variants,
      public.tags, public.item_tags, public.menus, public.menu_days,
      public.menu_items, public.memberships, public.restaurant_tables
  to authenticated;
grant select on public.restaurant_tables, public.subscriptions, public.profiles,
                public.memberships
  to authenticated;
grant update on public.profiles to authenticated;

-- Analytics: qualquer visitante grava, só membro lê
grant insert on public.menu_events to anon, authenticated;
grant select on public.menu_events to authenticated;
grant usage, select on sequence public.menu_events_id_seq to anon, authenticated;

-- Sem grant nenhum: billing_events fica só com service_role.
revoke all on public.billing_events from anon, authenticated;

-- =============================================================================
-- REVALIDAÇÃO DO CACHE (ISR sob demanda)
-- Qualquer escrita que afete o cardápio avisa o Next.js pra regerar o HTML.
-- =============================================================================

create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
-- sem policy e sem grant: só service_role enxerga
revoke all on public.app_settings from anon, authenticated;

-- PREENCHA ANTES DE USAR:
-- insert into public.app_settings (key, value) values
--   ('revalidate_url',    'https://seuapp.vercel.app/api/revalidate'),
--   ('revalidate_secret', 'um-segredo-longo-e-aleatorio')
-- on conflict (key) do update set value = excluded.value;

create or replace function public.notify_revalidate()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  tenant   uuid;
  url_     text;
  secret_  text;
  slug_    text;
begin
  tenant := coalesce(
    (to_jsonb(new)  ->> 'restaurant_id')::uuid,
    (to_jsonb(old)  ->> 'restaurant_id')::uuid
  );

  -- Tabelas filhas (menu_items, menu_days, item_variants, item_tags)
  -- não têm restaurant_id: sobe pela FK.
  if tenant is null then
    select m.restaurant_id into tenant from public.menus m
     where m.id = coalesce((to_jsonb(new) ->> 'menu_id')::uuid,
                           (to_jsonb(old) ->> 'menu_id')::uuid);
  end if;
  if tenant is null then
    select i.restaurant_id into tenant from public.items i
     where i.id = coalesce((to_jsonb(new) ->> 'item_id')::uuid,
                           (to_jsonb(old) ->> 'item_id')::uuid);
  end if;
  if tenant is null then return coalesce(new, old); end if;

  select slug into slug_ from public.restaurants where id = tenant;
  select value into url_    from public.app_settings where key = 'revalidate_url';
  select value into secret_ from public.app_settings where key = 'revalidate_secret';
  if url_ is null or slug_ is null then return coalesce(new, old); end if;

  perform net.http_post(
    url     := url_,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-revalidate-secret', coalesce(secret_, '')),
    body    := jsonb_build_object('slug', slug_, 'tag', 'menu:' || slug_)
  );

  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'restaurants','categories','items','item_variants','tags','item_tags',
    'menus','menu_days','menu_items'
  ] loop
    execute format(
      'create trigger %I_revalidate after insert or update or delete on public.%I
       for each row execute function public.notify_revalidate()', t, t);
  end loop;
end $$;
