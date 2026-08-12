# Comanda — cardápio digital

SaaS multi-tenant de cardápio digital com QR Code, filtro por restrição
alimentar e cache em quatro camadas.

**Stack:** Next.js 15.5 (App Router) · React 19 · TypeScript · Tailwind v4 ·
Supabase (Postgres + Auth + Storage + RLS) · Mercado Pago

---

## Instalação

### 1. Banco

Tudo vive no schema **`cardapio`**, não no `public`. Assim o mesmo projeto
Supabase pode hospedar outros produtos sem colisão de nomes.

No SQL Editor do Supabase, rode em ordem:

```
supabase/001_schema.sql          -- cria o schema cardapio
supabase/002_rls_e_regras.sql
supabase/003_seeds_e_onboarding.sql
supabase/004_storage.sql
```

### 1.1. Exponha o schema na API — **isso quebra tudo se faltar**

No painel do Supabase: **Settings → API → Exposed schemas** → adicione
`cardapio` e salve.

Sem esse passo o PostgREST responde **404 em toda query**, inclusive nas RPCs,
e o erro não diz que o problema é o schema. É a primeira coisa a conferir se
nada funcionar depois do deploy.

O nome do schema fica centralizado em `src/lib/supabase/schema.ts`.

Depois configure a revalidação do cache:

```sql
insert into public.app_settings (key, value) values
  ('revalidate_url',    'https://SEUAPP.vercel.app/api/revalidate'),
  ('revalidate_secret', 'gere-um-segredo-longo-aqui')
on conflict (key) do update set value = excluded.value;
```

> `_stub_supabase.sql` e `_smoke_test.sql` servem só para rodar Postgres local.
> **Não rode em produção.**

### 2. App

```bash
cp .env.example .env.local   # preencha as chaves
npm install
npm run dev
```

### 3. Tipos

Depois das migrations, regenere os tipos colados no schema real:

```bash
npm run types
```

---

## Pendências

### Obrigatórias antes de produção

| O quê | Onde |
|---|---|
| **Expor o schema `cardapio`** em Settings → API | painel do Supabase |
| Chaves do Supabase e `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` |
| `REVALIDATE_SECRET` igual ao de `app_settings` | `.env.local` + SQL |
| Token e IDs de plano do Mercado Pago | `.env.local` |
| **Validar HMAC do webhook** — hoje aceita qualquer POST bem formado | `src/app/api/webhooks/mercadopago/route.ts` |
| **Rate limit** na ingestão de analytics | `src/app/api/track/route.ts` |
| Faxina do bucket: agendar `pg_cron` lendo `storage_lixo` | `supabase/004_storage.sql` |

### Conteúdo e ajustes

- Páginas `/termos` e `/privacidade` — os links já existem no rodapé
- Trocar os pratos da demo do hero por dados de cliente real —
  `src/components/marketing/DemoAoVivo.tsx`
- Esconder "Cardápio digital por Nord Wind" quando o plano tiver
  `remove_branding` — `src/components/menu/Cardapio.tsx`
- Preços da landing estão fixos no arquivo; se mudar, atualize também a tabela
  `plans` — `src/app/(marketing)/page.tsx`
- Upload de imagem de prato e de capa (o schema já tem `image_url` e `cover_url`)
- Reordenação drag & drop de pratos e categorias
- Service Worker / PWA para o cache offline
- `pg_cron` para expirar assinaturas `past_due` depois de N dias

---

## Decisões travadas

| Decisão | Valor | Por quê |
|---|---|---|
| Descrição | 160 chars **por idioma** | ~42 chars/linha a 360px → máx. 4 linhas |
| Preço | `menu_items.price NOT NULL` | prato pode ser rascunho; em cardápio, nunca sem preço |
| Variações | `price_delta` (delta, não absoluto) | uma variação serve todos os cardápios |
| i18n | JSONB por campo | idioma novo = zero migration |
| Tradução | **manual, nunca automática** | nome de prato regional a máquina erra |
| Alergênico | `contains` vs `may_contain` | RDC 26/2015 art. 7 (contaminação cruzada) |
| QR de mesa | `uuid` aleatório | `?mesa=7` é adivinhável |
| Foto do prato | opcional, **sem placeholder** | caixa cinza vazia parece defeito; prato sem foto usa a largura toda |
| Upload | comprime no navegador | dono fotografa com o celular e manda 5 MB |
| Analytics | sem cookie, sem PII | LGPD sem banner |
| Schema | `cardapio`, não `public` | um projeto Supabase, vários produtos |
| `slugify` | `translate()` no lugar de `unaccent` | some com a dependência de extensão e o problema de `search_path` |

---

## Cache — como funciona

1. **ISR** — `/r/[slug]` vira HTML estático
2. **CDN** — replicado no edge da Vercel
3. **Revalidação sob demanda** — trigger no Postgres → `pg_net` →
   `/api/revalidate` → `revalidateTag`
4. **Service Worker** — stale-while-revalidate no navegador *(pendente)*

Cache eterno **até alguém editar**. Mil scans no sábado ≈ 1 query no Supabase.

**O detalhe do "esgotou":** `unavailable_until` viaja no JSON cacheado e o
navegador do cliente compara com o relógio dele. O prato volta sozinho sem cron,
sem job e sem revalidar nada.

---

## Onde o dinheiro entra

`enforce_quota()` bloqueia no banco quando estoura o limite do plano e devolve
`hint = 'upgrade_required'`. O front intercepta esse hint e abre o convite de
upgrade em vez de um erro genérico. Mesma coisa para `max_locales` e para o
`enforce_publish_gate`.

O limite de plano é uma feature de conversão, não uma validação de formulário.

---

## Design

Direção **Comanda**: o artefato mais característico do restaurante é a comanda
de cozinha. Dela vem a assinatura — o líder pontilhado entre nome e preço, com
numerais monoespaçados tabulares que alinham os valores numa coluna e deixam o
olho descer a lista comparando.

- **Paleta:** petróleo `#0E3B39` · tinta `#10201F` · papel mineral `#F2F4EF` ·
  mostarda `#E0A32E` · brasa `#C2352A` (só alertas)
- **Tipografia:** Instrument Serif (display) · Inter Tight (interface) ·
  DM Mono (preços)
- **Temas do cardápio público:** Terracota, Vinho, Oliva, Noturno — o dono escolhe

O hero da landing não é um print do produto: é o cardápio funcionando, com os
filtros de restrição ativos.
