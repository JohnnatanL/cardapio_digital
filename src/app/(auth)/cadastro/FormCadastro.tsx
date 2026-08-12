"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";

export function FormCadastro() {
  const router = useRouter();
  const params = useSearchParams();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setCarregando(true);
    setErro(null);

    const supabase = criarClienteBrowser();
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { full_name: nome } },
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Esse e-mail já tem conta. Entre em vez de cadastrar."
          : "Não foi possível criar a conta. Tente de novo em instantes.",
      );
      setCarregando(false);
      return;
    }

    // PENDÊNCIA: se você ativar confirmação de e-mail no Supabase, mande para
    // uma tela "confira sua caixa de entrada" em vez de ir direto ao onboarding.
    const plano = params.get("plano");
    router.push(plano ? `/onboarding?plano=${plano}` : "/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={cadastrar} className="mt-6 space-y-3">
      <div>
        <label htmlFor="nome" className="eyebrow">Seu nome</label>
        <input id="nome" required autoComplete="name" className="campo mt-1.5"
          value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label htmlFor="email" className="eyebrow">E-mail</label>
        <input id="email" type="email" required autoComplete="email" className="campo mt-1.5"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="senha" className="eyebrow">Senha</label>
        <input id="senha" type="password" required autoComplete="new-password" className="campo mt-1.5"
          value={senha} onChange={(e) => setSenha(e.target.value)} />
        <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">Mínimo de 8 caracteres.</p>
      </div>

      {erro && (
        <p role="alert" className="text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-escuro w-full" disabled={carregando}>
        {carregando ? "Criando…" : "Criar conta"}
      </button>
    </form>
  );
}
