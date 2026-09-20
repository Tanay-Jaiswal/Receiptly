import { parse, isValid, format } from 'date-fns'
import type { CategoryTotal, ReceiptRow } from './types'

export const parseReceiptDate = (value: string): Date | null => {
  const formats = ['dd/MM/yyyy HH:mm:ss', 'dd/MM/yyyy', 'yyyy-MM-dd']
  for (const pattern of formats) { const d = parse(value.trim(), pattern, new Date()); if (isValid(d)) return d }
  const fallback = new Date(value); return isValid(fallback) ? fallback : null
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
