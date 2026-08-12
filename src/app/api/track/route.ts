import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAnonimo } from "@/lib/supabase/server";

/**
 * Ingestão de analytics. Sem cookie, sem IP guardado, sem PII.
 * O session_hash é derivado de user-agent + dia e não identifica pessoa —
 * serve só para não contar a mesma sessão dez vezes.
 *
 * PENDÊNCIA: colocar rate limit aqui (Upstash Redis ou Vercel KV). Sem isso,
 * um script simples enche a tabela de lixo e estraga o relatório do cliente.
 */

const TIPOS = new Set(["menu_view", "item_view", "filter_use", "qr_scan", "locale_switch"]);

export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null);
  if (!corpo?.eventos?.length) return NextResponse.json({ ok: true });

  const eventos = corpo.eventos.slice(0, 50); // teto por request
  const hash = await sessionHash(request);
  const supabase = criarClienteAnonimo();

  const linhas = eventos
    .filter((e: any) => TIPOS.has(e.tipo) && e.restaurantId)
    .map((e: any) => ({
      restaurant_id: e.restaurantId,
      menu_id: e.menuId ?? null,
      item_id: e.itemId ?? null,
      table_id: e.mesaId ?? null,
      event_type: e.tipo,
      locale: e.locale ?? null,
      session_hash: hash,
      meta: e.meta ?? {},
    }));

  if (linhas.length) await supabase.from("menu_events").insert(linhas);

  return NextResponse.json({ ok: true });
}

async function sessionHash(request: NextRequest) {
  const semente = [
    request.headers.get("user-agent") ?? "",
    new Date().toISOString().slice(0, 10),   // roda todo dia
  ].join("|");
  const bytes = new TextEncoder().encode(semente);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}
