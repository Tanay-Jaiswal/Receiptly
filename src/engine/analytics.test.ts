import { describe, expect, it } from 'vitest'
import { categoryTotals, dedupeByFields, parseCardDate, parseReceiptDate, realSkipMetric, sumExpenses } from './analytics'
const rows = [{ id: '1', date: '20/09/2018', source: 'household' as const, mode: 'Cash', category: 'Food', subcategory: '', note: '', amount: 60, type: 'Expense', currency: 'INR' }, { id: '2', date: '21/09/2018', source: 'household' as const, mode: 'Cash', category: 'Food', subcategory: '', note: '', amount: 100, type: 'Income', currency: 'INR' }]
describe('receipt analytics', () => {
  it('parses Indian date formats', () => expect(parseReceiptDate('20/09/2018')?.getFullYear()).toBe(2018))
  it('parses card dates explicitly without locale-dependent Date parsing', () => expect(parseCardDate('12/26/2023 0:55')?.getMonth()).toBe(11))
  it('deduplicates rows using all selected source fields', () => {
    const input = [{ date: '2024-01-01', amount: 10, category: 'food' }, { date: '2024-01-01', amount: 10, category: 'food' }, { date: '2024-01-01', amount: 12, category: 'food' }]
    expect(dedupeByFields(input, ['date', 'amount', 'category'])).toHaveLength(2)
  })
  it('marks forward-button, short, and explicitly skipped plays', () => {
    expect(realSkipMetric({ reason_end: 'fwdbtn', ms_played: 60_000 })).toBe(true)
    expect(realSkipMetric({ reason_end: 'trackdone', ms_played: 1_000 })).toBe(true)
    expect(realSkipMetric({ reason_end: 'trackdone', ms_played: 60_000, skipped: false })).toBe(false)
  })
  it('excludes income from spend totals', () => expect(sumExpenses(rows)).toBe(60))
  it('groups categories and calculates share', () => expect(categoryTotals(rows)).toEqual([{ name: 'Food', amount: 60, share: 100 }]))
})
