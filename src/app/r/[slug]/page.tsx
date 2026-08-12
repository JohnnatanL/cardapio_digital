import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { criarClienteAnonimo } from "@/lib/supabase/server";
import { Cardapio } from "@/components/menu/Cardapio";
import { t } from "@/lib/i18n";
import type { PublicMenuPayload } from "@/types/database";

// ISR: HTML estático, regerado sob demanda pelo trigger do Postgres.
// O `revalidate` alto é só rede de segurança — a invalidação real é por tag.
export const revalidate = 86400;
export const dynamicParams = true;

export async function buscarCardapio(slug: string, menuSlug?: string) {
  const supabase = criarClienteAnonimo();
  const { data, error } = await supabase.rpc("get_public_menu", {
    p_slug: slug,
    p_menu_slug: menuSlug ?? null,
  });
  if (error || !data) return null;
  return data as PublicMenuPayload;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const payload = await buscarCardapio(slug);
  if (!payload) return { title: "Cardápio não encontrado" };

  const r = payload.restaurant;
  return {
    title: `${r.name} — Cardápio`,
    description: r.description ?? `Cardápio de ${r.name}. Preços atualizados.`,
    alternates: {
      canonical: `/r/${r.slug}`,
      languages: Object.fromEntries(
        r.locales.map((l) => [l, l === r.default_locale ? `/r/${r.slug}` : `/r/${r.slug}/${l}`]),
      ),
    },
    openGraph: {
      title: r.name,
      description: r.description ?? "",
      images: r.cover_url ? [r.cover_url] : [],
      type: "website",
    },
  };
}

export default async function PaginaCardapio(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const payload = await buscarCardapio(slug);
  if (!payload) notFound();

  return (
    <>
      <SchemaMenu payload={payload} />
      <Cardapio payload={payload} locale={payload.restaurant.default_locale} />
    </>
  );
}

/** schema.org: faz o cardápio aparecer direto no resultado do Google. */
export function SchemaMenu({ payload }: { payload: PublicMenuPayload }) {
  const r = payload.restaurant;
  const locale = r.default_locale;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.name,
    description: r.description ?? undefined,
    image: r.cover_url ?? undefined,
    telephone: r.phone ?? undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/r/${r.slug}`,
    hasMenu: payload.menus.map((m) => ({
      "@type": "Menu",
      name: t(m.name, locale),
      hasMenuSection: payload.categories.map((c) => ({
        "@type": "MenuSection",
        name: t(c.name, locale),
        hasMenuItem: m.items
          .filter((i) => i.category_id === c.id)
          .map((i) => ({
            "@type": "MenuItem",
            name: t(i.name, locale),
            description: t(i.description, locale) || undefined,
            offers: { "@type": "Offer", price: i.price, priceCurrency: r.currency },
          })),
      })).filter((s) => s.hasMenuItem.length > 0),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
