import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarPreco(valor: number, moeda = "BRL", locale = "pt-BR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moeda,
    minimumFractionDigits: 2,
  }).format(valor);
}

export function centavosParaReais(centavos: number) {
  return formatarPreco(centavos / 100);
}

/** Slug a partir de texto livre. Espelha public.slugify() do banco. */
export function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export const SLUGS_RESERVADOS = new Set([
  "admin","api","app","auth","blog","cardapio","checkout","dashboard","docs",
  "entrar","help","login","logout","painel","planos","precos","pricing","r",
  "signup","sobre","suporte","termos","privacidade","www","static","assets",
]);
