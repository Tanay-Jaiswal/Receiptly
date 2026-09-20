import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleHelp, Download, Leaf, Menu, Receipt, Sparkles, X } from 'lucide-react'
import { formatINR } from './engine/analytics'
import type { ReceiptData } from './engine/types'
import './styles.css'

const fallback: ReceiptData = { meta: { generatedAt: '', privacy: '', dedupedRecords: 0, sources: [] }, aggregates: { spendTotal: 0, spendCount: 0, categories: [], sourceTotals: [], yearTotals: [], spotify: { streams: 0, minutes: 0, skipRate: 0, platforms: [], topArtists: [] } }, chapters: [], patterns: [], rows: [], receipts: {} }
const colors = ['#e96b48', '#2e7d68', '#e8ad43', '#7d6bb4', '#dd8aa1', '#547aa5']

function App() {
  const [data, setData] = useState<ReceiptData>(fallback)
  const [view, setView] = useState<'story' | 'patterns' | 'explore'>(() => {
    const hash = window.location.hash.slice(1)
    return hash === 'patterns' || hash === 'explore' ? hash : 'story'
  })
  const [menu, setMenu] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    fetch('/data/receiptly.json')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load receipt data')))
      .then((payload: Partial<ReceiptData>) => {
        if (payload.aggregates && payload.meta && Array.isArray(payload.chapters) && Array.isArray(payload.patterns)) {
          setData(payload as ReceiptData)
        }
      })
      .catch(() => {})
  }, [])
  const navigate = (v: typeof view) => { setView(v); window.history.replaceState(null, '', `#${v}`); setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return <div className="app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="nav"><button className="brand" onClick={() => navigate('story')} aria-label="Receiptly home"><span className="brand-mark"><Receipt size={18}/></span> receiptly</button>
      <nav aria-label="Primary navigation" className={menu ? 'nav-links open' : 'nav-links'}><button className={view === 'story' ? 'active' : ''} aria-current={view === 'story' ? 'page' : undefined} onClick={() => navigate('story')}>The story</button><button className={view === 'patterns' ? 'active' : ''} aria-current={view === 'patterns' ? 'page' : undefined} onClick={() => navigate('patterns')}>Patterns</button><button className={view === 'explore' ? 'active' : ''} aria-current={view === 'explore' ? 'page' : undefined} onClick={() => navigate('explore')}>Explore</button></nav>
      <button className="menu-btn" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    </header>
    {view === 'story' && <Story data={data} navigate={navigate}/>}
    {view === 'patterns' && <Patterns data={data} selected={selected} setSelected={setSelected}/>}
    {view === 'explore' && <Explore data={data}/>}
    <footer><span>Made with care from three open datasets.</span><span className="footer-right"><CircleHelp size={15}/> No accounts. No tracking. Just patterns.</span></footer>
  </div>
}

function Story({ data, navigate }: { data: ReceiptData; navigate: (v: 'patterns' | 'explore') => void }) {
  const chapter = data.chapters[0]
  const [activeChapter, setActiveChapter] = useState(0)
  return <main className="story" id="main-content">
    <section className="hero"><div className="eyebrow"><Sparkles size={14}/> a small mirror for big habits</div><h1>{chapter ? <span dangerouslySetInnerHTML={{ __html: chapter.title }}/> : <>Your spending<br/><em>has a shape.</em></>}</h1><p className="hero-copy">{chapter?.body || 'Receiptly turns everyday transactions into a quiet, human story — so you can notice what your numbers are trying to say.'}</p><button className="primary" onClick={() => navigate('patterns')}>See the whole picture <ChevronRight size={17}/></button><div className="hero-note"><span className="dot"/> A private, playful look at {data.meta.dedupedRecords.toLocaleString()} deduped moments</div></section>
    <section className="receipt-wrap"><div className="receipt-paper"><div className="receipt-top"><span>RECEIPTLY / ALL YEARS</span><Leaf size={16}/></div><div className="receipt-title">three sources,<br/><strong>one little story.</strong></div><div className="receipt-line"/><div className="mini-row"><span>spending moments</span><b>{formatINR(data.aggregates.spendTotal)}</b></div><div className="mini-bars">{data.aggregates.categories.slice(0, 7).map((item, i) => <i key={item.name} style={{height:`${Math.max(item.share * .5, 7)}px`, background: colors[i % colors.length]}}/> )}</div><div className="receipt-line"/><div className="receipt-total"><span>THE TAKEAWAY</span><strong>{data.aggregates.spotify.minutes.toLocaleString()} minutes<br/>have a soundtrack.</strong></div><div className="barcode">▌▌▌ ▌▌ ▌▌▌▌ ▌▌▌ ▌</div></div></section>
    <section className="manifesto"><p className="eyebrow">THE STORY, IN CHAPTERS</p><h2>Not a budget.<br/><span>A little more <em>honest.</em></span></h2><div className="chapter-tabs" role="tablist" aria-label="Receipt story chapters">{data.chapters.slice(1).map((item, i) => <button role="tab" aria-selected={activeChapter === i} className={activeChapter === i ? 'chapter-tab active' : 'chapter-tab'} onClick={() => setActiveChapter(i)} key={item.id}>0{i + 1} / {item.kicker.split('/')[0]}</button>)}</div><div className="chapter-list">{data.chapters.slice(1).map((item, i) => <article className={activeChapter === i ? 'chapter selected' : 'chapter'} key={item.id} hidden={activeChapter !== i}><span>0{i + 1}</span><div><p className="eyebrow">{item.kicker}</p><h3 dangerouslySetInnerHTML={{ __html: item.title }}/><p>{item.body}</p><div className="chapter-bar" aria-label={`${item.metric}`}/></div><strong>{item.metric}</strong></article>)}</div></section>
    <section className="cta-band"><div><h2>Ready to look closer?</h2><p>Your patterns are waiting, patiently.</p></div><button className="light-btn" onClick={() => navigate('explore')}>Open the explorer <ArrowDownRight size={17}/></button></section>
  </main>
}

