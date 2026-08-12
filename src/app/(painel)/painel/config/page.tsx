import { restauranteAtual, assinaturaAtual } from "@/lib/supabase/queries";
import { FormConfig } from "@/components/painel/FormConfig";

export const metadata = { title: "Ajustes" };

export default async function PaginaConfig() {
  const restaurante = (await restauranteAtual())!;
  const assinatura: any = await assinaturaAtual(restaurante.id);
  const podePublicar = ["trialing", "active"].includes(assinatura?.status);

  return (
    <>
      <p className="eyebrow">Restaurante</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
        Ajustes
      </h1>
      <FormConfig restaurante={restaurante} podePublicar={podePublicar} />
    </>
  );
}
