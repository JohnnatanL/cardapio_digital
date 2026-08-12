import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarAssinatura } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  const { planCode, restaurantId } = await request.json();

  // Confere que o usuário manda mesmo nesse restaurante — nunca confie no body
  const { data: membro } = await supabase
    .from("memberships").select("role")
    .eq("restaurant_id", restaurantId).eq("user_id", user.id).maybeSingle();

  if (!membro || !["owner", "admin"].includes(membro.role)) {
    return NextResponse.json({ erro: "sem permissão" }, { status: 403 });
  }

  try {
    const assinatura = await criarAssinatura({
      planCode,
      email: user.email!,
      restaurantId,
      urlRetorno: `${process.env.NEXT_PUBLIC_SITE_URL}/painel/assinatura?retorno=1`,
    });
    return NextResponse.json({ url: assinatura.init_point });
  } catch (e) {
    console.error("checkout", e);
    return NextResponse.json({ erro: "falha ao criar assinatura" }, { status: 502 });
  }
}
