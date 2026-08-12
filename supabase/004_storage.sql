-- =============================================================================
-- CARDÁPIO DIGITAL — Migration 004: Storage de imagens
-- Rode depois da 003.
-- =============================================================================

-- Bucket público para leitura: o cardápio é estático e servido pelo CDN, então
-- URL assinada só atrapalharia (expira e quebra o HTML cacheado).
-- A escrita é que precisa de controle, e é o que as policies abaixo fazem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  3145728,  -- 3 MB: o upload já chega comprimido do navegador
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- Convenção de caminho: {restaurant_id}/{tipo}/{arquivo}
--   3f2a.../itens/prato-1712345678.webp
--   3f2a.../marca/logo.webp
-- A primeira pasta é o tenant, e é isso que as policies verificam.
-- =============================================================================

create or replace function public.pode_escrever_no_bucket(caminho text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  pasta text;
  tenant uuid;
begin
  pasta := (storage.foldername(caminho))[1];
  if pasta is null then return false; end if;

  -- Caminho sem UUID válido na raiz é rejeitado
  begin
    tenant := pasta::uuid;
  exception when others then
    return false;
  end;

  return public.is_member(tenant);
end;
$$;


-- Leitura: qualquer um. As imagens aparecem no cardápio público.
drop policy if exists "menu-images: leitura pública" on storage.objects;
create policy "menu-images: leitura pública"
  on storage.objects for select
  using (bucket_id = 'menu-images');

-- Envio: só membro do restaurante, e só dentro da própria pasta.
drop policy if exists "menu-images: membro envia" on storage.objects;
create policy "menu-images: membro envia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and public.pode_escrever_no_bucket(name)
  );

drop policy if exists "menu-images: membro substitui" on storage.objects;
create policy "menu-images: membro substitui"
  on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and public.pode_escrever_no_bucket(name));

drop policy if exists "menu-images: membro apaga" on storage.objects;
create policy "menu-images: membro apaga"
  on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and public.pode_escrever_no_bucket(name));

-- =============================================================================
-- Faxina: quando o prato sai, a imagem dele vira lixo no bucket.
-- Guardamos o caminho numa fila e um job limpa depois — apagar dentro do
-- trigger travaria a transação numa chamada de rede.
-- =============================================================================

create table if not exists public.storage_lixo (
  id         bigserial primary key,
  caminho    text not null,
  criado_em  timestamptz not null default now(),
  apagado_em timestamptz
);

alter table public.storage_lixo enable row level security;
revoke all on public.storage_lixo from anon, authenticated;

create or replace function public.enfileirar_imagem_orfa()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  antiga text;
  nova   text;
begin
  antiga := (to_jsonb(old) ->> 'image_url');
  nova   := case when tg_op = 'DELETE' then null else (to_jsonb(new) ->> 'image_url') end;

  if antiga is not null and antiga is distinct from nova then
    -- Guarda só o caminho relativo ao bucket
    insert into public.storage_lixo (caminho)
    values (regexp_replace(antiga, '^.*/menu-images/', ''));
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists items_imagem_orfa on public.items;
create trigger items_imagem_orfa
  after update of image_url or delete on public.items
  for each row execute function public.enfileirar_imagem_orfa();

-- PENDÊNCIA: agendar a faxina com pg_cron, ou chamar de um cron da Vercel:
--   select cron.schedule('faxina-imagens', '0 4 * * *', $$
--     -- apaga do bucket os caminhos pendentes e marca apagado_em
--   $$);
