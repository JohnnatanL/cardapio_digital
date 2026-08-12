import type {
  PublicMenu, PublicItem, PublicMenuPayload, Tag, TagMode,
} from "@/types/database";

/* ==========================================================================
   Tudo aqui roda no NAVEGADOR, em cima do JSON já cacheado.
   É isso que permite o item esgotado voltar sozinho sem cron, sem job e sem
   revalidar o cache: o próprio cliente compara `unavailable_until` com o
   relógio dele na hora de renderizar.
   ========================================================================== */

/** "agora" no fuso do restaurante, não no do celular do cliente. */
export function agoraNoFuso(timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const partes = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const dias: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    weekday: dias[partes.weekday as string] ?? new Date().getDay(),
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

function paraMinutos(hhmm: string | null) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * O cardápio está no ar agora?
 * Sem linha em menu_days = não aparece nunca. Sem horário = dia inteiro.
 * Janela que vira meia-noite (22:00–02:00) é tratada.
 */
export function cardapioAbertoAgora(menu: PublicMenu, timezone: string) {
  const { weekday, minutos } = agoraNoFuso(timezone);
  const hoje = new Date().toISOString().slice(0, 10);

  if (menu.available_from && menu.available_from > hoje) return false;
  if (menu.available_to && menu.available_to < hoje) return false;

  const doDia = menu.days.filter((d) => d.weekday === weekday);
  const ontem = menu.days.filter((d) => d.weekday === (weekday + 6) % 7);

  for (const janela of doDia) {
    const ini = paraMinutos(janela.start_time);
    const fim = paraMinutos(janela.end_time);
    if (ini === null || fim === null) return true;      // dia inteiro
    if (fim > ini && minutos >= ini && minutos < fim) return true;
    if (fim <= ini && minutos >= ini) return true;      // atravessa a meia-noite
  }
  // Janela de ontem que ainda não fechou (ex.: sexta 22h -> sábado 02h)
  for (const janela of ontem) {
    const ini = paraMinutos(janela.start_time);
    const fim = paraMinutos(janela.end_time);
    if (ini === null || fim === null) continue;
    if (fim <= ini && minutos < fim) return true;
  }
  return false;
}

/**
 * O item está disponível AGORA?
 * `unavailable_until` no passado = já voltou, mesmo com a página em cache.
 */
export function itemDisponivel(item: PublicItem, quando = new Date()) {
  if (item.is_available) return true;
  if (!item.unavailable_until) return false;
  return new Date(item.unavailable_until) <= quando;
}

/** Texto humano do retorno: "volta em 40 min", "volta amanhã". */
export function previsaoRetorno(item: PublicItem, locale = "pt-BR") {
  if (item.is_available || !item.unavailable_until) return null;
  const faltam = (new Date(item.unavailable_until).getTime() - Date.now()) / 60000;
  if (faltam <= 0) return null;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (faltam < 60) return rtf.format(Math.ceil(faltam), "minute");
  if (faltam < 60 * 24) return rtf.format(Math.ceil(faltam / 60), "hour");
  return rtf.format(Math.ceil(faltam / 60 / 24), "day");
}

/* ==========================================================================
   Filtro por restrição alimentar
   Funciona por EXCLUSÃO: "esconder pratos com glúten".
   Quem é celíaco quer fora tanto o "contém" quanto o "pode conter".
   ========================================================================== */

export interface EstadoFiltro {
  /** slugs de tags a excluir, ex.: ['gluten', 'leite'] */
  excluir: string[];
  /** true = também esconde "pode conter" (contaminação cruzada). Padrão: true. */
  incluirPodeConter: boolean;
  /** slugs de dieta que o item PRECISA ter, ex.: ['vegano'] */
  exigir: string[];
}

export const FILTRO_VAZIO: EstadoFiltro = {
  excluir: [], incluirPodeConter: true, exigir: [],
};

export function itemPassaNoFiltro(
  item: PublicItem,
  filtro: EstadoFiltro,
  tagsPorId: Map<string, Tag>,
) {
  if (!filtro.excluir.length && !filtro.exigir.length) return true;

  const modosPorSlug = new Map<string, TagMode>();
  for (const it of item.tags) {
    const tag = tagsPorId.get(it.tag_id);
    if (!tag) continue;
    // "contains" prevalece sobre "may_contain" se ambos existirem
    if (modosPorSlug.get(tag.slug) !== "contains") {
      modosPorSlug.set(tag.slug, it.mode);
    }
  }

  for (const slug of filtro.excluir) {
    const modo = modosPorSlug.get(slug);
    if (!modo) continue;
    if (modo === "contains") return false;
    if (modo === "may_contain" && filtro.incluirPodeConter) return false;
  }

  for (const slug of filtro.exigir) {
    if (!modosPorSlug.has(slug)) return false;
  }

  return true;
}

export function contarOcultos(itens: PublicItem[], filtro: EstadoFiltro, tagsPorId: Map<string, Tag>) {
  return itens.filter((i) => !itemPassaNoFiltro(i, filtro, tagsPorId)).length;
}

/* ==========================================================================
   Serialização do filtro na URL: compartilhável e sobrevive a reload
   /r/pizzaria?sem=gluten,leite&so=vegano&cruzada=0
   ========================================================================== */

export function filtroParaQuery(f: EstadoFiltro) {
  const p = new URLSearchParams();
  if (f.excluir.length) p.set("sem", f.excluir.join(","));
  if (f.exigir.length) p.set("so", f.exigir.join(","));
  if (!f.incluirPodeConter) p.set("cruzada", "0");
  return p.toString();
}

export function queryParaFiltro(p: URLSearchParams): EstadoFiltro {
  return {
    excluir: p.get("sem")?.split(",").filter(Boolean) ?? [],
    exigir: p.get("so")?.split(",").filter(Boolean) ?? [],
    incluirPodeConter: p.get("cruzada") !== "0",
  };
}

/* ==========================================================================
   Agrupamento por categoria, preservando a ordem definida no painel
   ========================================================================== */

export function agruparPorCategoria(payload: PublicMenuPayload, menu: PublicMenu) {
  const grupos = payload.categories.map((c) => ({
    categoria: c,
    itens: menu.items.filter((i) => i.category_id === c.id),
  }));
  const soltos = menu.items.filter(
    (i) => !i.category_id || !payload.categories.some((c) => c.id === i.category_id),
  );
  if (soltos.length) {
    grupos.push({ categoria: null as any, itens: soltos });
  }
  return grupos.filter((g) => g.itens.length > 0);
}

export function precoComVariacao(item: PublicItem) {
  if (!item.variants.length) return { min: item.price, max: item.price, varia: false };
  const valores = item.variants.map((v) => item.price + Number(v.price_delta));
  const min = Math.min(item.price, ...valores);
  const max = Math.max(item.price, ...valores);
  return { min, max, varia: min !== max };
}
