import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cx } from './cx';
import { EmptyState, Skeleton } from './States';

// columns: [{ key, label, render?(row), sortable?, align?, width? }]
// sort: { key, dir: 'asc' | 'desc' } · onSort(key) · selected: Set of row keys · onSelect(key | 'all')
// On phones (stack) each row becomes a card that labels its cells with the column names.
export default function Table({
  columns, rows, rowKey = (r) => r.id, sort, onSort, selected, onSelect, onRowClick,
  density = 'comfortable', stack = true, loading = false, empty, caption, selectLabel = 'تحديد', selectAllLabel = 'تحديد الكل'
}) {
  const selectable = Boolean(onSelect);
  const allOn = selectable && rows.length > 0 && rows.every((r) => selected?.has(rowKey(r)));
  if (!loading && rows.length === 0 && empty) return <div className="ui-table-wrap">{empty}</div>;
  return (
    <div className="ui-table-wrap">
      <table className={cx('ui-table', density === 'compact' && 'ui-table--compact', stack && 'ui-table--stack')}>
        {caption && <caption className="ui-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {selectable && (
              <th className="ui-table__check" scope="col">
                <input type="checkbox" aria-label={selectAllLabel} checked={allOn} onChange={() => onSelect('all')} />
              </th>
            )}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              const SortIcon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)}>
                      {c.label}
                      <SortIcon size={12} aria-hidden="true" />
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
              <tr key={`sk${i}`}>
                {selectable && <td className="ui-table__check" />}
                {columns.map((c) => <td key={c.key} data-label={c.label}><Skeleton width="70%" height={12} /></td>)}
              </tr>
            ))
            : rows.map((r) => {
              const k = rowKey(r);
              const on = selected?.has(k) || false;
              return (
                <tr
                  key={k}
                  aria-selected={selectable ? on : undefined}
                  className={onRowClick ? 'ui-table__row--click' : undefined}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                >
                  {selectable && (
                    <td className="ui-table__check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={selectLabel} checked={on} onChange={() => onSelect(k)} />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.label} style={c.align ? { textAlign: c.align } : undefined}>
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export function TableEmpty(props) {
  return <EmptyState {...props} />;
}