function Patterns({ data, selected, setSelected }: { data: ReceiptData; selected: string | null; setSelected: (x: string | null) => void }) {
  const totals = data.aggregates.categories; const max = Math.max(...totals.map(x => x.amount), 1)
  return <main className="patterns page" id="main-content"><div className="page-intro"><div><p className="eyebrow">PATTERN 01 / THE BIG PICTURE</p><h1>The shape of<br/><em>everyday.</em></h1></div><p className="lede">Household choices, card purchases and listening rituals — one combined, deduped story.</p></div>
    <div className="stats"><div><span>Combined outflow</span><strong>{formatINR(data.aggregates.spendTotal)}</strong><small><ArrowUpRight size={13}/> household + card</small></div><div><span>Most-loved category</span><strong>{totals[0]?.name || '—'}</strong><small>{totals[0]?.share || 0}% of all spending</small></div><div><span>Listening hours</span><strong>{Math.round(data.aggregates.spotify.minutes / 60).toLocaleString()}</strong><small>{data.aggregates.spotify.skipRate}% skipped</small></div></div>
    <section className="chart-card"><div className="card-head"><div><p className="eyebrow">WHERE IT GOES</p><h2>The everyday mix</h2></div><span className="hint">tap a bar to peek</span></div><div className="bars">{totals.slice(0, 8).map((item, i) => <button className={selected === item.name ? 'bar-row selected' : 'bar-row'} key={item.name} onClick={() => setSelected(selected === item.name ? null : item.name)}><span className="bar-label">{item.name}</span><span className="bar-track"><motion.i initial={{width:0}} animate={{width:`${item.amount / max * 100}%`}} transition={{delay:i*.05}} style={{background:colors[i % colors.length]}}/></span><b>{formatINR(item.amount)}</b></button>)}</div></section>
    <div className="patterns-grid" aria-label="Evidence-backed patterns">{data.patterns.map(pattern => <div className={`pattern-card ${pattern.tone}`} key={pattern.id}><p className="eyebrow">{pattern.label}</p><h3>{pattern.title}</h3><strong>{pattern.value}</strong><p>{pattern.description}</p><button className="text-link" onClick={() => window.location.hash = 'explore'}>See the receipts <ChevronRight size={14}/></button></div>)}</div>
    <div className="insight"><Sparkles size={20}/><div><p className="eyebrow">A TINY OBSERVATION</p><p>{totals[0] ? <><strong>{totals[0].name}</strong> is your loudest little ritual. It takes up {totals[0].share}% of spending — a pattern worth noticing, not fixing.</> : 'Generate your data to reveal a tiny observation.'}</p></div></div>
  </main>
}

function Explore({ data }: { data: ReceiptData }) {
  const [q, setQ] = useState(''); const [source, setSource] = useState('all')
  const rows = useMemo(() => data.rows.filter(r => (source === 'all' || r.source === source) && `${r.category} ${r.subcategory} ${r.note}`.toLowerCase().includes(q.toLowerCase())).slice(0, 100), [data.rows, q, source])
  return <main className="page explore" id="main-content"><div className="page-intro"><div><p className="eyebrow">PATTERN 02 / GET CURIOUS</p><h1>Look a little<br/><em>closer.</em></h1></div><p className="lede">Search the tiny moments that make up the bigger picture. Identity never arrives here.</p></div><div className="search"><label className="sr-only" htmlFor="receipt-search">Search receipts</label><span aria-hidden="true">⌕</span><input id="receipt-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Try “food”, “travel”, or “online shopping”..." /><Download size={17}/></div><div className="filters" role="group" aria-label="Receipt source filters"><button className={source === 'all' ? 'filter active' : 'filter'} onClick={() => setSource('all')}>All</button><button className={source === 'household' ? 'filter active' : 'filter'} onClick={() => setSource('household')}>Household</button><button className={source === 'card' ? 'filter active' : 'filter'} onClick={() => setSource('card')}>Card</button></div><p className="result-count" aria-live="polite">{rows.length} receipts shown</p><div className="table-wrap"><div className="table-head"><span>WHEN</span><span>THE LITTLE THING</span><span>HOW MUCH</span></div>{rows.map(r => <div className="table-row" key={r.id}><span>{r.date.split(' ')[0]}</span><span><b>{r.subcategory || r.category}</b><small>{r.category} · {r.source}</small></span><strong>{formatINR(r.amount)}</strong></div>)}{!rows.length && <div className="empty">No little things found.</div>}</div><p className="privacy"><Leaf size={16}/> {data.meta.privacy}</p></main>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
