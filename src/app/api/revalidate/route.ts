import { revalidateTag, revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Chamado pelo trigger `notify_revalidate` do Postgres via pg_net.
 * É o que faz o cache eterno funcionar: em vez de expirar por tempo, o HTML
 * só regenera quando alguém realmente muda alguma coisa.
 */
export async function POST(request: NextRequest) {
  const segredo = request.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || segredo !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const { slug, tag } = await request.json().catch(() => ({}));
  if (!slug) return NextResponse.json({ erro: "slug ausente" }, { status: 400 });

  if (tag) revalidateTag(tag);
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/r/${slug}/[locale]`, "page");

  return NextResponse.json({ ok: true, slug, em: new Date().toISOString() });
}
