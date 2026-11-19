import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptySlot,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptySlot?: React.ReactNode;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    return [...data].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir, columns]);

  if (data.length === 0 && emptySlot) {
    return <>{emptySlot}</>;
  }

  const handleSort = (col: ColumnDef<T>) => {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  return (
    <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] overflow-hidden bw-surface-raised">
      {/* Desktop / Tablet horizontal-safe table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F5F5F4] border-b border-[#E6E6E2]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-[#686864] whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col)}
                      className="inline-flex items-center gap-1 hover:text-[#242424] cursor-pointer"
                    >
                      <span>{col.header}</span>
                      {sortKey === col.key &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-[#FF7417]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-[#FF7417]" />
                        ))}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E6E2]">
            {sorted.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${
                  onRowClick ? 'hover:bg-[#F5F5F4] cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-[#242424] align-middle ${
                      col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Responsive Mobile Card Adaptation */}
      <div className="md:hidden divide-y divide-[#E6E6E2]">
        {sorted.map((row) => (
          <div key={keyExtractor(row)} className="p-4 space-y-2.5 bg-[#FFFFFF]">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3">
                <span className="text-xs text-[#686864] shrink-0">{col.header}</span>
                <div className="text-sm text-[#242424] text-right">{col.render(row)}</div>
              </div>
            ))}
            {onRowClick && (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="w-full mt-2 py-2 text-xs font-medium text-[#C44D00] bg-[#FFF0E5] rounded-[8px] cursor-pointer"
              >
                Open Details
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
