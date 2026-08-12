import Link from "next/link";

export default function LayoutMarketing({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--color-risco)] bg-[var(--color-papel)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="font-[family-name:var(--font-display)] text-[1.25rem] leading-none">
            Comanda
          </Link>
          <nav className="flex items-center gap-1.5">
            <Link href="/#planos" className="btn btn-fantasma !hidden !border-transparent !px-3 !py-1.5 text-[0.875rem] sm:!inline-flex">
              Planos
            </Link>
            <Link href="/entrar" className="btn btn-fantasma !px-3 !py-1.5 text-[0.875rem]">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primario !px-3.5 !py-1.5 whitespace-nowrap text-[0.875rem]">
              Criar cardápio
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--color-risco)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[0.8125rem] text-[var(--color-fumaca)]">
          <p>Comanda · cardápio digital</p>
          <nav className="flex gap-5">
            {/* PENDÊNCIA: escrever as páginas de termos e privacidade */}
            <Link href="/termos">Termos</Link>
            <Link href="/privacidade">Privacidade</Link>
            {process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP && (
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP}`}>Suporte</a>
            )}
          </nav>
        </div>
      </footer>
    </>
  );
}
