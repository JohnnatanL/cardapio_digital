"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X, Info } from "lucide-react";
import type { Tag, Locale } from "@/types/database";
import { t } from "@/lib/i18n";
import { TagIcon } from "./TagIcon";
import { type EstadoFiltro, filtroParaQuery } from "@/lib/menu";

const CHAVE_STORAGE = "cardapio:restricoes";

/**
 * Filtro por exclusão: "esconder pratos com glúten".
 * Estado vai pra URL (compartilhável, sobrevive a reload) e pro localStorage
 * (o cliente volta semana que vem e o filtro dele continua lá).
 */
export function FiltroRestricao({
  tags, filtro, setFiltro, ocultos, locale, padrao, onUsarFiltro,
}: {
  tags: Tag[];
  filtro: EstadoFiltro;
  setFiltro: (f: EstadoFiltro) => void;
  ocultos: number;
  locale: Locale;
  padrao: Locale;
  onUsarFiltro?: (slug: string) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const alergenicos = tags.filter((x) => x.kind === "allergen");
  const dietas = tags.filter((x) => x.kind === "diet");
  const ativos = filtro.excluir.length + filtro.exigir.length;

  // Espelha na URL sem recarregar a página
  useEffect(() => {
    const q = filtroParaQuery(filtro);
    const url = q ? `${location.pathname}?${q}` : location.pathname;
    history.replaceState(null, "", url);
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(filtro));
    } catch { /* modo privado do Safari */ }
  }, [filtro]);

  function alternarExcluir(slug: string) {
    const tem = filtro.excluir.includes(slug);
    setFiltro({
      ...filtro,
      excluir: tem ? filtro.excluir.filter((s) => s !== slug) : [...filtro.excluir, slug],
    });
    if (!tem) onUsarFiltro?.(slug);
  }

  function alternarExigir(slug: string) {
    const tem = filtro.exigir.includes(slug);
    setFiltro({
      ...filtro,
      exigir: tem ? filtro.exigir.filter((s) => s !== slug) : [...filtro.exigir, slug],
    });
    if (!tem) onUsarFiltro?.(slug);
  }

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          className="chip flex-none"
          data-ativo={ativos > 0}
          onClick={() => setAberto(true)}
          aria-label="Abrir filtros de restrição alimentar"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Restrições
          {ativos > 0 && <span className="font-medium">· {ativos}</span>}
        </button>

        {/* Atalhos das dietas mais pedidas */}
        {dietas.slice(0, 3).map((tag) => (
          <button
            key={tag.id}
            className="chip flex-none"
            data-ativo={filtro.exigir.includes(tag.slug)}
            onClick={() => alternarExigir(tag.slug)}
          >
            <TagIcon nome={tag.icon} className="h-3.5 w-3.5" />
            {t(tag.label, locale, padrao)}
          </button>
        ))}
      </div>

      {ocultos > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] tema-suave">
          <Info className="h-3.5 w-3.5" />
          {ocultos} {ocultos === 1 ? "prato oculto" : "pratos ocultos"} pelo seu filtro
          <button
            className="underline underline-offset-2"
            onClick={() => setFiltro({ excluir: [], exigir: [], incluirPodeConter: true })}
          >
            limpar
          </button>
        </p>
      )}

      {/* Bottom sheet: em tela de celular espaço é caro, painel lateral não cabe */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="anim-sobe relative max-h-[85vh] w-full overflow-y-auto rounded-t-[12px] bg-white p-5 pb-8">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[1.375rem]">
                  Restrições alimentares
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-[var(--color-fumaca)]">
                  Marque o que você não pode comer. Os pratos somem da lista.
                </p>
              </div>
              <button onClick={() => setAberto(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="eyebrow mb-2">Esconder pratos que contenham</p>
            <div className="flex flex-wrap gap-2">
              {alergenicos.map((tag) => (
                <button
                  key={tag.id}
                  className="chip"
                  data-ativo={filtro.excluir.includes(tag.slug)}
                  onClick={() => alternarExcluir(tag.slug)}
                >
                  <TagIcon nome={tag.icon} className="h-3.5 w-3.5" />
                  {t(tag.label, locale, padrao)}
                </button>
              ))}
            </div>

            <label className="mt-3 flex items-start gap-2 text-[0.8125rem]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={filtro.incluirPodeConter}
                onChange={(e) => setFiltro({ ...filtro, incluirPodeConter: e.target.checked })}
              />
              <span>
                Esconder também os pratos com risco de contaminação cruzada
                <span className="block text-[0.6875rem] text-[var(--color-fumaca)]">
                  Recomendado para alergia grave e doença celíaca
                </span>
              </span>
            </label>

            {dietas.length > 0 && (
              <>
                <div className="regua my-5" />
                <p className="eyebrow mb-2">Mostrar apenas</p>
                <div className="flex flex-wrap gap-2">
                  {dietas.map((tag) => (
                    <button
                      key={tag.id}
                      className="chip"
                      data-ativo={filtro.exigir.includes(tag.slug)}
                      onClick={() => alternarExigir(tag.slug)}
                    >
                      <TagIcon nome={tag.icon} className="h-3.5 w-3.5" />
                      {t(tag.label, locale, padrao)}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button className="btn btn-escuro mt-6 w-full" onClick={() => setAberto(false)}>
              Ver cardápio
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Legenda dos ícones. Botão discreto que abre bottom sheet. */
export function Legenda({
  tags, disclaimer, locale, padrao,
}: { tags: Tag[]; disclaimer: string; locale: Locale; padrao: Locale }) {
  const [aberto, setAberto] = useState(false);
  const usadas = tags.filter((x) => x.kind !== "other");

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-[0.75rem] tema-suave underline underline-offset-4"
      >
        <Info className="h-3.5 w-3.5" />
        Legenda dos ícones
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="anim-sobe relative max-h-[85vh] w-full overflow-y-auto rounded-t-[12px] bg-white p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-[1.375rem]">Legenda</h2>
              <button onClick={() => setAberto(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="space-y-2.5">
              {usadas.map((tag) => (
                <li key={tag.id} className="flex items-center gap-2.5 text-[0.875rem]">
                  <TagIcon nome={tag.icon} className="h-4 w-4 flex-none" />
                  {t(tag.label, locale, padrao)}
                </li>
              ))}
            </ul>

            <div className="regua my-5" />
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex-none opacity-45">
                <TagIcon nome="CircleAlert" className="h-4 w-4" />
              </span>
              <p className="text-[0.75rem] text-[var(--color-fumaca)]">
                Ícone em tom claro significa <strong>pode conter</strong> — o prato não leva o
                ingrediente, mas há risco de contaminação cruzada no preparo.
              </p>
            </div>

            <p className="mt-4 text-[0.6875rem] leading-relaxed text-[var(--color-fumaca)]">
              {disclaimer}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
