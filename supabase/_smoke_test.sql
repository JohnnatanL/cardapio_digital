-- Smoke test local. NÃO faz parte da migration.
\set ON_ERROR_STOP on
\pset pager off

-- Dois usuários, dois restaurantes: testa isolamento.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ze@teste.com'),
  ('22222222-2222-2222-2222-222222222222', 'ana@teste.com');

-- ---------- Onboarding do Zé ----------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select set_config('role', 'authenticated', false);

select public.create_restaurant('Pizzaria do Zé', 'pizzaria-do-ze', 'essencial') as rest_ze \gset

\echo '>> 1. Onboarding criou tudo?'
select
  (select count(*) from public.restaurants where id = :'rest_ze')            as restaurantes,
  (select count(*) from public.memberships where restaurant_id = :'rest_ze') as membros,
  (select count(*) from public.subscriptions where restaurant_id = :'rest_ze') as assinaturas,
  (select count(*) from public.menus where restaurant_id = :'rest_ze')       as cardapios,
  (select count(*) from public.menu_days md join public.menus m on m.id = md.menu_id
    where m.restaurant_id = :'rest_ze')                                      as dias,
  (select count(*) from public.categories where restaurant_id = :'rest_ze')  as categorias;

\echo '>> 2. Item sem preço pode existir; item em cardápio exige preço'
insert into public.items (restaurant_id, name, description, category_id)
values (:'rest_ze',
        '{"pt-BR":"Baião de dois","en":"Baião de dois"}'::jsonb,
        '{"pt-BR":"Arroz, feijão de corda, queijo coalho e carne de sol desfiada.","en":"Rice, black-eyed peas, curd cheese and sun-dried beef."}'::jsonb,
        (select id from public.categories where restaurant_id = :'rest_ze' limit 1))
returning id as item1 \gset
select 'item criado sem preço: ok' as resultado, base_price from public.items where id = :'item1';

\echo '   -> tentando inserir em cardápio sem preço (deve falhar):'
\set ON_ERROR_STOP off
insert into public.menu_items (menu_id, item_id)
values ((select id from public.menus where restaurant_id = :'rest_ze'), :'item1');
\set ON_ERROR_STOP on

insert into public.menu_items (menu_id, item_id, price)
values ((select id from public.menus where restaurant_id = :'rest_ze'), :'item1', 38.00);
\echo '   -> com preço: ok'

\echo '>> 3. Limite de 160 chars por idioma na descrição (deve falhar):'
\set ON_ERROR_STOP off
insert into public.items (restaurant_id, name, description)
values (:'rest_ze', '{"pt-BR":"Teste"}'::jsonb,
        jsonb_build_object('pt-BR', repeat('a', 161)));
\set ON_ERROR_STOP on

\echo '>> 4. Tags de alergênico com contém / pode conter'
insert into public.item_tags (item_id, tag_id, mode) values
  (:'item1', (select id from public.tags where slug = 'leite' and restaurant_id is null), 'contains'),
  (:'item1', (select id from public.tags where slug = 'gluten' and restaurant_id is null), 'may_contain');
select t.slug, it.mode from public.item_tags it
  join public.tags t on t.id = it.tag_id where it.item_id = :'item1' order by t.slug;

\echo '>> 5. Paywall: cardápio NÃO aparece publicamente antes de publicar'
select set_config('role', 'anon', false);
select coalesce((public.get_public_menu('pizzaria-do-ze') is null), true) as invisivel_antes_de_publicar;

\echo '>> 6. Publicar (trial ativo permite) e conferir visibilidade'
select set_config('role', 'authenticated', false);
update public.restaurants set is_published = true where id = :'rest_ze';

select set_config('role', 'anon', false);
select
  public.get_public_menu('pizzaria-do-ze') -> 'restaurant' ->> 'name' as nome,
  jsonb_array_length(public.get_public_menu('pizzaria-do-ze') -> 'menus') as qtd_cardapios,
  jsonb_array_length(
    public.get_public_menu('pizzaria-do-ze') -> 'menus' -> 0 -> 'items') as qtd_itens,
  jsonb_array_length(public.get_public_menu('pizzaria-do-ze') -> 'tags') as qtd_tags;

