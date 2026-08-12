import Link from "next/link";
import { Plus } from "lucide-react";
import { restauranteAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export const metadata = { title: "Cardápios" };

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function PaginaCardapios() {
  const restaurante = (await restauranteAtual())!;
  const supabase = await criarClienteServidor();

  const { data: cardapios } = await supabase
    .from("menus")
    .select("*, menu_days(weekday, start_time, end_time), menu_items(id)")
    .eq("restaurant_id", restaurante.id)
    .order("sort_order");

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Publicação</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
            Cardápios
          </h1>
          <p className="mt-2 max-w-[52ch] text-[0.875rem] text-[var(--color-fumaca)]">
            Cada cardápio aparece nos dias que você marcar. O preço do prato pertence
            ao cardápio — o mesmo prato pode custar valores diferentes no almoço e no jantar.
          </p>
        </div>
        <Link href="/painel/cardapios/novo" className="btn btn-primario flex-none">
          <Plus className="h-4 w-4" /> Novo
        </Link>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {(cardapios ?? []).map((menu: any) => {
          const dias = new Set(menu.menu_days.map((d: any) => d.weekday));
          return (
            <Link key={menu.id} href={`/painel/cardapios/${menu.id}`}
              className="card-comanda p-4 hover:border-[var(--color-tinta)]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-[1.25rem] leading-tight">
                  {t(menu.name, restaurante.default_locale)}
                </h2>
                {!menu.is_active && (
                  <span className="eyebrow flex-none" style={{ color: "var(--color-brasa)" }}>
                    desativado
                  </span>
                )}
              </div>

              <p className="mt-1 font-[family-name:var(--font-numero)] text-[0.75rem] text-[var(--color-fumaca)]">
                {menu.menu_items.length} {menu.menu_items.length === 1 ? "prato" : "pratos"}
              </p>

              <div className="mt-3 flex gap-1">
                {DIAS.map((dia, i) => (
                  <span key={dia}
                    className="flex h-6 w-7 items-center justify-center rounded-[3px] font-[family-name:var(--font-numero)] text-[0.625rem] uppercase"
                    style={dias.has(i)
                      ? { background: "var(--color-petroleo)", color: "var(--color-papel)" }
                      : { background: "var(--color-papel-alt)", color: "var(--color-fumaca)" }}>
                    {dia.slice(0, 1)}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {!cardapios?.length && (
        <div className="card-comanda mt-7 px-6 py-14 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[1.375rem]">
            Nenhum cardápio ainda
          </h2>
          <p className="mt-1.5 text-[0.875rem] text-[var(--color-fumaca)]">
            Crie um cardápio e escolha os dias em que ele aparece.
          </p>
          <Link href="/painel/cardapios/novo" className="btn btn-primario mt-5">Criar cardápio</Link>
        </div>
      )}
    </>
  );
}
