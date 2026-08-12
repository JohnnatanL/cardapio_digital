import Link from "next/link";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="font-[family-name:var(--font-display)] text-[1.25rem]">
          Comanda
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
    </div>
  );
}
