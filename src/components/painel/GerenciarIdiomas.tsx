"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { NOMES_LOCALE, faltando, t } from "@/lib/i18n";

const DISPONIVEIS = ["pt-BR", "en", "es", "fr", "it"];

export function GerenciarIdiomas({ restaurante, itens, maxLocales }: any) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const ativos: string[] = restaurante.locales;

  function alternar(locale: string) {
    if (locale === restaurante.default_locale) return;
    const novos = ativos.includes(locale)
      ? ativos.filter((l) => l !== locale)
      : [...ativos, locale];

    setErro(null);
    iniciar(async () => {
      const supabase = criarClienteBrowser();
      const { error } = await supabase.from("restaurants")
        .update({ locales: novos }).eq("id", restaurante.id);
      if (error) {
        setErro(error.message.includes("permite")
          ? `Seu plano permite ${maxLocales} ${maxLocales === 1 ? "idioma" : "idiomas"}. Faça upgrade em Assinatura.`
          : "Não foi possível mudar os idiomas.");
        return;
      }
      router.refresh();
    });
  }

  // Completude: sem isso o cardápio em inglês fica pela metade e ninguém percebe
  const incompletos = itens.filter((i: any) => {
    const outros = ativos.filter((l) => l !== restaurante.default_locale);
    if (!outros.length) return false;
    return faltando(i.name, outros).length > 0 || faltando(i.description, outros).length > 0;
  });

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {DISPONIVEIS.map((locale) => (
          <button key={locale} className="chip" disabled={pendente}
            data-ativo={ativos.includes(locale)} onClick={() => alternar(locale)}>
            {NOMES_LOCALE[locale] ?? locale}
            {locale === restaurante.default_locale && (
              <span className="text-[0.625rem] opacity-70">padrão</span>
            )}
          </button>
        ))}
      </div>

      {erro && (
        <p role="alert" className="mt-3 text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      {ativos.length > 1 && (
        <section className="mt-10 max-w-2xl">
          <h2 className="eyebrow">Pratos com tradução faltando</h2>
          <div className="regua mt-2" />

          {incompletos.length === 0 ? (
            <p className="mt-3 text-[0.875rem]" style={{ color: "var(--color-musgo)" }}>
              Todos os pratos estão completos em todos os idiomas.
            </p>
          ) : (
            <>
              <p className="mt-3 text-[0.875rem] text-[var(--color-fumaca)]">
                {incompletos.length} de {itens.length} {incompletos.length === 1 ? "prato precisa" : "pratos precisam"} de tradução.
              </p>
              <ul className="mt-3 divide-y divide-[var(--color-risco)] border-y border-[var(--color-risco)]">
                {incompletos.slice(0, 20).map((item: any) => (
                  <li key={item.id}>
                    <Link href={`/painel/itens/${item.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-[0.875rem]">
                      <span className="truncate">{t(item.name, restaurante.default_locale)}</span>
                      <span className="flex-none font-[family-name:var(--font-numero)] text-[0.6875rem] uppercase"
                        style={{ color: "var(--color-mostarda-2)" }}>
                        falta {[...new Set([
                          ...faltando(item.name, ativos),
                          ...faltando(item.description, ativos),
                        ])].join(", ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
