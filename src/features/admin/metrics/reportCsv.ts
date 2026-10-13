import type { Kpi, MetricsMeta, MetricsRange } from '@/types/admin-metrics.types'

export type Cell = string | number | null | undefined

export interface ReportBlock {
  title: string
  headers: string[]
  rows: Cell[][]
}

const RANGE_LABEL: Record<MetricsRange, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '12m': 'Last 12 months' }

const round1 = (v: number) => Math.round(v * 10) / 10
const isoDay = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s)

/** One CSV cell. Text that starts with = + - @ is prefixed so Excel doesn't run it as a formula. */
function cell(v: Cell): string {
  if (v == null) return ''
  let s: string
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ''
    s = String(round1(v))
  } else {
    s = /^[=+\-@]/.test(v) ? `'${v}` : v
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const line = (cells: Cell[]) => cells.map(cell).join(',')

export function periodLabel(meta: MetricsMeta) {
  const dates = meta.from && meta.to ? ` (${isoDay(meta.from)} to ${isoDay(meta.to)})` : ''
  return `${RANGE_LABEL[meta.range]}${dates}`
}

/**
 * A readable, spreadsheet-ready report: a short header with period and country,
 * then one titled table per section, separated by a blank line.
 */
export function buildReportCsv(opts: { title: string; period: string; country: string; blocks: ReportBlock[] }): string {
  const generated = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  const lines: string[] = [
    line(['GG’APP admin report', opts.title]),
    line(['Period', opts.period]),
    line(['Country', opts.country]),
    line(['Generated', generated]),
  ]
  for (const b of opts.blocks) {
    lines.push('', line([b.title]), line(b.headers))
    if (b.rows.length === 0) lines.push(line(['No data for this period']))
    else lines.push(...b.rows.map(line))
  }
  // The BOM tells Excel the file is UTF-8, so names and symbols such as KSh and Z$ display correctly.
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function reportFilename(page: string, meta: MetricsMeta) {
  return `ggapp-${page}-${meta.country}-${meta.range}-${new Date().toISOString().slice(0, 10)}.csv`
}

export function rowsBlock<T>(title: string, headers: string[], items: T[], toRow: (item: T) => Cell[]): ReportBlock {
  return { title, headers, rows: items.map(toRow) }
}

export function nameValueBlock(title: string, items: Array<{ name: string; value: number }>, nameHeader: string, valueHeader: string): ReportBlock {
  return rowsBlock(title, [nameHeader, valueHeader], items, i => [i.name, i.value])
}

/** Headline figures with their previous-period value. Change is in the same unit (percentage points for %). */
export function kpiBlock(kpis: Kpi[], moneyUnit: string): ReportBlock {
  const unit = (k: Kpi) => (k.format === 'money' ? moneyUnit || 'money' : k.format === 'percent' ? '%' : k.format === 'hours' ? 'hours' : 'count')
  return rowsBlock('Key figures', ['Figure', 'Value', 'Unit', 'Previous period', 'Change vs previous period'], kpis, k => [
    k.label,
    k.value,
    unit(k),
    k.previous,
    k.value != null && k.previous != null ? k.value - k.previous : null,
  ])
}
