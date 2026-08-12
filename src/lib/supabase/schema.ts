/**
 * Schema do banco onde a aplicação vive.
 *
 * Tudo fica em `cardapio`, não em `public`, para o projeto Supabase poder
 * hospedar outros produtos sem colisão de nomes.
 *
 * PENDÊNCIA OBRIGATÓRIA: no painel do Supabase, vá em
 *   Settings -> API -> Exposed schemas
 * e adicione `cardapio`. Sem isso o PostgREST responde 404 em toda query,
 * inclusive nas RPCs.
 */
export const SCHEMA = "cardapio" as const;