\echo '>> 7. Assinatura cancelada derruba o cardápio na hora'
select set_config('role', 'postgres', false);
update public.subscriptions set status = 'canceled' where restaurant_id = :'rest_ze';
select set_config('role', 'anon', false);
select (public.get_public_menu('pizzaria-do-ze') is null) as sumiu_ao_cancelar;

select set_config('role', 'postgres', false);
update public.subscriptions set status = 'active' where restaurant_id = :'rest_ze';

\echo '>> 8. Isolamento entre tenants: Ana não enxerga o restaurante do Zé'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select set_config('role', 'authenticated', false);
select public.create_restaurant('Bar da Ana', 'bar-da-ana', 'free') as rest_ana \gset

-- Zé cria um item RASCUNHO (fora de qualquer cardápio). Ninguém pode ver.
select set_config('role', 'postgres', false);
insert into public.items (restaurant_id, name, base_price)
values (:'rest_ze', '{"pt-BR":"Prato secreto do chef"}'::jsonb, 99.00)
returning id as rascunho \gset

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select set_config('role', 'authenticated', false);

select
  -- Deve ser 0: rascunho não está em cardápio nenhum
  (select count(*) from public.items where id = :'rascunho')          as rascunho_vaza,
  -- Deve ser 1: item publicado é público mesmo (isso é o esperado)
  (select count(*) from public.items where id = :'item1')             as publicado_visivel,
  -- Deve ser 0: Ana não é membro, não vê a equipe do Zé
  (select count(*) from public.memberships where restaurant_id = :'rest_ze') as equipe_vaza,
  -- Deve ser 0: Ana não vê o faturamento do Zé
  (select count(*) from public.subscriptions where restaurant_id = :'rest_ze') as billing_vaza,
  -- Deve ser 0: mesas nunca são públicas
  (select count(*) from public.restaurant_tables where restaurant_id = :'rest_ze') as mesas_vazam;

\echo '   -> Ana tentando EDITAR preço do Zé (deve afetar 0 linhas):'
update public.items set base_price = 0.01 where restaurant_id = :'rest_ze';
\echo '   -> Ana tentando APAGAR item do Zé (deve afetar 0 linhas):'
delete from public.items where id = :'item1';

\echo '   -> Ana tentando cruzar item dela com cardápio do Zé (deve falhar):'
\set ON_ERROR_STOP off
insert into public.menu_items (menu_id, item_id, price)
values ((select id from public.menus where restaurant_id = :'rest_ze'),
        (select id from public.items where restaurant_id = :'rest_ana' limit 1), 10);
\set ON_ERROR_STOP on

\echo '>> 9. Quota do plano free (25 itens) — inserindo 26'
select set_config('role', 'postgres', false);
insert into public.items (restaurant_id, name)
select :'rest_ana', jsonb_build_object('pt-BR', 'Item ' || g)
from generate_series(1, 25) g;
\set ON_ERROR_STOP off
insert into public.items (restaurant_id, name)
values (:'rest_ana', '{"pt-BR":"Item 26"}'::jsonb);
\set ON_ERROR_STOP on

\echo '>> 10. Botão esgotou com retorno agendado'
update public.items
  set is_available = false,
      unavailable_until = now() + interval '2 hours',
      unavailable_reason = 'acabou o queijo coalho'
where id = :'item1';
select is_available, unavailable_reason,
       (unavailable_until > now()) as volta_no_futuro
from public.items where id = :'item1';

\echo '>> 11. QR de mesa resolve sem expor a tabela'
insert into public.restaurant_tables (restaurant_id, label)
values (:'rest_ze', 'Mesa 7') returning qr_token as token \gset
select set_config('role', 'anon', false);
select * from public.resolve_table_qr(:'token');
\echo '   -> token inválido retorna vazio:'
select count(*) as linhas from public.resolve_table_qr('99999999-9999-9999-9999-999999999999');

\echo '>> 12. Slug reservado (deve falhar):'
select set_config('role', 'postgres', false);
\set ON_ERROR_STOP off
update public.restaurants set slug = 'admin' where id = :'rest_ana';
\set ON_ERROR_STOP on

\echo '>> FIM'
