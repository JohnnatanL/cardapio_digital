"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, CircleAlert } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { CampoI18n } from "./CampoI18n";
import { t } from "@/lib/i18n";
import { slugify } from "@/lib/utils";
import type { I18nText } from "@/types/database";

const DIAS = [
  { i: 0, nome: "Domingo" }, { i: 1, nome: "Segunda" }, { i: 2, nome: "Terça" },
  { i: 3, nome: "Quarta" }, { i: 4, nome: "Quinta" }, { i: 5, nome: "Sexta" },
  { i: 6, nome: "Sábado" },
];

export function EditorCardapio({ menu, itens, restaurante }: any) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState<I18nText>(menu?.name ?? {});
  const [ativo, setAtivo] = useState(menu?.is_active ?? true);
  const [dias, setDias] = useState<Set<number>>(
    new Set((menu?.menu_days ?? []).map((d: any) => d.weekday)),
  );

  // item_id -> preço em texto. Chave presente = item está no cardápio.
  const [precos, setPrecos] = useState<Map<string, string>>(
    new Map((menu?.menu_items ?? []).map((mi: any) => [mi.item_id, String(mi.price)])),
  );

  function alternarItem(itemId: string, precoSugerido: number | null) {
    setPrecos((atual) => {
      const novo = new Map(atual);
      if (novo.has(itemId)) novo.delete(itemId);
      else novo.set(itemId, precoSugerido != null ? String(precoSugerido) : "");
      return novo;
    });
  }

  const semPreco = [...precos].filter(([, v]) => !v.trim() || Number(v.replace(",", ".")) < 0);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (semPreco.length) {
      setErro(`${semPreco.length} ${semPreco.length === 1 ? "prato está" : "pratos estão"} sem preço. Todo prato em um cardápio precisa de valor.`);
      return;
    }

    iniciar(async () => {
      const supabase = criarClienteBrowser();
      let menuId = menu?.id;

      const dados = {
        restaurant_id: restaurante.id,
        name: nome,
        slug: menu?.slug ?? (slugify(t(nome, restaurante.default_locale)) || "cardapio"),
        is_active: ativo,
      };

      if (menuId) {
        const { error } = await supabase.from("menus").update(dados).eq("id", menuId);
        if (error) return setErro(traduzir(error.message));
      } else {
        const { data, error } = await supabase.from("menus").insert(dados).select("id").single();
        if (error) return setErro(traduzir(error.message));
        menuId = data.id;
      }

      // Dias e itens: apaga e reinsere. Volume pequeno, lógica simples.
      await supabase.from("menu_days").delete().eq("menu_id", menuId);
      if (dias.size) {
        await supabase.from("menu_days").insert(
          [...dias].map((weekday) => ({ menu_id: menuId, weekday })),
        );
      }

      await supabase.from("menu_items").delete().eq("menu_id", menuId);
      if (precos.size) {
        const { error } = await supabase.from("menu_items").insert(
          [...precos].map(([item_id, preco], i) => ({
            menu_id: menuId, item_id, price: Number(preco.replace(",", ".")), sort_order: i,
          })),
        );
        if (error) return setErro(traduzir(error.message));
      }

      router.push("/painel/cardapios");
      router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="max-w-2xl">
      <button type="button" onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-fumaca)]">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-none">
        {menu ? "Editar cardápio" : "Novo cardápio"}
      </h1>

      <div className="mt-7 space-y-6">
        <CampoI18n
          rotulo="Nome do cardápio" valor={nome} onChange={setNome}
          locales={restaurante.locales} padrao={restaurante.default_locale} limite={60}
          placeholder={{ "pt-BR": "Almoço executivo" }}
        />

        {/* ---- Dias ---- */}
        <div>
          <p className="eyebrow">Dias em que aparece</p>
          <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">
            Sem nenhum dia marcado, o cardápio não aparece para o cliente.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {DIAS.map(({ i, nome: dia }) => (
              <button
                key={i} type="button" className="chip"
                data-ativo={dias.has(i)}
                onClick={() => setDias((a) => {
                  const n = new Set(a);
                  n.has(i) ? n.delete(i) : n.add(i);
                  return n;
                })}
              >
                {dia}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-[0.875rem]">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Cardápio ativo
        </label>

        {/* ---- Itens e preços ---- */}
        <div>
          <div className="regua mb-4" />
          <p className="eyebrow">Pratos e preços</p>
          <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">
            Marque os pratos e defina o preço neste cardápio.
          </p>

          <div className="mt-3 divide-y divide-[var(--color-risco)] border-y border-[var(--color-risco)]">
            {itens.map((item: any) => {
              const dentro = precos.has(item.id);
              const valor = precos.get(item.id) ?? "";
              return (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox" checked={dentro}
                    onChange={() => alternarItem(item.id, item.base_price)}
                    aria-label={`Incluir ${t(item.name, restaurante.default_locale)}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[0.875rem]">
                    {t(item.name, restaurante.default_locale)}
                  </span>

                  {dentro && (
                    <input
                      inputMode="decimal" placeholder="0,00"
                      className="campo w-24 !py-1 text-right font-[family-name:var(--font-numero)] text-[0.8125rem]"
                      value={valor}
                      onChange={(e) => setPrecos((a) => new Map(a).set(item.id, e.target.value))}
                      style={!valor.trim() ? { borderColor: "var(--color-brasa)" } : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {semPreco.length > 0 && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[0.75rem]"
               style={{ color: "var(--color-brasa)" }}>
              <CircleAlert className="h-3.5 w-3.5" />
              {semPreco.length} {semPreco.length === 1 ? "prato sem preço" : "pratos sem preço"}
            </p>
          )}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-5 text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button type="submit" className="btn btn-escuro" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar cardápio"}
        </button>
        {menu && (
          <button type="button" className="inline-flex items-center gap-1.5 text-[0.8125rem]"
            style={{ color: "var(--color-brasa)" }}
            onClick={() => {
              if (!confirm("Excluir este cardápio?")) return;
              iniciar(async () => {
                const supabase = criarClienteBrowser();
                await supabase.from("menus").delete().eq("id", menu.id);
                router.push("/painel/cardapios");
                router.refresh();
              });
            }}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        )}
      </div>
    </form>
  );
}

function traduzir(mensagem: string) {
  if (mensagem.includes("upgrade_required") || mensagem.includes("Limite do plano")) {
    return "Você atingiu o limite de cardápios do seu plano. Faça upgrade em Assinatura.";
  }
  if (mensagem.includes("null value in column \"price\"")) {
    return "Todo prato em um cardápio precisa de preço.";
  }
  return "Não foi possível salvar. Confira os campos e tente de novo.";
}
