import { NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * QR em SVG: vetor escala pra qualquer tamanho de impressão sem serrilhar.
 * Correção de erro nível Q suporta logo no meio e sobrevive a papel sujo,
 * que num salão de restaurante acontece.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/m/${token}`;

  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "Q",
    margin: 1,
    color: { dark: "#10201F", light: "#FFFFFF" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable", // token nunca muda
    },
  });
}
