"use client";

import { useState } from "react";
import type { I18nText, Locale } from "@/types/database";
import { NOMES_LOCALE, faltando } from "@/lib/i18n";

/**
 * Editor de campo multilíngue.
 *
 * Duas decisões que importam:
 * 1. O contador é POR IDIOMA, porque o CHECK do banco também é. Estourar em
 *    inglês derruba o salvamento inteiro, e a pessoa precisa ver onde.
 * 2. A aba mostra um ponto quando o idioma está vazio. Sem esse sinal a pessoa
 *    preenche cinco pratos bilíngues, cansa, e o cardápio em inglês fica pela
 *    metade — que é o modo de falha real dessa funcionalidade.
 */
export function CampoI18n({
  valor, onChange, locales, padrao, limite, rotulo, ajuda,
  multilinha = false, placeholder,
}: {
  valor: I18nText;
  onChange: (v: I18nText) => void;
  locales: Locale[];
  padrao: Locale;
  limite: number;
  rotulo: string;
  ajuda?: string;
  multilinha?: boolean;
  placeholder?: Partial<Record<Locale, string>>;
}) {
  const [aba, setAba] = useState<Locale>(padrao);
  const texto = valor?.[aba] ?? "";
  const usado = texto.length;
  const vazios = faltando(valor, locales);

  // Âmbar a partir de 75% do limite, brasa no estouro
  const corContador =
    usado > limite ? "var(--color-brasa)"
    : usado > limite * 0.75 ? "var(--color-mostarda-2)"
    : "var(--color-fumaca)";

  const Campo = multilinha ? "textarea" : "input";

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label className="eyebrow">{rotulo}</label>

        {locales.length > 1 && (
          <div className="flex gap-1" role="tablist" aria-label={`Idioma de ${rotulo}`}>
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={l === aba}
                onClick={() => setAba(l)}
                className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 font-[family-name:var(--font-numero)] text-[0.6875rem] uppercase tracking-wider"
                style={
                  l === aba
                    ? { background: "var(--color-petroleo)", color: "var(--color-papel)" }
                    : { color: "var(--color-fumaca)" }
                }
              >
                {(NOMES_LOCALE[l] ?? l).slice(0, 2)}
                {vazios.includes(l) && (
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: "var(--color-mostarda)" }}
                    title="Ainda vazio neste idioma"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Campo
        className="campo mt-1.5"
        rows={multilinha ? 3 : undefined}
        value={texto}
        placeholder={placeholder?.[aba]}
        maxLength={limite}
        onChange={(e: any) => onChange({ ...valor, [aba]: e.target.value })}
      />

      <div className="mt-1 flex items-baseline justify-between gap-3">
        {ajuda && (
          <p className="text-[0.75rem] text-[var(--color-fumaca)]">{ajuda}</p>
        )}
        <span
          className="ml-auto font-[family-name:var(--font-numero)] text-[0.6875rem] tabular-nums"
          style={{ color: corContador }}
        >
          {usado}/{limite}
        </span>
      </div>
    </div>
  );
}
