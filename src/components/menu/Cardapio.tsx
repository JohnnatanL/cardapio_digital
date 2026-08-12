"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import type { PublicMenuPayload, Locale } from "@/types/database";
import { t, NOMES_LOCALE } from "@/lib/i18n";
import {
  agruparPorCategoria, cardapioAbertoAgora, contarOcultos,
  itemPassaNoFiltro, queryParaFiltro, FILTRO_VAZIO, type EstadoFiltro,
} from "@/lib/menu";
import { ItemCard } from "./ItemCard";
import { FiltroRestricao, Legenda } from "./FiltroRestricao";

export function Cardapio({
  payload, locale, mesa,
}: {
  payload: PublicMenuPayload;
  locale: Locale;
  mesa?: { id: string; label: string } | null;
}) {
  const { restaurant, tags, menus } = payload;
  const padrao = restaurant.default_locale;

  const [filtro, setFiltro] = useState<EstadoFiltro>(FILTRO_VAZIO);
  const [menuAtivo, setMenuAtivo] = useState<string | null>(null);
  const [montado, setMontado] = useState(false);

  const tagsPorId = useMemo(() => new Map(tags.map((x) => [x.id, x])), [tags]);

  // Recupera filtro da URL, depois do localStorage. Só no client: o HTML é estático.
  useEffect(() => {
    const daUrl = queryParaFiltro(new URLSearchParams(location.search));
    if (daUrl.excluir.length || daUrl.exigir.length) {
      setFiltro(daUrl);
    } else {
      try {
        const salvo = localStorage.getItem("cardapio:restricoes");
        if (salvo) setFiltro(JSON.parse(salvo));
      } catch { /* ignore */ }
    }
    setMontado(true);
  }, []);

  // Analytics: uma visita, sem cookie e sem PII
  useEffect(() => {
    registrar({ tipo: "menu_view", restaurantId: restaurant.id, mesaId: mesa?.id, locale });
    if (mesa) registrar({ tipo: "qr_scan", restaurantId: restaurant.id, mesaId: mesa.id });
  }, [restaurant.id, mesa?.id, locale]);

  /**
   * Quais cardápios estão no ar AGORA.
   * Cálculo no cliente porque o HTML é estático: se fosse no servidor, o
   * cardápio de almoço ficaria congelado no cache até a próxima revalidação.
   */
  const disponiveis = useMemo(() => {
    if (!montado) return menus;
    const abertos = menus.filter((m) => cardapioAbertoAgora(m, restaurant.timezone));
    return abertos.length ? abertos : menus;
  }, [menus, restaurant.timezone, montado]);

  const menu = disponiveis.find((m) => m.id === menuAtivo) ?? disponiveis[0];
  if (!menu) return <VazioTotal nome={restaurant.name} />;

  const grupos = agruparPorCategoria(payload, menu);
  const ocultos = contarOcultos(menu.items, filtro, tagsPorId);

  return (
    <div data-tema={restaurant.theme} className="tema-superficie min-h-dvh">
      {/* ---- Capa ---- */}
      {restaurant.cover_url && (
        <div className="relative h-40 w-full sm:h-56">
          <Image src={restaurant.cover_url} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        </div>
      )}

      <header className="mx-auto max-w-2xl px-5 pt-6">
        <div className="flex items-start gap-3">
          {restaurant.logo_url && (
            <Image
              src={restaurant.logo_url} alt={restaurant.name}
              width={56} height={56}
              className="h-14 w-14 rounded-[4px] object-cover"
              priority
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-tight">
              {restaurant.name}
            </h1>
            {restaurant.description && (
              <p className="mt-0.5 text-[0.8125rem] tema-suave">{restaurant.description}</p>
            )}
          </div>

          {/* Troca de idioma só existe se tem mais de um habilitado */}
          {restaurant.locales.length > 1 && (
            <nav className="flex flex-none gap-1" aria-label="Idioma">
              {restaurant.locales.map((l) => (
                <a
                  key={l}
                  href={l === padrao ? `/r/${restaurant.slug}` : `/r/${restaurant.slug}/${l}`}
                  hrefLang={l}
                  className="chip"
                  data-ativo={l === locale}
                >
                  {(NOMES_LOCALE[l] ?? l).slice(0, 2).toUpperCase()}
                </a>
              ))}
            </nav>
          )}
        </div>

        {mesa && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-[4px] border border-current/15 px-2 py-1 text-[0.75rem] tema-destaque">
            <MapPin className="h-3.5 w-3.5" /> {mesa.label}
          </p>
        )}
      </header>

      {/* ---- Abas de cardápio (só se tiver mais de um no ar) ---- */}
      {disponiveis.length > 1 && (
        <nav className="mx-auto mt-5 max-w-2xl overflow-x-auto px-5">
          <div className="flex gap-2">
            {disponiveis.map((m) => (
              <button
                key={m.id}
                className="chip flex-none"
                data-ativo={m.id === menu.id}
                onClick={() => setMenuAtivo(m.id)}
              >
                {t(m.name, locale, padrao)}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ---- Filtro ---- */}
      <div className="mx-auto mt-4 max-w-2xl px-5">
        <FiltroRestricao
          tags={tags} filtro={filtro} setFiltro={setFiltro}
          ocultos={ocultos} locale={locale} padrao={padrao}
          onUsarFiltro={(slug) =>
            registrar({ tipo: "filter_use", restaurantId: restaurant.id, meta: { tag_slug: slug } })}
        />
      </div>

      {/* ---- Lista ---- */}
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-2">
        {grupos.map(({ categoria, itens }) => {
          const visiveis = itens.filter((i) => itemPassaNoFiltro(i, filtro, tagsPorId));
          if (!visiveis.length) return null;

          return (
            <section key={categoria?.id ?? "sem-categoria"} className="mt-8">
              <div className="flex items-baseline gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-[1.375rem]">
                  {categoria ? t(categoria.name, locale, padrao) : "Outros"}
                </h2>
                <div className="regua flex-1" />
              </div>
              {categoria?.description && (
                <p className="mt-1 text-[0.75rem] tema-suave">
                  {t(categoria.description, locale, padrao)}
                </p>
              )}

              <div className="divide-y divide-current/10">
                {visiveis.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    tagsPorId={tagsPorId}
                    locale={locale}
                    padrao={padrao}
                    moeda={restaurant.currency}
                    onVer={(id) =>
                      registrar({ tipo: "item_view", restaurantId: restaurant.id, itemId: id })}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {grupos.every(({ itens }) =>
          itens.every((i) => !itemPassaNoFiltro(i, filtro, tagsPorId))) && (
          <div className="mt-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-[1.25rem]">
              Nenhum prato passa nesse filtro
            </p>
            <p className="mt-1 text-[0.8125rem] tema-suave">
              Fale com a equipe: muita coisa dá pra adaptar na cozinha.
            </p>
            <button
              className="btn btn-fantasma mt-4"
              onClick={() => setFiltro(FILTRO_VAZIO)}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </main>

      {/* ---- Rodapé ---- */}
      <footer className="mx-auto max-w-2xl px-5 pb-10">
        <div className="regua mb-5" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Legenda
            tags={tags}
            disclaimer={restaurant.allergen_disclaimer}
            locale={locale}
            padrao={padrao}
          />
          {restaurant.whatsapp && (
            <a
              href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-1.5 text-[0.75rem] tema-suave underline underline-offset-4"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
        </div>

        {(restaurant.service_fee_percent || restaurant.couvert_cents) && (
          <p className="mt-3 flex items-start gap-1.5 text-[0.6875rem] tema-suave">
            <Clock className="mt-0.5 h-3 w-3 flex-none" />
            <span>
              {restaurant.service_fee_percent
                ? `Taxa de serviço de ${restaurant.service_fee_percent}% (opcional). `
                : ""}
              {restaurant.couvert_cents
                ? `Couvert artístico de ${(restaurant.couvert_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por pessoa.`
                : ""}
            </span>
          </p>
        )}

        <p className="mt-6 text-center text-[0.625rem] tema-suave opacity-60">
          {/* PENDÊNCIA: esconder esta linha quando o plano tiver remove_branding */}
          Cardápio digital por Nord Wind
        </p>
      </footer>
    </div>
  );
}

function VazioTotal({ nome }: { nome: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem]">{nome}</h1>
      <p className="mt-2 text-[0.875rem] text-[var(--color-fumaca)]">
        O cardápio está sendo atualizado. Volte daqui a pouco.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Analytics: fila em memória + sendBeacon.
   Batch evita uma request por toque, e sendBeacon sobrevive ao fechamento
   da aba (fetch normal é cancelado).
   -------------------------------------------------------------------------- */

type Evento = {
  tipo: string; restaurantId: string;
  itemId?: string; mesaId?: string; menuId?: string;
  locale?: string; meta?: Record<string, unknown>;
};

let fila: Evento[] = [];
let agendado: ReturnType<typeof setTimeout> | null = null;

function registrar(e: Evento) {
  if (typeof window === "undefined") return;
  fila.push(e);
  if (agendado) return;
  agendado = setTimeout(descarregar, 2500);
  window.addEventListener("pagehide", descarregar, { once: true });
}

function descarregar() {
  if (agendado) { clearTimeout(agendado); agendado = null; }
  if (!fila.length) return;
  const corpo = JSON.stringify({ eventos: fila });
  fila = [];
  try {
    navigator.sendBeacon("/api/track", new Blob([corpo], { type: "application/json" }));
  } catch { /* bloqueador de anúncio: não é problema */ }
}
