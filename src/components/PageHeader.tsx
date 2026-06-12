type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="surface tech-panel mb-6 p-4 sm:p-6">
      <div className="relative grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        <div className="hidden h-16 w-16 place-items-center rounded-md border border-sky-100 bg-white/80 shadow-sm sm:grid">
          <div className="h-8 w-8 rounded-full border-4 border-sky-500 border-b-emerald-400" />
        </div>
      </div>
    </div>
  );
}
