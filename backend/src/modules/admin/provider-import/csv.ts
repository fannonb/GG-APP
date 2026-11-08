export const PROVIDER_CSV_HEADERS = ['practiceName', 'email', 'emailSecondary', 'phone', 'country', 'serviceTypes', 'address', 'city', 'region', 'locationLabel', 'latitude', 'longitude', 'googleMapsUrl', 'licenseNumber', 'businessRegNumber', 'taxPin', 'credentialsJson', 'hoursJson', 'payoutMethod', 'accountNumber', 'accountName', 'bankName', 'bankBranch', 'payoutSummary']

/** A spreadsheet read into header names and data rows, whatever the file type. */
export interface SheetTable {
  /** Header cells, trimmed, in column order. */
  headers: string[]
  /** Data rows. `record` is the row number in the file (the header is row 1). */
  rows: Array<{ record: number; values: string[] }>
}

/** RFC 4180 fields, including escaped quotes, commas and newlines. Blank lines are skipped. */
export function parseCsvTable(input: string): SheetTable {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false; let closed = false
  const source = input.replace(/^\ufeff/, '').replace(/\r\n/g, '\n')
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else field += c
    } else if (c === ',' || c === '\n') {
      row.push(field.trim()); field = ''; closed = false
      if (c === '\n') { if (row.some(Boolean)) rows.push(row); row = [] }
    } else if (c === '"') {
      if (field || closed) throw new Error('Malformed CSV quote')
      quoted = true
    } else { if (closed && c.trim()) throw new Error('Unexpected text after closing quote'); field += c }
  }
  if (quoted) throw new Error('Unclosed CSV quote')
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row)
  const [headers = [], ...data] = rows
  return { headers, rows: data.map((values, index) => ({ record: index + 2, values })) }
}

/** Checks the provider template layout and keys each row by column name. */
export function templateRecords(table: SheetTable): Array<{ record: number; data: Record<string, string> }> {
  const { headers } = table
  if (new Set(headers).size !== headers.length) throw new Error('Duplicate CSV headers')
  if (headers.some(h => !PROVIDER_CSV_HEADERS.includes(h))) throw new Error('Unknown CSV columns. Download the template')
  for (const key of ['practiceName', 'email', 'phone', 'country', 'serviceTypes', 'address']) if (!headers.includes(key)) throw new Error(`Missing column: ${key}`)
  if (!table.rows.length || table.rows.length > 200) throw new Error('Import between 1 and 200 providers per file')
  return table.rows.map(({ record, values }) => {
    if (values.length !== headers.length) throw new Error(`Record ${record}: column count does not match the header`)
    return { record, data: Object.fromEntries(headers.map((h, i) => [h, values[i]])) }
  })
}
