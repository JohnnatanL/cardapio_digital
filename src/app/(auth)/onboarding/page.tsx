import { Suspense } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormOnboarding } from "./FormOnboarding";

export const metadata = { title: "Seu restaurante" };

export default async function Onboarding() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Já tem restaurante? Vai direto pro painel.
  const { data } = await supabase
    .from("memberships").select("restaurant_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (data) redirect("/painel");

  return (
    <>
      <p className="eyebrow">Passo 2 de 2</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.75rem] leading-none">
        Seu restaurante
      </h1>
      <p className="mt-2 text-[0.875rem] text-[var(--color-fumaca)]">
        Dá para mudar tudo depois, inclusive o endereço do cardápio.
      </p>
      <Suspense fallback={<div className="mt-6 h-52" />}><FormOnboarding /></Suspense>
    </>
  );
}
