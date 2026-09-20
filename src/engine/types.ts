export type ReceiptRow = { id: string; date: string; source: 'household' | 'card'; mode: string; category: string; subcategory: string; note: string; amount: number; type: string; currency: string }
export type CategoryTotal = { name: string; amount: number; share: number }
export type Chapter = { id: string; kicker: string; title: string; body: string; metric: string; source: string }
export type Pattern = { id: string; label: string; title: string; value: string; description: string; tone: string }
export type ReceiptData = {
  meta: { generatedAt: string; privacy: string; dedupedRecords: number; sources: Array<{ id: string; label: string; file: string; records: number; years: number[] }> }
  aggregates: { spendTotal: number; spendCount: number; categories: CategoryTotal[]; sourceTotals: CategoryTotal[]; yearTotals: CategoryTotal[]; spotify: { streams: number; minutes: number; skipRate: number; platforms: Array<{ name: string; count: number }>; topArtists: Array<{ name: string; count: number }> } }
  chapters: Chapter[]; patterns: Pattern[]; rows: ReceiptRow[]
  receipts: Record<string, { year: number; total: number; count: number; lines: Array<{ category: string; amount: number; count: number }> }>
}
