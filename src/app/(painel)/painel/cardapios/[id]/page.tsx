import { notFound } from "next/navigation";
import { restauranteAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { EditorCardapio } from "@/components/painel/EditorCardapio";

export const metadata = { title: "Editar cardápio" };

export default async function PaginaEditarCardapio(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const restaurante = (await restauranteAtual())!;
  const supabase = await criarClienteServidor();
  const novo = id === "novo";

  const [{ data: menu }, { data: itens }] = await Promise.all([
    novo ? { data: null } : supabase.from("menus")
      .select("*, menu_days(*), menu_items(id, item_id, price, sort_order)")
      .eq("id", id).maybeSingle(),
    supabase.from("items").select("id, name, base_price")
      .eq("restaurant_id", restaurante.id).order("sort_order"),
  ]);

  if (!novo && !menu) notFound();

  return <EditorCardapio menu={menu} itens={itens ?? []} restaurante={restaurante} />;
}
