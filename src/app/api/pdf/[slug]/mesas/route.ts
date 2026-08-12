import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Folha A4 de etiquetas QR, 3 colunas × 4 linhas, com marcas de corte.
 * Requer sessão: a lista de mesas não é pública.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await criarClienteServidor();

  const { data: restaurante } = await supabase
    .from("restaurants").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!restaurante) return new NextResponse("Não encontrado", { status: 404 });

  const { data: mesas } = await supabase
    .from("restaurant_tables").select("label, qr_token")
    .eq("restaurant_id", restaurante.id).eq("is_active", true).order("sort_order");

  if (!mesas?.length) return new NextResponse("Nenhuma mesa cadastrada", { status: 404 });

  const etiquetas = await Promise.all(
    mesas.map(async (mesa) => {
      const svg = await QRCode.toString(
        `${process.env.NEXT_PUBLIC_SITE_URL}/m/${mesa.qr_token}`,
        { type: "svg", errorCorrectionLevel: "Q", margin: 0, color: { dark: "#10201F", light: "#FFFFFF" } },
      );
      return `<div class="etiqueta">
        <div class="qr">${svg}</div>
        <p class="mesa">${escapar(mesa.label)}</p>
        <p class="casa">${escapar(restaurante.name)}</p>
        <p class="dica">Aponte a câmera para ver o cardápio</p>
      </div>`;
    }),
  );

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Etiquetas QR — ${escapar(restaurante.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter+Tight:wght@400;500&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: "Inter Tight", sans-serif; margin: 0; color: #10201F; }
  .folha { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
  .etiqueta {
    /* Marcas de corte: borda tracejada leve que some no recorte */
    border: 1px dashed #C9D0C7;
    padding: 6mm 4mm; text-align: center; break-inside: avoid;
    height: 62mm; display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .qr svg { width: 32mm; height: 32mm; display: block; }
  .mesa { font-family: "Instrument Serif", serif; font-size: 13pt; margin: 3mm 0 0; }
  .casa { font-size: 7.5pt; color: #6B7772; margin: .5mm 0 0; }
  .dica { font-size: 6.5pt; color: #6B7772; margin: 2mm 0 0; }
  @media screen { body { padding: 16px; } }
</style></head>
<body>
  <div class="folha">${etiquetas.join("")}</div>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 500));</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapar(s: string) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
