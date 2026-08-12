import Link from "next/link";
import { restauranteAtual, assinaturaAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export const metadata = { title: "Relatórios" };

export default async function PaginaAnalytics() {
  const restaurante = (await restauranteAtual())!;
  const assinatura = await assinaturaAtual(restaurante.id);
  const liberado = (assinatura as any)?.plans?.features?.analytics === true;

  if (!liberado) {
    return (
      <div className="card-comanda mx-auto max-w-md px-6 py-14 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[1.5rem]">
          Relatórios ficam no plano Essencial
        </h1>
        <p className="mt-2 text-[0.875rem] text-[var(--color-fumaca)]">
          Veja quais pratos seus clientes mais olham, em que horário o cardápio é mais
          consultado e quais restrições alimentares eles mais filtram.
        </p>
        <Link href="/painel/assinatura" className="btn btn-primario mt-5">Ver planos</Link>
      </div>
    );
  }

  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("analytics_summary", {
    p_restaurant: restaurante.id, p_days: 30,
  });
  const r = (data ?? {}) as any;

  return (
    <>
      <p className="eyebrow">Últimos 30 dias</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
        Relatórios
      </h1>

      <p className="mt-6 font-[family-name:var(--font-numero)] text-[3rem] leading-none tabular-nums">
        {r.total_visitas ?? 0}
      </p>
      <p className="text-[0.8125rem] text-[var(--color-fumaca)]">
        {r.total_visitas === 1 ? "visita ao cardápio" : "visitas ao cardápio"}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <Bloco titulo="Pratos mais vistos" vazio="Sem dados ainda.">
          {(r.itens_mais_vistos ?? []).map((linha: any) => (
            <li key={linha.id} className="flex items-baseline gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[0.875rem]">
                {t(linha.name, restaurante.default_locale)}
              </span>
              <span className="leader-fill" />
              <span className="font-[family-name:var(--font-numero)] text-[0.8125rem] tabular-nums">
                {linha.views}
              </span>
            </li>
          ))}
        </Bloco>

        <Bloco
          titulo="Restrições que seus clientes filtram"
          vazio="Ninguém usou o filtro ainda."
          nota="Essa é a métrica mais acionável do painel: se muita gente filtra sem glúten e você tem poucas opções, ali tem prato para vender."
        >
          {(r.filtros_usados ?? []).map((linha: any) => (
            <li key={linha.tag} className="flex items-baseline gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[0.875rem]">{linha.tag}</span>
              <span className="leader-fill" />
              <span className="font-[family-name:var(--font-numero)] text-[0.8125rem] tabular-nums">
                {linha.usos}
              </span>
            </li>
          ))}
        </Bloco>

        <Bloco titulo="Horários de maior consulta" vazio="Sem dados ainda.">
          {(r.por_hora ?? []).map((linha: any) => (
            <li key={linha.hora} className="flex items-center gap-2 py-1">
              <span className="w-10 font-[family-name:var(--font-numero)] text-[0.75rem] tabular-nums text-[var(--color-fumaca)]">
                {String(linha.hora).padStart(2, "0")}h
              </span>
              <span
                className="h-2.5 rounded-[1px]"
                style={{
                  background: "var(--color-petroleo)",
                  width: `${Math.max(4, (linha.visitas / Math.max(...(r.por_hora ?? [{ visitas: 1 }]).map((x: any) => x.visitas))) * 100)}%`,
                }}
              />
              <span className="font-[family-name:var(--font-numero)] text-[0.75rem] tabular-nums">
                {linha.visitas}
              </span>
            </li>
          ))}
        </Bloco>

        <Bloco titulo="Mesas mais ativas" vazio="Cadastre mesas para ver esse dado.">
          {(r.mesas_mais_ativas ?? []).map((linha: any) => (
            <li key={linha.label} className="flex items-baseline gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[0.875rem]">{linha.label}</span>
              <span className="leader-fill" />
              <span className="font-[family-name:var(--font-numero)] text-[0.8125rem] tabular-nums">
                {linha.scans}
              </span>
            </li>
          ))}
        </Bloco>
      </div>
    </>
  );
}

function Bloco({ titulo, children, vazio, nota }: any) {
  const temConteudo = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section>
      <h2 className="eyebrow">{titulo}</h2>
      <div className="regua mt-2" />
      {temConteudo ? (
        <ul className="mt-2">{children}</ul>
      ) : (
        <p className="mt-3 text-[0.8125rem] text-[var(--color-fumaca)]">{vazio}</p>
      )}
      {nota && temConteudo && (
        <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--color-fumaca)]">{nota}</p>
      )}
    </section>
  );
}
