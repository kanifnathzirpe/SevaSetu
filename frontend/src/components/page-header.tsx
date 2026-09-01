import * as React from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl break-words">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs sm:text-sm text-[var(--muted-foreground)] break-words">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0 w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}
