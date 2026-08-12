import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { buscarAssinatura, mapearStatus } from "@/lib/mercadopago";

/**
 * Webhook de assinatura do Mercado Pago.
 *
 * Três regras que evitam dor de cabeça:
 * 1. Grava o payload cru em billing_events ANTES de processar. Se der errado,
 *    você tem o rastro e pode reprocessar.
 * 2. Idempotência pela unique (provider, event_id): o MP reenvia o mesmo evento
 *    várias vezes e isso é normal.
 * 3. Nunca confia no corpo da notificação — busca o estado real na API do MP.
 */
export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null);
  if (!corpo) return NextResponse.json({ ok: true });

  // PENDÊNCIA: validar a assinatura HMAC do header x-signature usando
  // MERCADOPAGO_WEBHOOK_SECRET antes de processar. Hoje o endpoint aceita
  // qualquer POST bem formado.

  const supabase = criarClienteAdmin();
  const eventId = String(corpo.id ?? corpo.data?.id ?? crypto.randomUUID());

  const { error: erroLog } = await supabase.from("billing_events").insert({
    provider: "mercadopago",
    event_id: eventId,
    event_type: corpo.type ?? corpo.action ?? "desconhecido",
    payload: corpo,
  });

  // Já processamos esse evento antes: responde 200 e sai.
  if (erroLog?.code === "23505") return NextResponse.json({ ok: true, duplicado: true });

  const preapprovalId = corpo.data?.id;
  if (!preapprovalId) return NextResponse.json({ ok: true });

  try {
    const assinatura = await buscarAssinatura(preapprovalId);
    const restaurantId = assinatura.external_reference;
    if (!restaurantId) throw new Error("external_reference ausente");

    const status = mapearStatus(assinatura.status);
    const proximaCobranca = assinatura.next_payment_date ?? null;

    await supabase.from("subscriptions").update({
      status,
      provider_subscription_id: preapprovalId,
      current_period_end: proximaCobranca,
      canceled_at: status === "canceled" ? new Date().toISOString() : null,
    }).eq("restaurant_id", restaurantId);

    // Assinatura caiu: tira o cardápio do ar. O RLS já bloquearia a leitura,
    // mas deixar is_published coerente evita confusão no painel.
    if (["canceled", "past_due"].includes(status)) {
      await supabase.from("restaurants").update({ is_published: false }).eq("id", restaurantId);
    }

    await supabase.from("billing_events")
      .update({ processed_at: new Date().toISOString(), restaurant_id: restaurantId })
      .eq("provider", "mercadopago").eq("event_id", eventId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await supabase.from("billing_events")
      .update({ error: String(e?.message ?? e) })
      .eq("provider", "mercadopago").eq("event_id", eventId);

    // 200 de propósito: o MP reenviaria em loop e o rastro já está salvo.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
