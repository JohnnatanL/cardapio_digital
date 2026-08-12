"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Printer, Trash2, ExternalLink } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import type { RestaurantTable } from "@/types/database";

export function GerenciarMesas({ mesas, cardapios, restaurante }: any) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [rotulo, setRotulo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!rotulo.trim()) return;
    setErro(null);

    iniciar(async () => {
      const supabase = criarClienteBrowser();
      const { error } = await supabase.from("restaurant_tables").insert({
        restaurant_id: restaurante.id,
        label: rotulo.trim(),
        sort_order: mesas.length,
      });
      if (error) {
        setErro(error.message.includes("Limite do plano")
          ? "Você atingiu o limite de mesas do seu plano. Faça upgrade em Assinatura."
          : "Não foi possível adicionar a mesa.");
        return;
      }
      setRotulo("");
      router.refresh();
    });
  }

  /** Adiciona várias de uma vez: ninguém quer digitar "Mesa 1" até "Mesa 30". */
  function adicionarLote() {
    const quantidade = Number(prompt("Quantas mesas adicionar?", "10"));
    if (!quantidade || quantidade < 1 || quantidade > 100) return;

    iniciar(async () => {
      const supabase = criarClienteBrowser();
      const inicio = mesas.length;
      const { error } = await supabase.from("restaurant_tables").insert(
        Array.from({ length: quantidade }, (_, i) => ({
          restaurant_id: restaurante.id,
          label: `Mesa ${inicio + i + 1}`,
          sort_order: inicio + i,
        })),
      );
      if (error) setErro("Algumas mesas não couberam no limite do seu plano.");
      router.refresh();
    });
  }

  function remover(id: string) {
    if (!confirm("Remover esta mesa? O QR impresso dela deixa de funcionar.")) return;
    iniciar(async () => {
      const supabase = criarClienteBrowser();
      await supabase.from("restaurant_tables").delete().eq("id", id);
      router.refresh();
    });
  }

  return (
    <>
      <form onSubmit={adicionar} className="mt-6 flex flex-wrap gap-2">
        <input
          className="campo max-w-[220px] flex-1" placeholder="Mesa 7, Varanda 2, Balcão…"
          value={rotulo} onChange={(e) => setRotulo(e.target.value)}
        />
        <button type="submit" className="btn btn-escuro" disabled={pendente}>
          <Plus className="h-4 w-4" /> Adicionar
        </button>
        <button type="button" onClick={adicionarLote} className="btn btn-fantasma" disabled={pendente}>
          Adicionar várias
        </button>
      </form>

      {erro && (
        <p role="alert" className="mt-3 text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      {mesas.length > 0 && (
        <>
          <a
            href={`/api/pdf/${restaurante.slug}/mesas`} target="_blank" rel="noreferrer"
            className="btn btn-primario mt-5"
          >
            <Printer className="h-4 w-4" /> Imprimir etiquetas ({mesas.length})
          </a>
          <p className="mt-1.5 text-[0.75rem] text-[var(--color-fumaca)]">
            Folha A4 com marcas de corte. Imprima em papel adesivo ou plastifique.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mesas.map((mesa: RestaurantTable) => (
              <div key={mesa.id} className="card-comanda flex items-center gap-3 p-3">
                <img
                  src={`/api/qr/${mesa.qr_token}`} alt=""
                  className="h-16 w-16 flex-none" width={64} height={64}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{mesa.label}</p>
                  <a
                    href={`/m/${mesa.qr_token}`} target="_blank" rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-[0.75rem] text-[var(--color-fumaca)] underline underline-offset-2"
                  >
                    Testar <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <button onClick={() => remover(mesa.id)} aria-label={`Remover ${mesa.label}`}>
                  <Trash2 className="h-4 w-4 text-[var(--color-fumaca)]" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {!mesas.length && (
        <div className="card-comanda mt-6 px-6 py-12 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[1.25rem]">
            Nenhuma mesa cadastrada
          </h2>
          <p className="mx-auto mt-1.5 max-w-[44ch] text-[0.875rem] text-[var(--color-fumaca)]">
            Cadastre as mesas para gerar um QR por mesa e descobrir quais pontos do
            salão mais consultam o cardápio.
          </p>
        </div>
      )}
    </>
  );
}
