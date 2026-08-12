import Link from "next/link";

/**
 * Faixa de estado da assinatura.
 * Só aparece quando há algo a fazer — banner permanente vira ruído e a
 * pessoa para de ler.
 */
export function AvisoAssinatura({ assinatura, publicado }: { assinatura: any; publicado: boolean }) {
  if (!assinatura) return null;

  const { status, trial_ends_at, plans } = assinatura;

  if (status === "trialing" && trial_ends_at) {
    const dias = Math.ceil((new Date(trial_ends_at).getTime() - Date.now()) / 86400000);
    if (dias < 0) return null;
    return (
      <Faixa cor="var(--color-mostarda)">
        <span>
          {dias === 0 ? "Seu teste termina hoje." : `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} de teste.`}{" "}
          {!publicado && "Assine para publicar o cardápio."}
        </span>
        <Link href="/painel/assinatura" className="font-medium underline underline-offset-4">
          Escolher plano
        </Link>
      </Faixa>
    );
  }

  if (status === "past_due") {
    return (
      <Faixa cor="var(--color-brasa)" texto="var(--color-papel)">
        <span>O pagamento não passou e o cardápio saiu do ar.</span>
        <Link href="/painel/assinatura" className="font-medium underline underline-offset-4">
          Atualizar pagamento
        </Link>
      </Faixa>
    );
  }

  if (status === "canceled") {
    return (
      <Faixa cor="var(--color-brasa)" texto="var(--color-papel)">
        <span>Assinatura cancelada. O cardápio não está acessível.</span>
        <Link href="/painel/assinatura" className="font-medium underline underline-offset-4">
          Reativar
        </Link>
      </Faixa>
    );
  }

  if (status === "active" && !publicado) {
    return (
      <Faixa cor="var(--color-musgo)" texto="var(--color-papel)">
        <span>Tudo pronto. Seu cardápio ainda não está no ar.</span>
        <Link href="/painel/config" className="font-medium underline underline-offset-4">
          Publicar
        </Link>
      </Faixa>
    );
  }

  return null;
}

function Faixa({ children, cor, texto = "var(--color-tinta)" }: {
  children: React.ReactNode; cor: string; texto?: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-[0.8125rem] lg:px-10"
      style={{ background: cor, color: texto }}
    >
      {children}
    </div>
  );
}
