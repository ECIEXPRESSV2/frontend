import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="grid gap-4 border-b border-gray-50 px-6 py-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((__, colIndex) => (
          <div key={colIndex} className="space-y-2">
            <div className="h-3 rounded-full bg-gray-100" />
            {colIndex === 0 && <div className="h-2 w-2/3 rounded-full bg-gray-100" />}
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="rounded-xl bg-white/70 p-4">
        <div className="mb-3 h-4 w-2/3 rounded-full bg-gray-100" />
        <div className="h-3 w-1/2 rounded-full bg-gray-100" />
      </div>
    ))}
  </div>
);
