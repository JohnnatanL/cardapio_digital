import Link from "next/link";
import { UtensilsCrossed, BookOpen, QrCode, ArrowRight } from "lucide-react";
import { restauranteAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata = { title: "Painel" };

export default async function Painel() {
  const restaurante = (await restauranteAtual())!;
  const supabase = await criarClienteServidor();

  const [{ count: pratos }, { count: cardapios }, { count: mesas }, { data: esgotados }] =
    await Promise.all([
      supabase.from("items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurante.id),
      supabase.from("menus").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurante.id),
      supabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurante.id),
      supabase.from("items").select("id, name, unavailable_until, unavailable_reason")
        .eq("restaurant_id", restaurante.id).eq("is_available", false).limit(8),
    ]);

  return (
    <>
      <p className="eyebrow">Visão geral</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
        {restaurante.name}
      </h1>
      <p className="mt-1.5 font-[family-name:var(--font-numero)] text-[0.8125rem] text-[var(--color-fumaca)]">
        /r/{restaurante.slug}
        {!restaurante.is_published && " · ainda não publicado"}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Atalho href="/painel/itens" Icone={UtensilsCrossed} rotulo="Pratos" valor={pratos ?? 0} />
        <Atalho href="/painel/cardapios" Icone={BookOpen} rotulo="Cardápios" valor={cardapios ?? 0} />
        <Atalho href="/painel/mesas" Icone={QrCode} rotulo="Mesas" valor={mesas ?? 0} />
      </div>

      {esgotados && esgotados.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">Fora do cardápio agora</h2>
          <div className="regua mt-2" />
          <ul className="mt-3 space-y-1.5">
            {esgotados.map((item: any) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-[0.875rem]">
                <span>{item.name?.["pt-BR"] ?? Object.values(item.name ?? {})[0]}</span>
                <span className="text-[0.75rem] text-[var(--color-fumaca)]">
                  {item.unavailable_reason ?? "sem motivo informado"}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/painel/itens?filtro=esgotados" className="mt-3 inline-flex items-center gap-1 text-[0.8125rem] underline underline-offset-4">
            Gerenciar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}
    </>
  );
}

function Atalho({ href, Icone, rotulo, valor }: any) {
  return (
    <Link href={href} className="card-comanda flex items-center justify-between p-4 hover:border-[var(--color-tinta)]">
      <div>
        <Icone className="h-4 w-4 text-[var(--color-fumaca)]" strokeWidth={1.75} />
        <p className="mt-2 text-[0.8125rem] text-[var(--color-fumaca)]">{rotulo}</p>
      </div>
      <span className="font-[family-name:var(--font-numero)] text-[1.75rem] tabular-nums">{valor}</span>
    </Link>
  );
}
