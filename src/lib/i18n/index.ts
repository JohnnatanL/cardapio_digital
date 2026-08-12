import type { I18nText, Locale } from "@/types/database";

/**
 * Lê um campo i18n com fallback.
 * Regra: nunca renderizar vazio. Cardápio com buraco é pior que monolíngue.
 * Ordem: idioma pedido -> idioma padrão do restaurante -> primeiro preenchido.
 */
export function t(
  campo: I18nText | null | undefined,
  locale: Locale,
  fallback: Locale = "pt-BR",
): string {
  if (!campo) return "";
  const direto = campo[locale]?.trim();
  if (direto) return direto;
  const padrao = campo[fallback]?.trim();
  if (padrao) return padrao;
  for (const valor of Object.values(campo)) {
    if (valor?.trim()) return valor;
  }
  return "";
}

/** Um campo i18n está completo em todos os idiomas habilitados? */
export function completo(campo: I18nText | null | undefined, locales: Locale[]) {
  if (!campo) return false;
  return locales.every((l) => Boolean(campo[l]?.trim()));
}

/** Quais idiomas ainda faltam preencher. Alimenta o painel de completude. */
export function faltando(campo: I18nText | null | undefined, locales: Locale[]) {
  return locales.filter((l) => !campo?.[l]?.trim());
}

export const NOMES_LOCALE: Record<string, string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
};

export const BANDEIRAS: Record<string, string> = {
  "pt-BR": "🇧🇷", en: "🇺🇸", es: "🇪🇸", fr: "🇫🇷", it: "🇮🇹",
};

/** Melhor idioma disponível a partir do header Accept-Language. */
export function resolverLocale(aceito: string | null, disponiveis: Locale[], padrao: Locale) {
  if (!aceito) return padrao;
  const pedidos = aceito.split(",").map((p) => p.split(";")[0].trim().toLowerCase());
  for (const pedido of pedidos) {
    const exato = disponiveis.find((d) => d.toLowerCase() === pedido);
    if (exato) return exato;
    const base = pedido.split("-")[0];
    const parcial = disponiveis.find((d) => d.toLowerCase().split("-")[0] === base);
    if (parcial) return parcial;
  }
  return padrao;
}

export const LIMITE_DESCRICAO = 160; // espelha o CHECK do banco
export const LIMITE_NOME = 80;
