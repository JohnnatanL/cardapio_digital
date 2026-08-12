import { restauranteAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GerenciarMesas } from "@/components/painel/GerenciarMesas";

export const metadata = { title: "Mesas e QR" };

export default async function PaginaMesas() {
  const restaurante = (await restauranteAtual())!;
  const supabase = await criarClienteServidor();

  const [{ data: mesas }, { data: cardapios }] = await Promise.all([
    supabase.from("restaurant_tables").select("*")
      .eq("restaurant_id", restaurante.id).order("sort_order"),
    supabase.from("menus").select("id, name").eq("restaurant_id", restaurante.id),
  ]);

  return (
    <>
      <p className="eyebrow">Salão</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
        Mesas e QR
      </h1>
      <p className="mt-2 max-w-[56ch] text-[0.875rem] text-[var(--color-fumaca)]">
        Cada mesa tem um QR próprio e permanente. Imprima uma vez: o código não
        muda quando você mexe no cardápio.
      </p>

      <GerenciarMesas mesas={mesas ?? []} cardapios={cardapios ?? []} restaurante={restaurante} />
    </>
  );
}
