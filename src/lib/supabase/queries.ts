import { cache } from "react";
import { criarClienteServidor } from "./server";

/** Restaurante ativo do usuário logado. Cacheado por request. */
export const restauranteAtual = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("memberships")
    .select("role, restaurants(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.restaurants) return null;
  return {
    ...(data.restaurants as any),
    _role: data.role as "owner" | "admin" | "staff",
    _user: user,
  };
});

export const assinaturaAtual = cache(async (restaurantId: string) => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  return data;
});
