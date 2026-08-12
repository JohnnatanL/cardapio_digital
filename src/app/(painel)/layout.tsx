import { redirect } from "next/navigation";
import { restauranteAtual, assinaturaAtual } from "@/lib/supabase/queries";
import { NavPainel } from "@/components/painel/NavPainel";
import { AvisoAssinatura } from "@/components/painel/AvisoAssinatura";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const restaurante = await restauranteAtual();
  if (!restaurante) redirect("/onboarding");

  const assinatura = await assinaturaAtual(restaurante.id);

  return (
    <div className="min-h-dvh bg-[var(--color-papel)] lg:flex">
      <NavPainel restaurante={restaurante} />
      <div className="flex-1 lg:min-w-0">
        <AvisoAssinatura assinatura={assinatura} publicado={restaurante.is_published} />
        <div className="px-5 py-6 pb-24 lg:px-10 lg:py-8 lg:pb-10">{children}</div>
      </div>
    </div>
  );
}
