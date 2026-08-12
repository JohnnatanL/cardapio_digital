"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ArrowLeft } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { CampoI18n } from "./CampoI18n";
import { UploadImagem } from "./UploadImagem";
import { TagIcon } from "@/components/menu/TagIcon";
import { t, LIMITE_DESCRICAO, LIMITE_NOME } from "@/lib/i18n";
import type { I18nText, Category, Tag, TagMode } from "@/types/database";

export function EditorItem({ item, categorias, tags, restaurante }: {
  item: any; categorias: Category[]; tags: Tag[]; restaurante: any;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState<I18nText>(item?.name ?? {});
  const [descricao, setDescricao] = useState<I18nText>(item?.description ?? {});
  const [preco, setPreco] = useState(item?.base_price?.toString() ?? "");
  const [categoriaId, setCategoriaId] = useState(item?.category_id ?? "");
  const [destaque, setDestaque] = useState(Boolean(item?.is_featured));
  const [imagem, setImagem] = useState<string | null>(item?.image_url ?? null);

  // tag_id -> modo. Ausente = não marcada.
  const [marcadas, setMarcadas] = useState<Map<string, TagMode>>(
    new Map((item?.item_tags ?? []).map((x: any) => [x.tag_id, x.mode])),
  );

  const locales = restaurante.locales as string[];
  const padrao = restaurante.default_locale as string;

  function ciclarTag(tagId: string) {
    // Três estados: não marcada -> contém -> pode conter -> não marcada
    setMarcadas((atual) => {
      const novo = new Map(atual);
      const modo = novo.get(tagId);
      if (!modo) novo.set(tagId, "contains");
      else if (modo === "contains") novo.set(tagId, "may_contain");
      else novo.delete(tagId);
      return novo;
    });
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    iniciar(async () => {
      const supabase = criarClienteBrowser();

      const dados = {
        restaurant_id: restaurante.id,
        name: nome,
        description: Object.keys(descricao).length ? descricao : null,
        base_price: preco.trim() ? Number(preco.replace(",", ".")) : null,
        category_id: categoriaId || null,
        is_featured: destaque,
        image_url: imagem,
      };

      let itemId = item?.id;

      if (itemId) {
        const { error } = await supabase.from("items").update(dados).eq("id", itemId);
        if (error) return setErro(traduzirErro(error.message));
      } else {
        const { data, error } = await supabase.from("items").insert(dados).select("id").single();
        if (error) return setErro(traduzirErro(error.message));
        itemId = data.id;
      }

      // Tags: apaga e reinsere. São poucas linhas, e evita diff complicado.
      await supabase.from("item_tags").delete().eq("item_id", itemId);
      if (marcadas.size) {
        await supabase.from("item_tags").insert(
          [...marcadas].map(([tag_id, mode]) => ({ item_id: itemId, tag_id, mode })),
        );
      }

      router.push("/painel/itens");
      router.refresh();
    });
  }

  function excluir() {
    if (!confirm("Excluir este prato? Ele sai de todos os cardápios.")) return;
    iniciar(async () => {
      const supabase = criarClienteBrowser();
      await supabase.from("items").delete().eq("id", item.id);
      router.push("/painel/itens");
      router.refresh();
    });
  }

  const alergenicos = tags.filter((x) => x.kind === "allergen");
  const dietas = tags.filter((x) => x.kind !== "allergen");

  return (
    <form onSubmit={salvar} className="max-w-2xl">
      <button
        type="button" onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--color-fumaca)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-none">
        {item ? "Editar prato" : "Novo prato"}
      </h1>

      <div className="mt-7 space-y-5">
        <CampoI18n
          rotulo="Nome do prato" valor={nome} onChange={setNome}
          locales={locales} padrao={padrao} limite={LIMITE_NOME}
          ajuda="Nomes de pratos regionais funcionam melhor sem tradução."
          placeholder={{ "pt-BR": "Baião de dois" }}
        />

        <CampoI18n
          rotulo="Descrição" valor={descricao} onChange={setDescricao}
          locales={locales} padrao={padrao} limite={LIMITE_DESCRICAO} multilinha
          ajuda="Liste os ingredientes principais. Aparece em letra menor embaixo do nome."
          placeholder={{ "pt-BR": "Arroz, feijão de corda, queijo coalho e carne de sol." }}
        />

        <UploadImagem
          valorAtual={imagem}
          restaurantId={restaurante.id}
          pasta="itens"
          onChange={setImagem}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="preco" className="eyebrow">Preço de catálogo</label>
            <input
              id="preco" inputMode="decimal" className="campo mt-1.5 font-[family-name:var(--font-numero)]"
              value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="38,00"
            />
            <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">
              Pode ficar vazio. O valor que vale é o que você define ao pôr o prato
              em um cardápio.
            </p>
          </div>

          <div>
            <label htmlFor="categoria" className="eyebrow">Categoria</label>
            <select
              id="categoria" className="campo mt-1.5"
              value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{t(c.name, padrao)}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-[0.875rem]">
          <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} />
          Marcar como destaque da casa
        </label>

        {/* ---- Alergênicos ---- */}
        <div>
          <div className="regua mb-4 mt-2" />
          <p className="eyebrow">Alergênicos</p>
          <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">
            Toque uma vez para <strong>contém</strong>, duas para <strong>pode conter</strong>{" "}
            (risco de contaminação cruzada), três para desmarcar.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {alergenicos.map((tag) => {
              const modo = marcadas.get(tag.id);
              return (
                <button
                  key={tag.id} type="button" onClick={() => ciclarTag(tag.id)}
                  className="chip" data-ativo={modo === "contains"}
                  style={
                    modo === "may_contain"
                      ? { borderColor: "var(--color-mostarda)", borderStyle: "dashed", background: "#fff" }
                      : undefined
                  }
                >
                  <TagIcon nome={tag.icon} className="h-3.5 w-3.5" />
                  {t(tag.label, padrao)}
                  {modo === "may_contain" && (
                    <span className="text-[0.625rem] opacity-70">pode conter</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="eyebrow mt-5">Dieta e avisos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {dietas.map((tag) => (
              <button
                key={tag.id} type="button"
                onClick={() =>
                  setMarcadas((a) => {
                    const n = new Map(a);
                    n.has(tag.id) ? n.delete(tag.id) : n.set(tag.id, "contains");
                    return n;
                  })}
                className="chip" data-ativo={marcadas.has(tag.id)}
              >
                <TagIcon nome={tag.icon} className="h-3.5 w-3.5" />
                {t(tag.label, padrao)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-5 text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button type="submit" className="btn btn-escuro" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar prato"}
        </button>
        {item && (
          <button
            type="button" onClick={excluir} disabled={pendente}
            className="inline-flex items-center gap-1.5 text-[0.8125rem]"
            style={{ color: "var(--color-brasa)" }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        )}
      </div>
    </form>
  );
}

/** Erros do Postgres viram frases que dizem o que fazer. */
function traduzirErro(mensagem: string) {
  if (mensagem.includes("upgrade_required") || mensagem.includes("Limite do plano")) {
    return "Você atingiu o limite de pratos do seu plano. Faça upgrade em Assinatura para cadastrar mais.";
  }
  if (mensagem.includes("items_description_check")) {
    return `A descrição passou de ${LIMITE_DESCRICAO} caracteres em algum idioma. Confira as abas.`;
  }
  if (mensagem.includes("items_name_check")) {
    return "O nome do prato precisa estar preenchido em pelo menos um idioma.";
  }
  return "Não foi possível salvar. Confira os campos e tente de novo.";
}
