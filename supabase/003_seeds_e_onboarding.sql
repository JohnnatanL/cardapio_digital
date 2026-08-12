-- =============================================================================
-- CARDÁPIO DIGITAL — Migration 003: seeds e onboarding
-- =============================================================================

-- =============================================================================
-- PLANOS
-- Ajuste os preços à vontade; o código ('free'/'essencial'/'pro') é o que o
-- app referencia, então evite mudar depois de ter cliente.
-- =============================================================================

insert into cardapio.plans
  (code, name, tagline, price_cents, interval, trial_days,
   max_menus, max_items, max_tables, max_locales, features, sort_order)
values
  ('free', 'Degustação', 'Pra testar antes de assinar',
   0, 'month', 0,
   1, 25, 3, 1,
   '{"analytics": false, "pdf_export": false, "custom_theme": false,
     "custom_domain": false, "remove_branding": false}'::jsonb, 0),

  ('essencial', 'Essencial', 'Para um restaurante',
   4990, 'month', 14,
   5, 150, 30, 2,
   '{"analytics": true, "pdf_export": true, "custom_theme": true,
     "custom_domain": false, "remove_branding": true}'::jsonb, 1),

  ('pro', 'Pro', 'Sem limites, com domínio próprio',
   9990, 'month', 14,
   null, null, null, 5,
   '{"analytics": true, "pdf_export": true, "custom_theme": true,
     "custom_domain": true, "remove_branding": true, "priority_support": true}'::jsonb, 2)
on conflict (code) do update set
  name = excluded.name, tagline = excluded.tagline,
  price_cents = excluded.price_cents, trial_days = excluded.trial_days,
  max_menus = excluded.max_menus, max_items = excluded.max_items,
  max_tables = excluded.max_tables, max_locales = excluded.max_locales,
  features = excluded.features, sort_order = excluded.sort_order;

-- =============================================================================
-- TAGS GLOBAIS (restaurant_id = NULL)
-- Alergênicos seguem os grupos da RDC 26/2015 da ANVISA.
-- 'icon' = nome do componente em lucide-react.
-- =============================================================================

insert into cardapio.tags (restaurant_id, slug, label, kind, icon, color, is_regulated, sort_order)
values
  -- ---- Alergênicos regulados ----
  (null, 'gluten',
   '{"pt-BR": "Glúten", "en": "Gluten", "es": "Gluten"}'::jsonb,
   'allergen', 'Wheat', '#B45309', true, 10),

  (null, 'leite',
   '{"pt-BR": "Leite e derivados", "en": "Milk & dairy", "es": "Leche y derivados"}'::jsonb,
   'allergen', 'Milk', '#0369A1', true, 20),

  (null, 'ovos',
   '{"pt-BR": "Ovos", "en": "Eggs", "es": "Huevos"}'::jsonb,
   'allergen', 'Egg', '#CA8A04', true, 30),

  (null, 'peixe',
   '{"pt-BR": "Peixe", "en": "Fish", "es": "Pescado"}'::jsonb,
   'allergen', 'Fish', '#0891B2', true, 40),

  (null, 'crustaceos',
   '{"pt-BR": "Crustáceos", "en": "Crustaceans", "es": "Crustáceos"}'::jsonb,
   'allergen', 'Shell', '#EA580C', true, 50),

  (null, 'amendoim',
   '{"pt-BR": "Amendoim", "en": "Peanut", "es": "Cacahuete"}'::jsonb,
   'allergen', 'Nut', '#92400E', true, 60),

  (null, 'castanhas',
   '{"pt-BR": "Castanhas e nozes", "en": "Tree nuts", "es": "Frutos secos"}'::jsonb,
   'allergen', 'Nut', '#78350F', true, 70),

  (null, 'soja',
   '{"pt-BR": "Soja", "en": "Soy", "es": "Soja"}'::jsonb,
   'allergen', 'Bean', '#65A30D', true, 80),

  -- ---- Dietas e preferências ----
  (null, 'vegano',
   '{"pt-BR": "Vegano", "en": "Vegan", "es": "Vegano"}'::jsonb,
   'diet', 'Sprout', '#15803D', false, 110),

  (null, 'vegetariano',
   '{"pt-BR": "Vegetariano", "en": "Vegetarian", "es": "Vegetariano"}'::jsonb,
   'diet', 'Leaf', '#4D7C0F', false, 120),

  (null, 'sem-lactose',
   '{"pt-BR": "Sem lactose", "en": "Lactose free", "es": "Sin lactosa"}'::jsonb,
   'diet', 'MilkOff', '#0284C7', false, 130),

  (null, 'sem-acucar',
   '{"pt-BR": "Sem açúcar", "en": "Sugar free", "es": "Sin azúcar"}'::jsonb,
   'diet', 'CandyOff', '#DB2777', false, 140),

  -- ---- Outros avisos ----
  (null, 'picante',
   '{"pt-BR": "Picante", "en": "Spicy", "es": "Picante"}'::jsonb,
   'other', 'Flame', '#DC2626', false, 210),

  (null, 'alcoolico',
   '{"pt-BR": "Contém álcool", "en": "Contains alcohol", "es": "Contiene alcohol"}'::jsonb,
   'other', 'Wine', '#7E22CE', false, 220)
on conflict do nothing;

