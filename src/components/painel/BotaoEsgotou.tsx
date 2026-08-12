"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleSlash, RotateCcw, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { previsaoRetorno } from "@/lib/menu";
import type { Item } from "@/types/database";

/**
 * Esgotar e desesgotar.
 * É a ação mais usada do painel e acontece de pé, no meio do salão, com o
 * celular numa mão só. Por isso: um toque abre, um toque resolve, nada de
 * formulário.
 *
 * O retorno automático não precisa de job nenhum: `unavailable_until` viaja
 * no JSON do cardápio e o navegador do cliente compara com o relógio dele.
 */

const OPCOES = [
  { rotulo: "1 hora", minutos: 60 },
  { rotulo: "2 horas", minutos: 120 },
  { rotulo: "Até fechar hoje", minutos: null, ateFimDoDia: true },
  { rotulo: "Até amanhã", minutos: 60 * 24 },
  { rotulo: "Sem previsão", minutos: null },
] as const;

export function BotaoEsgotou({ item, compacto = false }: { item: Item; compacto?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pendente, iniciar] = useTransition();

  const retorno = previsaoRetorno(item as any);

  function esgotar(opcao: (typeof OPCOES)[number]) {
    let ate: string | null = null;

    if ("ateFimDoDia" in opcao && opcao.ateFimDoDia) {
      const fim = new Date();
      fim.setHours(23, 59, 0, 0);
      ate = fim.toISOString();
    } else if (opcao.minutos) {
      ate = new Date(Date.now() + opcao.minutos * 60000).toISOString();
    }

    iniciar(async () => {
      const supabase = criarClienteBrowser();
      await supabase
        .from("items")
        .update({
          is_available: false,
          unavailable_until: ate,
          unavailable_reason: motivo.trim() || null,
        })
        .eq("id", item.id);
      setAberto(false);
      setMotivo("");
      router.refresh();
    });
  }

  function devolver() {
    iniciar(async () => {
      const supabase = criarClienteBrowser();
      await supabase
        .from("items")
        .update({ is_available: true, unavailable_until: null, unavailable_reason: null })
        .eq("id", item.id);
      router.refresh();
    });
  }

  if (!item.is_available) {
    return (
      <button
        onClick={devolver}
        disabled={pendente}
        className="inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[0.75rem]"
        style={{ borderColor: "var(--color-brasa)", color: "var(--color-brasa)" }}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {compacto ? "Voltar" : retorno ? `Volta ${retorno} · devolver agora` : "Devolver ao cardápio"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--color-risco)] px-2 py-1 text-[0.75rem] text-[var(--color-fumaca)] hover:border-[var(--color-tinta)] hover:text-[var(--color-tinta)]"
      >
        <CircleSlash className="h-3.5 w-3.5" />
        {compacto ? "Esgotou" : "Marcar como esgotado"}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <div className="anim-sobe relative w-full rounded-t-[12px] bg-white p-5 pb-8 sm:max-w-sm sm:rounded-[6px] sm:pb-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="eyebrow">Esgotou</p>
                <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-[1.25rem] leading-tight">
                  Quando volta?
                </h2>
              </div>
              <button onClick={() => setAberto(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              className="campo mb-3"
              placeholder="Motivo (opcional) — ex.: acabou o camarão"
              maxLength={80}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />

            <div className="space-y-2">
              {OPCOES.map((opcao) => (
                <button
                  key={opcao.rotulo}
                  onClick={() => esgotar(opcao)}
                  disabled={pendente}
                  className="btn btn-fantasma w-full justify-start"
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[0.75rem] text-[var(--color-fumaca)]">
              O prato volta sozinho no horário escolhido. Você pode devolver antes a
              qualquer momento.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
