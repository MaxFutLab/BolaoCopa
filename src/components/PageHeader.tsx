type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-black text-emerald-950 sm:text-3xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}
