"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed, BookOpen, QrCode, BarChart3, Settings,
  CreditCard, ExternalLink, Languages,
} from "lucide-react";

const LINKS = [
  { href: "/painel/itens", rotulo: "Pratos", Icone: UtensilsCrossed },
  { href: "/painel/cardapios", rotulo: "Cardápios", Icone: BookOpen },
  { href: "/painel/mesas", rotulo: "Mesas e QR", Icone: QrCode },
  { href: "/painel/analytics", rotulo: "Relatórios", Icone: BarChart3 },
  { href: "/painel/idiomas", rotulo: "Idiomas", Icone: Languages },
  { href: "/painel/assinatura", rotulo: "Assinatura", Icone: CreditCard },
  { href: "/painel/config", rotulo: "Ajustes", Icone: Settings },
];

export function NavPainel({ restaurante }: { restaurante: any }) {
  const caminho = usePathname();

  return (
    <>
      {/* Desktop: barra lateral */}
      <aside className="hidden w-60 flex-none border-r border-[var(--color-risco)] bg-white lg:block">
        <div className="px-5 py-5">
          <Link href="/painel" className="font-[family-name:var(--font-display)] text-[1.25rem] leading-none">
            Comanda
          </Link>
          <p className="mt-1 truncate text-[0.8125rem] text-[var(--color-fumaca)]">
            {restaurante.name}
          </p>
        </div>

        <nav className="px-2.5">
          {LINKS.map(({ href, rotulo, Icone }) => {
            const ativo = caminho.startsWith(href);
            return (
              <Link
                key={href} href={href}
                className={`flex items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-[0.875rem] ${
                  ativo ? "bg-[var(--color-petroleo)] text-[var(--color-papel)]" : "hover:bg-[var(--color-papel-alt)]"
                }`}
              >
                <Icone className="h-4 w-4" strokeWidth={1.75} />
                {rotulo}
              </Link>
            );
          })}
        </nav>

        {restaurante.is_published && (
          <a
            href={`/r/${restaurante.slug}`} target="_blank" rel="noreferrer"
            className="mx-2.5 mt-5 flex items-center gap-2 rounded-[4px] border border-[var(--color-risco)] px-2.5 py-2 text-[0.8125rem]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver cardápio
          </a>
        )}
      </aside>

      {/* Mobile: barra inferior — o dono usa isso durante o serviço, de pé */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-risco)] bg-white lg:hidden">
        {LINKS.slice(0, 5).map(({ href, rotulo, Icone }) => {
          const ativo = caminho.startsWith(href);
          return (
            <Link
              key={href} href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.625rem]"
              style={ativo ? { color: "var(--color-petroleo)" } : { color: "var(--color-fumaca)" }}
            >
              <Icone className="h-[18px] w-[18px]" strokeWidth={ativo ? 2.25 : 1.75} />
              {rotulo}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
