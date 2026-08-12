import { notFound } from "next/navigation";
import { restauranteAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { EditorItem } from "@/components/painel/EditorItem";

export const metadata = { title: "Editar prato" };

export default async function PaginaEditarItem(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const restaurante = (await restauranteAtual())!;
  const supabase = await criarClienteServidor();

  const novo = id === "novo";

  const [{ data: item }, { data: categorias }, { data: tags }] = await Promise.all([
    novo ? { data: null } : supabase.from("items").select("*, item_tags(tag_id, mode)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").eq("restaurant_id", restaurante.id).order("sort_order"),
    supabase.from("tags").select("*")
      .or(`restaurant_id.is.null,restaurant_id.eq.${restaurante.id}`).order("sort_order"),
  ]);

  if (!novo && !item) notFound();

  return (
    <EditorItem
      item={item}
      categorias={categorias ?? []}
      tags={tags ?? []}
      restaurante={restaurante}
    />
  );
}
