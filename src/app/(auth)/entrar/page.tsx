import Link from "next/link";
import { Suspense } from "react";
import { FormEntrar } from "./FormEntrar";

export const metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <>
      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-none">
        Entrar
      </h1>
      <p className="mt-2 text-[0.875rem] text-[var(--color-fumaca)]">
        Bem-vindo de volta.
      </p>
      <Suspense fallback={<div className="mt-6 h-52" />}><FormEntrar /></Suspense>
      <p className="mt-6 text-[0.875rem] text-[var(--color-fumaca)]">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-[var(--color-tinta)] underline underline-offset-4">
          Criar cardápio
        </Link>
      </p>
    </>
  );
}
