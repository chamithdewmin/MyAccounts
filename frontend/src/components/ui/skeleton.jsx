import React from 'react';

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-secondary/60 ${className}`} />
);

export const SkeletonRows = ({ rows = 5, cols = 1 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((__, j) => (
          <Skeleton key={j} className="h-12" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 6, cols = 5 }) => (
  <div className="space-y-0 rounded-xl border border-border overflow-hidden">
    {/* header */}
    <div className="flex gap-3 px-4 py-3 bg-secondary/40">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1 bg-secondary" />
      ))}
    </div>
    {/* rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3 px-4 py-3 border-t border-border">
        {Array.from({ length: cols }).map((__, j) => (
          <Skeleton key={j} className="h-4 flex-1" style={{ opacity: 1 - i * 0.1 }} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`rounded-xl border border-border p-4 space-y-3 ${className}`}>
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-3 w-full" />
  </div>
);
