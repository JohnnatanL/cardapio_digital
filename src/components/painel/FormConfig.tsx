"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";

const TEMAS = [
  { id: "terracota", nome: "Terracota" },
  { id: "vinho", nome: "Vinho" },
  { id: "oliva", nome: "Oliva" },
  { id: "noturno", nome: "Noturno" },
];

export function FormConfig({ restaurante, podePublicar }: any) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const [form, setForm] = useState({
    name: restaurante.name ?? "",
    description: restaurante.description ?? "",
    whatsapp: restaurante.whatsapp ?? "",
    instagram: restaurante.instagram ?? "",
    phone: restaurante.phone ?? "",
    theme: restaurante.theme ?? "terracota",
    service_fee_percent: restaurante.service_fee_percent ?? "",
    couvert_cents: restaurante.couvert_cents ? restaurante.couvert_cents / 100 : "",
    allergen_disclaimer: restaurante.allergen_disclaimer ?? "",
  });

  function set(campo: string, valor: any) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setSalvo(false);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const supabase = criarClienteBrowser();
      const { error } = await supabase.from("restaurants").update({
        ...form,
        description: form.description || null,
        service_fee_percent: form.service_fee_percent === "" ? null : Number(form.service_fee_percent),
        couvert_cents: form.couvert_cents === "" ? null : Math.round(Number(form.couvert_cents) * 100),
      }).eq("id", restaurante.id);

      if (error) return setErro("Não foi possível salvar. Confira os campos.");
      setSalvo(true);
      router.refresh();
    });
  }

  function alternarPublicacao() {
    iniciar(async () => {
      const supabase = criarClienteBrowser();
      const { error } = await supabase.from("restaurants")
        .update({ is_published: !restaurante.is_published })
        .eq("id", restaurante.id);

      if (error) {
        setErro(error.message.includes("Assinatura inativa")
          ? "Para publicar o cardápio é preciso ter uma assinatura ativa."
          : "Não foi possível mudar a publicação.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl">
      {/* ---- Publicação ---- */}
      <div className="card-comanda mt-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="font-medium">
            {restaurante.is_published ? "Cardápio no ar" : "Cardápio fora do ar"}
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-numero)] text-[0.75rem] text-[var(--color-fumaca)]">
            /r/{restaurante.slug}
          </p>
        </div>
        <button
          onClick={alternarPublicacao} disabled={pendente || (!podePublicar && !restaurante.is_published)}
          className={`btn ${restaurante.is_published ? "btn-fantasma" : "btn-primario"}`}
        >
          {restaurante.is_published
            ? <><EyeOff className="h-4 w-4" /> Tirar do ar</>
            : <><Eye className="h-4 w-4" /> Publicar</>}
        </button>
      </div>

      {!podePublicar && !restaurante.is_published && (
        <p className="mt-2 text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          Sua assinatura precisa estar ativa para publicar.
        </p>
      )}

      <form onSubmit={salvar} className="mt-8 space-y-5">
        <Campo rotulo="Nome" valor={form.name} onChange={(v: string) => set("name", v)} />
        <Campo rotulo="Descrição curta" valor={form.description}
          onChange={(v: string) => set("description", v)} maxLength={280}
          ajuda="Aparece embaixo do nome no cardápio." />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="WhatsApp" valor={form.whatsapp}
            onChange={(v: string) => set("whatsapp", v)} placeholder="5585999999999" />
          <Campo rotulo="Instagram" valor={form.instagram}
            onChange={(v: string) => set("instagram", v)} placeholder="@seurestaurante" />
        </div>

        <div>
          <p className="eyebrow">Cor do cardápio</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEMAS.map((tema) => (
              <button key={tema.id} type="button" className="chip"
                data-ativo={form.theme === tema.id} onClick={() => set("theme", tema.id)}>
                {tema.nome}
              </button>
            ))}
          </div>
        </div>

        <div className="regua" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Taxa de serviço (%)" valor={form.service_fee_percent}
            onChange={(v: string) => set("service_fee_percent", v)} placeholder="10"
            ajuda="Informada no rodapé do cardápio." />
          <Campo rotulo="Couvert por pessoa (R$)" valor={form.couvert_cents}
            onChange={(v: string) => set("couvert_cents", v)} placeholder="15,00" />
        </div>

        <div>
          <label className="eyebrow">Aviso sobre alergênicos</label>
          <textarea className="campo mt-1.5" rows={3} value={form.allergen_disclaimer}
            onChange={(e) => set("allergen_disclaimer", e.target.value)} />
          <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">
            Aparece no rodapé do cardápio. Deixar esse aviso visível protege você e
            orienta o cliente com alergia.
          </p>
        </div>

        {erro && (
          <p role="alert" className="text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>{erro}</p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-escuro" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar alterações"}
          </button>
          {salvo && (
            <span className="text-[0.8125rem]" style={{ color: "var(--color-musgo)" }}>Salvo</span>
          )}
        </div>
      </form>
    </div>
  );
}

function Campo({ rotulo, valor, onChange, ajuda, ...resto }: any) {
  return (
    <div>
      <label className="eyebrow">{rotulo}</label>
      <input className="campo mt-1.5" value={valor}
        onChange={(e) => onChange(e.target.value)} {...resto} />
      {ajuda && <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">{ajuda}</p>}
    </div>
  );
}
