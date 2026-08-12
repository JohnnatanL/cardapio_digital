import { NextResponse } from "next/server";
import { criarClienteAnonimo } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { formatarPreco } from "@/lib/utils";
import type { PublicMenuPayload } from "@/types/database";

/**
 * Cardápio em A4 para impressão.
 *
 * Devolve HTML com @page e não PDF binário: o navegador imprime em PDF nativo,
 * fica fiel à tipografia do cardápio e evita carregar Puppeteer num serverless.
 * PENDÊNCIA: se precisar de PDF binário mesmo (envio por e-mail, por exemplo),
 * trocar por @react-pdf/renderer.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = criarClienteAnonimo();
  const { data } = await supabase.rpc("get_public_menu", { p_slug: slug, p_menu_slug: null });
  if (!data) return new NextResponse("Cardápio não encontrado", { status: 404 });

  const payload = data as PublicMenuPayload;
  const r = payload.restaurant;
  const locale = r.default_locale;

  const secoes = payload.menus.map((menu) => {
    const grupos = payload.categories
      .map((cat) => ({
        titulo: t(cat.name, locale),
        itens: menu.items.filter((i) => i.category_id === cat.id),
      }))
      .filter((g) => g.itens.length);

    return `
      <section class="cardapio">
        <h2>${escapar(t(menu.name, locale))}</h2>
        ${grupos.map((g) => `
          <h3>${escapar(g.titulo)}</h3>
          <ul>
            ${g.itens.map((item) => `
              <li>
                <div class="linha">
                  <span class="nome">${escapar(t(item.name, locale))}</span>
                  <span class="pontos"></span>
                  <span class="preco">${formatarPreco(item.price, r.currency, locale)}</span>
                </div>
                ${item.description ? `<p class="desc">${escapar(t(item.description, locale))}</p>` : ""}
              </li>`).join("")}
          </ul>`).join("")}
      </section>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="${locale}"><head><meta charset="utf-8">
<title>${escapar(r.name)} — Cardápio</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter+Tight:wght@400;500&family=DM+Mono&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Inter Tight", sans-serif; color: #10201F; font-size: 10.5pt; line-height: 1.45; margin: 0; }
  header { text-align: center; border-bottom: 2px solid #10201F; padding-bottom: 8mm; margin-bottom: 8mm; }
  h1 { font-family: "Instrument Serif", serif; font-size: 26pt; margin: 0; font-weight: 400; }
  header p { margin: 2mm 0 0; font-size: 9pt; color: #6B7772; }
  h2 { font-family: "Instrument Serif", serif; font-size: 17pt; font-weight: 400; margin: 7mm 0 3mm; }
  h3 { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .14em; color: #6B7772;
       font-family: "DM Mono", monospace; font-weight: 400; margin: 5mm 0 2mm; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { margin-bottom: 3mm; break-inside: avoid; }
  .linha { display: flex; align-items: baseline; gap: 2mm; }
  .nome { font-weight: 500; }
  .pontos { flex: 1; border-bottom: 1px dotted #C9D0C7; transform: translateY(-.28em); }
  .preco { font-family: "DM Mono", monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .desc { margin: .5mm 0 0; font-size: 8.5pt; color: #6B7772; max-width: 78%; }
  footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #C9D0C7;
           font-size: 7.5pt; color: #6B7772; }
  .cardapio { break-inside: avoid-page; }
  @media screen { body { max-width: 190mm; margin: 20px auto; padding: 0 16px; } }
</style></head>
<body>
  <header>
    <h1>${escapar(r.name)}</h1>
    ${r.description ? `<p>${escapar(r.description)}</p>` : ""}
  </header>
  ${secoes}
  <footer>
    ${r.service_fee_percent ? `Taxa de serviço de ${r.service_fee_percent}% (opcional). ` : ""}
    ${escapar(r.allergen_disclaimer)}
    <br>Atualizado em ${new Date().toLocaleDateString("pt-BR")}.
  </footer>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapar(s: string) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
