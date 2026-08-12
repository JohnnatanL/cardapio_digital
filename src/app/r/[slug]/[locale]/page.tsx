import { notFound } from "next/navigation";
import { Cardapio } from "@/components/menu/Cardapio";
import { buscarCardapio, SchemaMenu } from "../page";

export const revalidate = 86400;

export default async function CardapioEmOutroIdioma(
  { params }: { params: Promise<{ slug: string; locale: string }> },
) {
  const { slug, locale } = await params;
  const payload = await buscarCardapio(slug);
  if (!payload) notFound();
  if (!payload.restaurant.locales.includes(locale)) notFound();

  return (
    <>
      <SchemaMenu payload={payload} />
      <Cardapio payload={payload} locale={locale} />
    </>
  );
}
