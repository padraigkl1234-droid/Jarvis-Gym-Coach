import Link from 'next/link';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-sm uppercase tracking-[0.12em] text-black">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-white font-sans text-black">
      <header className="border-b-2 border-black px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-red-600" />
            <span className="font-display text-base uppercase tracking-[0.2em] text-black">Valoris</span>
          </Link>
          <Link href="/" className="font-display text-[10px] uppercase tracking-[0.2em] text-neutral-400 hover:text-red-600">
            Back to App
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <h1 className="font-display text-2xl uppercase tracking-[0.06em] text-black sm:text-3xl">{title}</h1>
        <p className="mt-1 font-display text-[10px] uppercase tracking-[0.2em] text-neutral-400">Last updated: {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-800">{children}</div>
      </main>
    </div>
  );
}
