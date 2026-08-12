import { restauranteAtual, assinaturaAtual } from "@/lib/supabase/queries";
import { criarClienteServidor } from "@/lib/supabase/server";
import { EscolherPlano } from "@/components/painel/EscolherPlano";
import { centavosParaReais } from "@/lib/utils";

export const metadata = { title: "Assinatura" };

const ROTULO_STATUS: Record<string, string> = {
  trialing: "Em teste", active: "Ativa", past_due: "Pagamento pendente",
  canceled: "Cancelada", incomplete: "Aguardando pagamento",
};

export default async function PaginaAssinatura() {
  const restaurante = (await restauranteAtual())!;
  const assinatura: any = await assinaturaAtual(restaurante.id);
  const supabase = await criarClienteServidor();

  const { data: planos } = await supabase
    .from("plans").select("*").eq("is_public", true).order("sort_order");

  return (
    <>
      <p className="eyebrow">Conta</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[2rem] leading-none">
        Assinatura
      </h1>

      {assinatura && (
        <div className="card-comanda mt-6 max-w-md p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-[family-name:var(--font-display)] text-[1.25rem]">
              {assinatura.plans?.name}
            </span>
            <span className="eyebrow">{ROTULO_STATUS[assinatura.status] ?? assinatura.status}</span>
          </div>
          <p className="mt-1 font-[family-name:var(--font-numero)] text-[0.875rem] tabular-nums">
            {centavosParaReais(assinatura.plans?.price_cents ?? 0)}/mês
          </p>
          {assinatura.current_period_end && (
            <p className="mt-2 text-[0.75rem] text-[var(--color-fumaca)]">
              {assinatura.cancel_at_period_end ? "Acesso até " : "Próxima cobrança em "}
              {new Date(assinatura.current_period_end).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      )}

      <EscolherPlano
        planos={planos ?? []}
        atual={assinatura?.plans?.code}
        restauranteId={restaurante.id}
      />

      <p className="mt-8 max-w-[56ch] text-[0.75rem] leading-relaxed text-[var(--color-fumaca)]">
        {/* PENDÊNCIA: escrever a política de cancelamento e reembolso */}
        O cancelamento vale até o fim do período já pago. Depois disso o cardápio sai
        do ar, mas seus dados continuam guardados caso você volte.
      </p>
    </>
  );
}
