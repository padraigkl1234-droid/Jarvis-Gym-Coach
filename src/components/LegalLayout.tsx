import Link from 'next/link';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[19px] text-ink">{title}</h2>
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
    <div className="min-h-[100dvh] bg-canvas font-sans text-ink">
      <header className="border-b border-line px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-clay" />
            <span className="text-[13px] font-extrabold tracking-[0.16em] text-ink">VALORIS</span>
          </Link>
          <Link href="/" className="text-[12px] font-bold text-faint hover:text-clay">
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <h1 className="font-display text-[30px] text-ink sm:text-[34px]">{title}</h1>
        <p className="eyebrow mt-2 !text-[10px]">Last updated: {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">{children}</div>
      </main>
    </div>
  );
}
