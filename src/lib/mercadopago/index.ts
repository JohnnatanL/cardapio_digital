/**
 * Mercado Pago — assinaturas (preapproval).
 * PENDÊNCIA: criar os planos no painel do MP e colar os IDs no .env.
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/landing
 */

const BASE = "https://api.mercadopago.com";

function token() {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return t;
}

export const PLANOS_MP: Record<string, string | undefined> = {
  essencial: process.env.MP_PLAN_ESSENCIAL,
  pro: process.env.MP_PLAN_PRO,
};

export async function criarAssinatura(params: {
  planCode: string;
  email: string;
  restaurantId: string;
  urlRetorno: string;
}) {
  const planId = PLANOS_MP[params.planCode];
  if (!planId) throw new Error(`Plano ${params.planCode} sem preapproval_plan_id`);

  const res = await fetch(`${BASE}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      // Idempotência: reenvio de request não gera assinatura duplicada
      "X-Idempotency-Key": `${params.restaurantId}:${params.planCode}`,
    },
    body: JSON.stringify({
      preapproval_plan_id: planId,
      payer_email: params.email,
      back_url: params.urlRetorno,
      external_reference: params.restaurantId, // amarra a assinatura ao tenant
      status: "pending",
    }),
  });

  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ id: string; init_point: string; status: string }>;
}

export async function buscarAssinatura(preapprovalId: string) {
  const res = await fetch(`${BASE}/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}`);
  return res.json();
}

export async function cancelarAssinatura(preapprovalId: string) {
  const res = await fetch(`${BASE}/preapproval/${preapprovalId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}`);
  return res.json();
}

/** Status do MP -> status da nossa tabela subscriptions. */
export function mapearStatus(mp: string) {
  switch (mp) {
    case "authorized": return "active";
    case "pending":    return "incomplete";
    case "paused":     return "past_due";
    case "cancelled":  return "canceled";
    default:           return "incomplete";
  }
}
