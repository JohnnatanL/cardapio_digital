"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CircleAlert } from "lucide-react";
import type { Item, Category, Locale } from "@/types/database";
import { t } from "@/lib/i18n";
import { formatarPreco } from "@/lib/utils";
import { BotaoEsgotou } from "./BotaoEsgotou";

export function ListaItens({ itens, categorias, locale }: {
  itens: Item[]; categorias: Category[]; locale: Locale;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | "todas">("todas");

  const filtrados = itens.filter((item) => {
    if (categoria !== "todas" && item.category_id !== categoria) return false;
    if (!busca) return true;
    return t(item.name, locale).toLowerCase().includes(busca.toLowerCase());
  });

  if (!itens.length) {
    return (
      <div className="card-comanda mt-8 px-6 py-14 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-[1.375rem]">
          Nenhum prato cadastrado
        </h2>
        <p className="mx-auto mt-1.5 max-w-[42ch] text-[0.875rem] text-[var(--color-fumaca)]">
          Comece pelos carros-chefe. Você não precisa cadastrar o cardápio inteiro
          para publicar — dá para ir completando depois.
        </p>
        <Link href="/painel/itens/novo" className="btn btn-primario mt-5">
          Cadastrar o primeiro prato
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fumaca)]" />
          <input
            className="campo pl-9" placeholder="Buscar prato"
            value={busca} onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="campo w-auto" value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{t(c.name, locale)}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 divide-y divide-[var(--color-risco)] border-y border-[var(--color-risco)]">
        {filtrados.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-3 py-3">
            <Link href={`/painel/itens/${item.id}`} className="min-w-0 flex-1">
              <p className="truncate font-medium">{t(item.name, locale)}</p>
              <p className="mt-0.5 truncate text-[0.75rem] text-[var(--color-fumaca)]">
                {t(item.description, locale) || "Sem descrição"}
              </p>
            </Link>

            <span className="font-[family-name:var(--font-numero)] text-[0.875rem] tabular-nums">
              {item.base_price != null ? (
                formatarPreco(item.base_price)
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[0.75rem]"
                  style={{ color: "var(--color-mostarda-2)" }}
                  title="Sem preço de catálogo. Você define o valor ao colocar em um cardápio."
                >
                  <CircleAlert className="h-3.5 w-3.5" /> sem preço
                </span>
              )}
            </span>

            <BotaoEsgotou item={item} compacto />
          </div>
        ))}
      </div>

      {!filtrados.length && (
        <p className="mt-8 text-center text-[0.875rem] text-[var(--color-fumaca)]">
          Nenhum prato encontrado com esses termos.
        </p>
      )}
    </>
  );
}
