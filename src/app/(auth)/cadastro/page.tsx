import Link from "next/link";
import { Suspense } from "react";
import { FormCadastro } from "./FormCadastro";

export const metadata = { title: "Criar conta" };

export default function Cadastro() {
  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-none">
        Criar conta
      </h1>
      <p className="mt-2 text-[0.875rem] text-[var(--color-fumaca)]">
        14 dias para montar o cardápio. Cartão só na hora de publicar.
      </p>
      <Suspense fallback={<div className="mt-6 h-52" />}><FormCadastro /></Suspense>
      <p className="mt-6 text-[0.875rem] text-[var(--color-fumaca)]">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-[var(--color-tinta)] underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </>
  );
}