-- =============================================================================
-- ONBOARDING
-- Cria restaurante + membership de owner + assinatura em trial numa transação.
-- Precisa ser SECURITY DEFINER: no momento do INSERT do restaurante ainda não
-- existe membership, então a RLS de memberships não teria como validar.
-- =============================================================================

create or replace function cardapio.check_slug_available(p_slug text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from cardapio.restaurants where slug = p_slug)
$$;

revoke all on function cardapio.check_slug_available(text) from public;
grant execute on function cardapio.check_slug_available(text) to anon, authenticated;


create or replace function cardapio.create_restaurant(
  p_name      text,
  p_slug      text,
  p_plan_code text default 'essencial'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  new_id    uuid;
  plan_row  cardapio.plans;
  new_menu  uuid;
  d         smallint;
begin
  if uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;

  select * into plan_row from cardapio.plans where code = p_plan_code and is_public;
  if plan_row is null then
    raise exception 'Plano inválido: %', p_plan_code using errcode = '22023';
  end if;

  insert into cardapio.restaurants (name, slug, created_by)
  values (p_name, p_slug, uid)
  returning id into new_id;

  insert into cardapio.memberships (restaurant_id, user_id, role)
  values (new_id, uid, 'owner');

  insert into cardapio.subscriptions
    (restaurant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
  values (
    new_id, plan_row.id,
    (case when plan_row.trial_days > 0 then 'trialing' else 'active' end)::cardapio.subscription_status,
    case when plan_row.trial_days > 0 then now() + (plan_row.trial_days || ' days')::interval end,
    now(),
    now() + case when plan_row.trial_days > 0
                 then (plan_row.trial_days || ' days')::interval
                 else '1 month'::interval end
  );

  -- Cardápio principal já criado e ativo nos 7 dias: onboarding sem tela em branco.
  insert into cardapio.menus (restaurant_id, slug, name)
  values (new_id, 'principal',
          jsonb_build_object('pt-BR', 'Cardápio Principal', 'en', 'Main Menu'))
  returning id into new_menu;

  for d in 0..6 loop
    insert into cardapio.menu_days (menu_id, weekday) values (new_menu, d);
  end loop;

  -- Categorias iniciais (o dono renomeia/apaga à vontade)
  insert into cardapio.categories (restaurant_id, name, icon, sort_order)
  values
    (new_id, '{"pt-BR":"Entradas","en":"Starters"}'::jsonb,  'Soup',        10),
    (new_id, '{"pt-BR":"Pratos principais","en":"Mains"}'::jsonb, 'UtensilsCrossed', 20),
    (new_id, '{"pt-BR":"Sobremesas","en":"Desserts"}'::jsonb, 'IceCreamCone', 30),
    (new_id, '{"pt-BR":"Bebidas","en":"Drinks"}'::jsonb,      'CupSoda',     40);

  return new_id;
end;
$$;

revoke all on function cardapio.create_restaurant(text, text, text) from public;
grant execute on function cardapio.create_restaurant(text, text, text) to authenticated;

-- =============================================================================
-- ANALYTICS: agregados prontos pro painel
-- =============================================================================

create or replace function cardapio.analytics_summary(
  p_restaurant uuid,
  p_days       int default 30
)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when not cardapio.is_member(p_restaurant) then null else jsonb_build_object(
    'periodo_dias', p_days,
    'total_visitas', (
      select count(*) from cardapio.menu_events e
      where e.restaurant_id = p_restaurant and e.event_type = 'menu_view'
        and e.created_at > now() - (p_days || ' days')::interval
    ),
    'itens_mais_vistos', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select i.id, i.name, count(*) as views
        from cardapio.menu_events e
        join cardapio.items i on i.id = e.item_id
        where e.restaurant_id = p_restaurant and e.event_type = 'item_view'
          and e.created_at > now() - (p_days || ' days')::interval
        group by i.id, i.name order by count(*) desc limit 15
      ) x
    ),
    'por_hora', (
      select coalesce(jsonb_agg(
               jsonb_build_object('hora', h.hora, 'visitas', h.visitas)
               order by h.hora), '[]'::jsonb)
      from (
        select extract(hour from e.created_at at time zone r.timezone)::int as hora,
               count(*) as visitas
        from cardapio.menu_events e
        join cardapio.restaurants r on r.id = e.restaurant_id
        where e.restaurant_id = p_restaurant and e.event_type = 'menu_view'
          and e.created_at > now() - (p_days || ' days')::interval
        group by 1
      ) h
    ),
    -- A métrica que vende: quais restrições seus clientes mais filtram.
    'filtros_usados', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select e.meta ->> 'tag_slug' as tag, count(*) as usos
        from cardapio.menu_events e
        where e.restaurant_id = p_restaurant and e.event_type = 'filter_use'
          and e.created_at > now() - (p_days || ' days')::interval
          and e.meta ? 'tag_slug'
        group by 1 order by count(*) desc limit 10
      ) x
    ),
    'mesas_mais_ativas', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select t.label, count(*) as scans
        from cardapio.menu_events e
        join cardapio.restaurant_tables t on t.id = e.table_id
        where e.restaurant_id = p_restaurant and e.event_type = 'qr_scan'
          and e.created_at > now() - (p_days || ' days')::interval
        group by t.label order by count(*) desc limit 10
      ) x
    )
  ) end
$$;

revoke all on function cardapio.analytics_summary(uuid, int) from public;
grant execute on function cardapio.analytics_summary(uuid, int) to authenticated;
