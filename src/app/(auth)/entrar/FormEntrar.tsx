"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { criarClienteBrowser } from "@/lib/supabase/client";

export function FormEntrar() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    const supabase = criarClienteBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      // Mensagem específica: erro vago faz a pessoa tentar a mesma coisa de novo.
      setErro(
        error.message.includes("Invalid login")
          ? "E-mail ou senha não conferem."
          : "Não foi possível entrar. Tente de novo em instantes.",
      );
      setCarregando(false);
      return;
    }

    router.push(params.get("proximo") ?? "/painel");
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="mt-6 space-y-3">
      <div>
        <label htmlFor="email" className="eyebrow">E-mail</label>
        <input
          id="email" type="email" required autoComplete="email"
          className="campo mt-1.5" value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="senha" className="eyebrow">Senha</label>
        <input
          id="senha" type="password" required autoComplete="current-password"
          className="campo mt-1.5" value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      {erro && (
        <p role="alert" className="text-[0.8125rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-escuro w-full" disabled={carregando}>
        {carregando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
