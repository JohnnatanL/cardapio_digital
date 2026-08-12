"use client";

import { useState } from "react";
import { Wheat, Milk, Shell, Nut, Sprout } from "lucide-react";
import { Leader } from "@/components/menu/Leader";
import { formatarPreco } from "@/lib/utils";

/**
 * O hero é o produto funcionando, não um print dele.
 * O visitante toca num filtro e vê pratos sumirem — é o diferencial do
 * produto demonstrado em três segundos, sem cadastro e sem vídeo.
 *
 * PENDÊNCIA: trocar por pratos de um cliente real quando tiver autorização.
 */

const RESTRICOES = [
  { slug: "gluten", nome: "Glúten", Icone: Wheat },
  { slug: "leite", nome: "Leite", Icone: Milk },
  { slug: "crustaceos", nome: "Crustáceos", Icone: Shell },
  { slug: "castanhas", nome: "Castanhas", Icone: Nut },
] as const;

const PRATOS = [
  {
    nome: "Baião de dois",
    desc: "Arroz, feijão de corda, queijo coalho e carne de sol desfiada.",
    preco: 42,
    contem: ["leite"],
    vegano: false,
  },
  {
    nome: "Camarão na moranga",
    desc: "Camarão sete barbas ao creme, servido na abóbora assada.",
    preco: 89,
    contem: ["crustaceos", "leite"],
    vegano: false,
  },
  {
    nome: "Peixada cearense",
    desc: "Posta de pescada amarela, leite de coco, pimentões e coentro.",
    preco: 76,
    contem: [],
    vegano: false,
  },
  {
    nome: "Escondidinho de jerimum",
    desc: "Purê de abóbora, castanha de caju tostada e alecrim. Sem proteína animal.",
    preco: 38,
    contem: ["castanhas"],
    vegano: true,
  },
  {
    nome: "Tapioca de tapioca",
    desc: "Goma hidratada, coco fresco e melado de rapadura.",
    preco: 24,
    contem: [],
    vegano: true,
  },
] as const;

export function DemoAoVivo() {
  const [excluidos, setExcluidos] = useState<string[]>([]);
  const [soVegano, setSoVegano] = useState(false);

  const visiveis = PRATOS.filter((p) => {
    if (soVegano && !p.vegano) return false;
    return !p.contem.some((c) => excluidos.includes(c));
  });
  const ocultos = PRATOS.length - visiveis.length;

  function alternar(slug: string) {
    setExcluidos((atual) =>
      atual.includes(slug) ? atual.filter((s) => s !== slug) : [...atual, slug],
    );
  }

  return (
    <div className="card-comanda mx-auto w-full max-w-[380px] overflow-hidden shadow-[0_1px_0_var(--color-risco),0_18px_50px_-24px_rgba(16,32,31,0.45)]">
      {/* Cabeçalho do "cardápio" */}
      <div className="border-b border-[var(--color-risco)] px-5 pb-4 pt-5">
        <p className="eyebrow">Demonstração · toque nos filtros</p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-[1.5rem] leading-none">
          Casa de Farinha
        </h3>
      </div>

      {/* Filtros */}
      <div className="border-b border-[var(--color-risco)] bg-[var(--color-papel)] px-5 py-3">
        <p className="eyebrow mb-2">Esconder pratos com</p>
        <div className="flex flex-wrap gap-1.5">
          {RESTRICOES.map(({ slug, nome, Icone }) => (
            <button
              key={slug}
              className="chip"
              data-ativo={excluidos.includes(slug)}
              onClick={() => alternar(slug)}
            >
              <Icone className="h-3.5 w-3.5" strokeWidth={1.75} />
              {nome}
            </button>
          ))}
          <button className="chip" data-ativo={soVegano} onClick={() => setSoVegano((v) => !v)}>
            <Sprout className="h-3.5 w-3.5" strokeWidth={1.75} />
            Só vegano
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="px-5 py-2">
        {visiveis.map((p) => (
          <div key={p.nome} className="border-b border-[var(--color-risco)]/60 py-3 last:border-0">
            <Leader nome={p.nome} preco={formatarPreco(p.preco)} />
            <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--color-fumaca)]">
              {p.desc}
            </p>
          </div>
        ))}

        {visiveis.length === 0 && (
          <p className="py-10 text-center text-[0.8125rem] text-[var(--color-fumaca)]">
            Nenhum prato passa nesse filtro.
          </p>
        )}
      </div>

      {ocultos > 0 && (
        <p className="border-t border-[var(--color-risco)] bg-[var(--color-papel)] px-5 py-2.5 text-[0.75rem] text-[var(--color-fumaca)]">
          {ocultos} {ocultos === 1 ? "prato oculto" : "pratos ocultos"} pelo filtro
        </p>
      )}
    </div>
  );
}
