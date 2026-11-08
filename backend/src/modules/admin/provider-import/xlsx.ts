import { BadRequestException } from '@nestjs/common'
import { type CellValue, Workbook } from 'exceljs'
import type { SheetTable } from './csv'

/** Text of one cell. Rich text, hyperlinks and formula results become plain trimmed text. */
export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map(part => part.text).join('').trim()
    if ('hyperlink' in value) return String(value.text || value.hyperlink).trim()
    if ('formula' in value || 'sharedFormula' in value) return cellText(value.result)
    return ''
  }
  return String(value).trim()
}

/** exceljs declares its own global Buffer type, which the Node Buffer type does not match, hence the cast. */
type ExcelBuffer = Parameters<Workbook['xlsx']['load']>[0]

/** Reads the first worksheet: row 1 is the header, every later non-blank row is data. */
export async function readXlsxTable(buffer: Buffer): Promise<SheetTable> {
  const workbook = new Workbook()
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelBuffer)
  } catch {
    throw new BadRequestException('Could not read the Excel file. Save it as .xlsx, or upload the CSV instead.')
  }
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new BadRequestException('The Excel file has no worksheet')
  const width = sheet.columnCount
  const headerRow = sheet.getRow(1)
  const headers = Array.from({ length: width }, (_, i) => cellText(headerRow.getCell(i + 1).value))
  const rows: SheetTable['rows'] = []
  sheet.eachRow((row, record) => {
    if (record === 1) return
    const values = Array.from({ length: width }, (_, i) => cellText(row.getCell(i + 1).value))
    if (values.some(Boolean)) rows.push({ record, values })
  })
  return { headers, rows }
}
