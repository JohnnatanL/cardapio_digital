import { restauranteAtual, assinaturaAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GerenciarIdiomas } from "@/components/painel/GerenciarIdiomas";

export const metadata = { title: "Idiomas" };

export default async function PaginaIdiomas() {
  const restaurante = (await restauranteAtual())!;
  const assinatura: any = await assinaturaAtual(restaurante.id);
  const supabase = await criarClienteServidor();

  const { data: itens } = await supabase
    .from("items").select("id, name, description").eq("restaurant_id", restaurante.id);

  return (
    <>
      <p className="eyebrow">Cardápio</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
        Idiomas
      </h1>
      <p className="mt-2 max-w-[56ch] text-[0.875rem] text-[var(--color-fumaca)]">
        Você escreve cada versão. Não traduzimos automaticamente — nome de prato
        regional traduzido por máquina costuma sair errado, e o garçom precisa
        entender o que o cliente está apontando.
      </p>

      <GerenciarIdiomas
        restaurante={restaurante}
        itens={itens ?? []}
        maxLocales={assinatura?.plans?.max_locales ?? 1}
      />
    </>
  );
}
