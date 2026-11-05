import type { ReactNode } from 'react'
import { C, font } from '@/design-system/tokens'

export interface InvoiceTableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'right'
  /** Fixed or minimum width, e.g. 140 or '18%'. */
  width?: number | string
  render: (row: T) => ReactNode
}

interface InvoiceTableProps<T> {
  columns: InvoiceTableColumn<T>[]
  rows: T[]
  getKey: (row: T) => string
  onRowClick?: (row: T) => void
  /** Accessible name for the table, e.g. "Invoices". */
  label: string
}

/** A plain, scannable invoice table shared by the patient and provider invoice lists. */
export function InvoiceTable<T>({ columns, rows, getKey, onRowClick, label }: InvoiceTableProps<T>) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table aria-label={label} style={{ width: '100%', borderCollapse: 'collapse', fontFamily: font.family, fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                scope="col"
                style={{
                  textAlign: column.align ?? 'left',
                  width: column.width,
                  padding: '12px 22px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textSub,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background: C.bg,
                  borderBottom: `1px solid ${C.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={getKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? event => { if (event.key === 'Enter') onRowClick(row) } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.12s' }}
              onMouseEnter={event => { if (onRowClick) event.currentTarget.style.background = C.bg }}
              onMouseLeave={event => { event.currentTarget.style.background = 'transparent' }}
            >
              {columns.map(column => (
                <td
                  key={column.key}
                  style={{
                    textAlign: column.align ?? 'left',
                    padding: '14px 22px',
                    color: C.text,
                    borderBottom: `1px solid ${C.border}`,
                    verticalAlign: 'middle',
                  }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
