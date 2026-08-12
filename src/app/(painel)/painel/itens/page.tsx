import Link from "next/link";
import { Plus } from "lucide-react";
import { restauranteAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaItens } from "@/components/painel/ListaItens";

export const metadata = { title: "Pratos" };

export default async function PaginaItens() {
  const restaurante = (await restauranteAtual())!;
  const supabase = await criarClienteServidor();

  const [{ data: itens }, { data: categorias }] = await Promise.all([
    supabase.from("items").select("*").eq("restaurant_id", restaurante.id)
      .order("sort_order").order("created_at"),
    supabase.from("categories").select("*").eq("restaurant_id", restaurante.id).order("sort_order"),
  ]);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
            Pratos
          </h1>
        </div>
        <Link href="/painel/itens/novo" className="btn btn-primario">
          <Plus className="h-4 w-4" /> Novo prato
        </Link>
      </div>

      <ListaItens
        itens={itens ?? []}
        categorias={categorias ?? []}
        locale={restaurante.default_locale}
      />
    </>
  );
}
