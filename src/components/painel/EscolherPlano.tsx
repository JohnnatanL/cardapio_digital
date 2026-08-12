"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { centavosParaReais } from "@/lib/utils";
import type { Plan } from "@/types/database";

export function EscolherPlano({ planos, atual, restauranteId }: {
  planos: Plan[]; atual?: string; restauranteId: string;
}) {
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar(codigo: string) {
    setCarregando(codigo);
    setErro(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: codigo, restaurantId: restauranteId }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro ?? "falha");
      window.location.href = dados.url;   // vai pro Mercado Pago
    } catch {
      setErro("Não conseguimos abrir o pagamento. Tente de novo em instantes.");
      setCarregando(null);
    }
  }

  const pagos = planos.filter((p) => p.price_cents > 0);

  return (
    <>
      <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        {pagos.map((plano) => {
          const ehAtual = plano.code === atual;
          return (
            <div key={plano.id} className="card-comanda flex flex-col p-5">
              <h3 className="font-[family-name:var(--font-display)] text-[1.375rem] leading-none">
                {plano.name}
              </h3>
              <p className="mt-1 text-[0.8125rem] text-[var(--color-fumaca)]">{plano.tagline}</p>

              <p className="mt-4 font-[family-name:var(--font-numero)] text-[1.75rem] leading-none tabular-nums">
                {centavosParaReais(plano.price_cents)}
                <span className="text-[0.8125rem] text-[var(--color-fumaca)]">/mês</span>
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-[0.8125rem]">
                <Linha>{plano.max_menus ? `${plano.max_menus} cardápios` : "Cardápios ilimitados"}</Linha>
                <Linha>{plano.max_items ? `${plano.max_items} pratos` : "Pratos ilimitados"}</Linha>
                <Linha>{plano.max_tables ? `${plano.max_tables} mesas` : "Mesas ilimitadas"}</Linha>
                <Linha>{plano.max_locales} {plano.max_locales === 1 ? "idioma" : "idiomas"}</Linha>
                {plano.features?.analytics && <Linha>Relatórios</Linha>}
                {plano.features?.pdf_export && <Linha>Exportar em PDF</Linha>}
                {plano.features?.custom_domain && <Linha>Domínio próprio</Linha>}
                {plano.features?.remove_branding && <Linha>Sem marca no rodapé</Linha>}
              </ul>

              <button
                className={`btn mt-5 w-full ${ehAtual ? "btn-fantasma" : "btn-primario"}`}
                disabled={ehAtual || carregando !== null}
                onClick={() => assinar(plano.code)}
              >
                {ehAtual ? "Plano atual" : carregando === plano.code ? "Abrindo…" : "Assinar"}
              </button>
            </div>
          );
        })}
      </div>

      {erro && (
        <p role="alert" className="mt-4 text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}
    </>
  );
}

function Linha({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <Check className="mt-[3px] h-3.5 w-3.5 flex-none text-[var(--color-musgo)]" />
      {children}
    </li>
  );
}
