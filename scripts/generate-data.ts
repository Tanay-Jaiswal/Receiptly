import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

type CleanRow = { id: string; date: string; source: 'household' | 'card'; mode: string; category: string; subcategory: string; note: string; amount: number; type: string; currency: string; year: number }
type SpotifyEvent = { ts?: string; platform?: string; ms_played?: string; skipped?: string; shuffle?: string; artist_name?: string }
const root = process.cwd()
const outDir = path.join(root, 'public', 'data')
fs.mkdirSync(outDir, { recursive: true })
const readCsv = <T extends Record<string, string>>(file: string) => Papa.parse<T>(fs.readFileSync(path.join(root, file), 'utf8'), { header: true, skipEmptyLines: true }).data
const yearOf = (value: string) => { const match = value.match(/\d{4}/); return match ? Number(match[0]) : 0 }
const cleanCategory = (value: string | undefined, fallback: string) => (value || fallback).trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')
const dateKey = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? value.slice(0, 10) : d.toISOString().slice(0, 10) }
const money = (value: string | undefined) => Math.round((Number(value) || 0) * 100) / 100

const household = readCsv<Record<string, string>>('Dataset/Daily Household Transactions.csv').map((r, i): CleanRow => ({
  id: `household-${i + 1}`, date: r.Date || '', source: 'household', mode: r.Mode || 'unknown',
  category: cleanCategory(r.Category, 'other'), subcategory: cleanCategory(r.Subcategory, 'other'), note: '',
  amount: money(r.Amount), type: (r['Income/Expense'] || 'Expense').trim(), currency: r.Currency || 'INR', year: yearOf(r.Date || '')
}))
const card = readCsv<Record<string, string>>('Dataset1/Augmented_IndiaTransactMultiFacet2024.csv').map((r, i): CleanRow => ({
  id: `card-${i + 1}`, date: r.trans_date_trans_time || '', source: 'card', mode: 'card',
  category: cleanCategory(r.category, 'other card purchase'), subcategory: 'card purchase', note: '',
  amount: money(r.amt), type: 'Expense', currency: 'INR', year: yearOf(r.trans_date_trans_time || '')
})).filter(r => r.amount > 0)

