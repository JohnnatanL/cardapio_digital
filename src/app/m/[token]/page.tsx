import { notFound } from "next/navigation";
import { criarClienteAnonimo } from "@/lib/supabase/server";
import { Cardapio } from "@/components/menu/Cardapio";
import { buscarCardapio } from "../../r/[slug]/page";

// Dinâmico de propósito: cada mesa é um token diferente e a resolução
// precisa validar assinatura ativa na hora.
export const dynamic = "force-dynamic";

export default async function EntradaQR(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = criarClienteAnonimo();

  const { data } = await supabase.rpc("resolve_table_qr", { token });
  const mesa = Array.isArray(data) ? data[0] : data;
  if (!mesa) notFound();

  const payload = await buscarCardapio(mesa.restaurant_slug, mesa.menu_slug ?? undefined);
  if (!payload) notFound();

  return (
    <Cardapio
      payload={payload}
      locale={payload.restaurant.default_locale}
      mesa={{ id: mesa.table_id, label: mesa.table_label }}
    />
  );
}
