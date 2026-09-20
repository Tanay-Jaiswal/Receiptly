import { describe, expect, it } from 'vitest'
import { categoryTotals, parseReceiptDate, sumExpenses } from './analytics'
const rows = [{ id: '1', date: '20/09/2018', source: 'household' as const, mode: 'Cash', category: 'Food', subcategory: '', note: '', amount: 60, type: 'Expense', currency: 'INR' }, { id: '2', date: '21/09/2018', source: 'household' as const, mode: 'Cash', category: 'Food', subcategory: '', note: '', amount: 100, type: 'Income', currency: 'INR' }]
describe('receipt analytics', () => {
  it('parses Indian date formats', () => expect(parseReceiptDate('20/09/2018')?.getFullYear()).toBe(2018))
  it('excludes income from spend totals', () => expect(sumExpenses(rows)).toBe(60))
  it('groups categories and calculates share', () => expect(categoryTotals(rows)).toEqual([{ name: 'Food', amount: 60, share: 100 }]))
})
