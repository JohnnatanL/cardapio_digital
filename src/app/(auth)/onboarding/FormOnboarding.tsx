"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { slugify, SLUGS_RESERVADOS } from "@/lib/utils";

export function FormOnboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [tocouSlug, setTocouSlug] = useState(false);
  const [livre, setLivre] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Sugere o slug enquanto a pessoa digita o nome, até ela editar o slug
  useEffect(() => {
    if (!tocouSlug) setSlug(slugify(nome));
  }, [nome, tocouSlug]);

  // Checa disponibilidade com debounce
  useEffect(() => {
    if (slug.length < 3) { setLivre(null); return; }
    if (SLUGS_RESERVADOS.has(slug)) { setLivre(false); return; }

    const timer = setTimeout(async () => {
      const supabase = criarClienteBrowser();
      const { data } = await supabase.rpc("check_slug_available", { p_slug: slug });
      setLivre(Boolean(data));
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    const supabase = criarClienteBrowser();
    const { error } = await supabase.rpc("create_restaurant", {
      p_name: nome,
      p_slug: slug,
      p_plan_code: params.get("plano") ?? "essencial",
    });

    if (error) {
      setErro(
        error.message.includes("Slug reservado") || error.message.includes("duplicate")
          ? "Esse endereço já está em uso. Escolha outro."
          : "Não foi possível criar o restaurante. Tente de novo.",
      );
      setCarregando(false);
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  const podeEnviar = nome.trim().length > 1 && slug.length >= 3 && livre === true;

  return (
    <form onSubmit={criar} className="mt-6 space-y-4">
      <div>
        <label htmlFor="nome" className="eyebrow">Nome do restaurante</label>
        <input id="nome" required className="campo mt-1.5" value={nome}
          onChange={(e) => setNome(e.target.value)} placeholder="Casa de Farinha" />
      </div>

      <div>
        <label htmlFor="slug" className="eyebrow">Endereço do cardápio</label>
        <div className="mt-1.5 flex items-center gap-0">
          <span className="rounded-l-[4px] border border-r-0 border-[var(--color-risco)] bg-[var(--color-papel-alt)] px-2.5 py-[0.625rem] font-[family-name:var(--font-numero)] text-[0.8125rem] text-[var(--color-fumaca)]">
            /r/
          </span>
          <input
            id="slug" required className="campo rounded-l-none font-[family-name:var(--font-numero)] text-[0.875rem]"
            value={slug}
            onChange={(e) => { setTocouSlug(true); setSlug(slugify(e.target.value)); }}
          />
        </div>

        {slug.length >= 3 && livre !== null && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem]"
             style={{ color: livre ? "var(--color-musgo)" : "var(--color-brasa)" }}>
            {livre ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {livre ? "Endereço disponível" : "Esse endereço já está em uso"}
          </p>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-escuro w-full" disabled={!podeEnviar || carregando}>
        {carregando ? "Criando…" : "Criar restaurante"}
      </button>
    </form>
  );
}