// The source contains a customer identifier, names and addresses. None cross the boundary into public/data.
const dedupe = <T extends { id: string; date: string; category: string; amount: number }>(rows: T[]) => {
  const seen = new Set<string>()
  return rows.filter(r => { const key = `${r.date}|${r.category}|${r.amount}`; if (seen.has(key)) return false; seen.add(key); return true })
}
const safeRows = dedupe([...household, ...card])
const spotify = readCsv<SpotifyEvent>('Dataset2/spotify_history.csv')
const spotifyDays: Record<string, { streams: number; minutes: number; skipped: number; shuffle: number }> = {}
const artists: Record<string, number> = {}
const platforms: Record<string, number> = {}
const spotifyYears: Record<string, { streams: number; minutes: number; skipped: number }> = {}
const spotifySeen = new Set<string>()
for (const event of spotify) {
  const day = dateKey(event.ts || '')
  const key = `${event.ts}|${event.ms_played}|${event.artist_name}`
  if (!day || spotifySeen.has(key)) continue
  spotifySeen.add(key)
  const ms = Number(event.ms_played) || 0
  const bucket = spotifyDays[day] ||= { streams: 0, minutes: 0, skipped: 0, shuffle: 0 }
  bucket.streams++; bucket.minutes += ms / 60000; if (event.skipped === 'TRUE') bucket.skipped++; if (event.shuffle === 'TRUE') bucket.shuffle++
  const year = day.slice(0, 4); const yearly = spotifyYears[year] ||= { streams: 0, minutes: 0, skipped: 0 }; yearly.streams++; yearly.minutes += ms / 60000; if (event.skipped === 'TRUE') yearly.skipped++
  const artist = (event.artist_name || 'Unknown artist').trim(); artists[artist] = (artists[artist] || 0) + 1
  const platform = (event.platform || 'unknown').trim(); platforms[platform] = (platforms[platform] || 0) + 1
}
const expenseRows = safeRows.filter(r => r.type.toLowerCase() === 'expense')
const total = expenseRows.reduce((sum, r) => sum + r.amount, 0)
const group = (rows: CleanRow[], key: (r: CleanRow) => string) => Object.entries(rows.reduce<Record<string, number>>((a, r) => { const k = key(r); a[k] = (a[k] || 0) + r.amount; return a }, {})).map(([name, amount]) => ({ name, amount: Math.round(amount), share: total ? Math.round(amount / total * 100) : 0 })).sort((a, b) => b.amount - a.amount)
const categories = group(expenseRows, r => r.category)
const sourceTotals = group(expenseRows, r => r.source)
const yearTotals = group(expenseRows, r => String(r.year)).filter(x => x.name !== '0')
const dayIndex: Record<string, { household: number; card: number; streams: number; minutes: number }> = {}
for (const row of expenseRows) { const day = dateKey(row.date); const bucket = dayIndex[day] ||= { household: 0, card: 0, streams: 0, minutes: 0 }; bucket[row.source] += row.amount }
for (const [day, value] of Object.entries(spotifyDays)) { const bucket = dayIndex[day] ||= { household: 0, card: 0, streams: 0, minutes: 0 }; bucket.streams = value.streams; bucket.minutes = Math.round(value.minutes * 10) / 10 }
const yearSet = [...new Set(safeRows.map(r => r.year).filter(Boolean))].sort()
const receipts: Record<string, { year: number; total: number; count: number; lines: Array<{ category: string; amount: number; count: number }> }> = {}
for (const year of yearSet) {
  const rows = expenseRows.filter(r => r.year === year)
  const lines = group(rows, r => r.category).map(x => ({ category: x.name, amount: x.amount, count: rows.filter(r => r.category === x.name).length }))
  receipts[String(year)] = { year, total: Math.round(rows.reduce((s, r) => s + r.amount, 0)), count: rows.length, lines }
  fs.writeFileSync(path.join(outDir, `receipt-${year}.json`), JSON.stringify(receipts[String(year)], null, 2))
}
const topArtist = Object.entries(artists).sort((a, b) => b[1] - a[1])[0]
const spotifyTotal = spotifyYears && Object.values(spotifyYears).reduce((s, y) => s + y.streams, 0)
const patterns = [
  { id: 'largest-category', label: 'The loudest ritual', title: categories[0]?.name || 'Everyday things', value: `${categories[0]?.share || 0}%`, description: 'of your combined outflow gathers here.', tone: 'coral' },
  { id: 'card-footprint', label: 'A second pocket', title: 'Card purchases', value: `${Math.round((sourceTotals.find(x => x.name === 'card')?.share || 0))}%`, description: 'of the money story comes from Dataset 1.', tone: 'green' },
  { id: 'listening', label: 'A soundtrack', title: topArtist?.[0] || 'Your listening', value: `${Math.round(Object.values(spotifyDays).reduce((s, d) => s + d.minutes, 0) / 60)}h`, description: 'of listening, across a year of small moments.', tone: 'gold' }
]
const payload = {
  meta: { generatedAt: new Date().toISOString(), privacy: 'PII-safe presentation payload. Names, accounts, addresses, coordinates and track identifiers are excluded.', dataQuality: {
    householdRaw: household.length,
    householdExpectedApprox: 2461,
    cardValidAfterAmountFilter: card.length,
    cardExpectedApprox: 1176,
    musicEventsAfterExactDedupe: spotifySeen.size,
    musicListeningDays: Object.keys(spotifyDays).length,
    musicExpectedApproxDays: 2719,
    combinedDedupedRows: safeRows.length,
    notes: 'The card source is intentionally corrupted and contains many repeated rows. Card records are filtered to positive amounts but are not presented as one person. Spotify is aggregated to listening-day metrics for the UI.'
  }, sources: [
    { id: 'household', label: 'Household transactions', file: 'Dataset/Daily Household Transactions.csv', records: household.length, years: [...new Set(household.map(r => r.year).filter(Boolean))] },
    { id: 'card', label: 'Card transactions', file: 'Dataset1/Augmented_IndiaTransactMultiFacet2024.csv', records: card.length, years: [...new Set(card.map(r => r.year).filter(Boolean))] },
    { id: 'spotify', label: 'Listening history', file: 'Dataset2/spotify_history.csv', records: spotifySeen.size, years: Object.keys(spotifyYears).map(Number) }
  ], dedupedRecords: safeRows.length },
  aggregates: { spendTotal: Math.round(total), spendCount: expenseRows.length, categories, sourceTotals, yearTotals, spotify: { streams: spotifyTotal, minutes: Math.round(Object.values(spotifyDays).reduce((s, d) => s + d.minutes, 0)), skipRate: spotifyTotal ? Math.round(Object.values(spotifyDays).reduce((s, d) => s + d.skipped, 0) / spotifyTotal * 100) : 0, platforms: Object.entries(platforms).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), topArtists: Object.entries(artists).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })) } },
  chapters: [
    { id: 'opening', kicker: 'A RECEIPT FOR THE WHOLE SELF', title: 'Three datasets.<br/>One very human <em>shape.</em>', body: 'Your household choices, card swipes and listening rituals are different kinds of evidence. Together, they make a softer picture of a year.', metric: `${safeRows.length.toLocaleString()} combined moments`, source: 'all' },
    { id: 'spending', kicker: 'CHAPTER 01 / THE EVERYDAY', title: 'The little things<br/>do the <em>talking.</em>', body: 'Most of a spending story is made from ordinary categories — the repeatable, easy-to-miss rituals that keep a day moving.', metric: `${formatINR(total)} outflow`, source: 'household + card' },
    { id: 'card', kicker: 'CHAPTER 02 / A SECOND POCKET', title: 'Some choices<br/>arrive by <em>card.</em>', body: 'The card dataset adds another lens: a wider, more varied set of purchases. We keep only category, date and amount — never identity.', metric: `${card.length.toLocaleString()} card moments`, source: 'card' },
    { id: 'soundtrack', kicker: 'CHAPTER 03 / THE SOUNDTRACK', title: 'And every day<br/>has a <em>rhythm.</em>', body: 'The listening history is not spending at all. It is context: the songs, skips and platforms that give the numbers a little weather.', metric: `${Math.round(Object.values(spotifyDays).reduce((s, d) => s + d.minutes, 0) / 60)} listening hours`, source: 'spotify' }
  ],
  patterns, graph: { nodes: [{ id: 'household', label: 'Household', type: 'source' }, { id: 'card', label: 'Card', type: 'source' }, { id: 'spotify', label: 'Listening', type: 'source' }, ...categories.slice(0, 8).map(x => ({ id: x.name, label: x.name, type: 'category' }))], links: [...sourceTotals.map(x => ({ source: x.name, target: x.name === 'household' ? categories[0]?.name : x.name === 'card' ? categories[1]?.name : 'rhythm', value: x.amount }))] },
  dayIndex,
  receipts,
  rows: safeRows.slice(0, 5000).map(({ year, ...row }) => row)
}
function formatINR(amount: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount) }
fs.writeFileSync(path.join(outDir, 'receiptly.json'), JSON.stringify(payload))
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(payload.meta, null, 2))
fs.writeFileSync(path.join(outDir, 'aggregates.json'), JSON.stringify(payload.aggregates, null, 2))
fs.writeFileSync(path.join(outDir, 'chapters.json'), JSON.stringify(payload.chapters, null, 2))
fs.writeFileSync(path.join(outDir, 'patterns.json'), JSON.stringify(payload.patterns, null, 2))
fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(payload.graph, null, 2))
fs.writeFileSync(path.join(outDir, 'day-index.json'), JSON.stringify(payload.dayIndex))
fs.writeFileSync(path.join(outDir, 'receipts.json'), JSON.stringify(payload.receipts, null, 2))
console.log(`Generated ${safeRows.length} deduped rows, ${spotifySeen.size} listening events, ${yearSet.length} yearly receipts`)
console.log('Data quality report:')
console.log(`  Household: ${household.length} rows (expected about 2,461)`)
console.log(`  Card: ${card.length} positive-amount rows (brief reference about 1,176 valid rows)`)
console.log(`  Spotify: ${Object.keys(spotifyDays).length} listening days from ${spotifySeen.size} deduped events (brief reference about 2,719 days)`)
