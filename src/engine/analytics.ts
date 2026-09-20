import { parse, isValid, format } from 'date-fns'
import type { CategoryTotal, ReceiptRow } from './types'

export const parseReceiptDate = (value: string): Date | null => {
  const formats = ['dd/MM/yyyy HH:mm:ss', 'dd/MM/yyyy', 'yyyy-MM-dd']
  for (const pattern of formats) { const d = parse(value.trim(), pattern, new Date()); if (isValid(d)) return d }
  return null
}
export const parseCardDate = (value: string): Date | null => {
  const parsed = parse(value.trim(), 'M/d/yyyy H:mm', new Date())
  return isValid(parsed) ? parsed : null
}
export const realSkipMetric = (event: { reason_end?: string; ms_played?: number; skipped?: boolean }) =>
  event.reason_end?.toLowerCase() === 'fwdbtn' || (event.ms_played ?? 0) < 30_000 || event.skipped === true
export const dedupeByFields = <T extends Record<string, unknown>>(rows: T[], fields: (keyof T)[]) => {
  const seen = new Set<string>()
  return rows.filter(row => {
    const key = fields.map(field => String(row[field] ?? '')).join('\u001f')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
export const monthLabel = (value: string) => { const d = parseReceiptDate(value); return d ? format(d, 'MMM') : '—' }
export const sumExpenses = (rows: ReceiptRow[]) => rows.filter(r => r.type.toLowerCase() === 'expense').reduce((sum, r) => sum + r.amount, 0)
export const categoryTotals = (rows: ReceiptRow[]): CategoryTotal[] => {
  const expenses = rows.filter(r => r.type.toLowerCase() === 'expense')
  const total = sumExpenses(expenses)
  const grouped = expenses.reduce<Record<string, number>>((a, r) => { a[r.category] = (a[r.category] || 0) + r.amount; return a }, {})
  return Object.entries(grouped).map(([name, amount]) => ({ name, amount, share: total ? Math.round(amount / total * 100) : 0 })).sort((a, b) => b.amount - a.amount)
}
export const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
