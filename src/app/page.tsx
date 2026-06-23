'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import PaymentModal from '@/components/PaymentModal';
import { Ticket, TicketsData } from '@/app/api/tickets/route';

// ─── Date helpers ─────────────────────────────────────────────────────────────
function parseMatchDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    const [datePart, timePart] = dateStr.split(' ');
    const [month, day, year] = datePart.split('/');
    return new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt((timePart || '12:00').split(':')[0]),
      parseInt((timePart || '12:00').split(':')[1])
    );
  } catch { return null; }
}

function formatMatchDate(dateStr?: string, idx = 0) {
  const d = parseMatchDate(dateStr);
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (!d) {
    const day = (10 + (idx % 20)).toString().padStart(2,'0');
    return { month:'JUN', day, weekday:'Thu', time:'19:00', full:`Thu · JUN ${day}, 2026 · 19:00` };
  }
  const h = d.getHours().toString().padStart(2,'0');
  const m = d.getMinutes().toString().padStart(2,'0');
  return {
    month: MONTHS[d.getMonth()],
    day: d.getDate().toString().padStart(2,'0'),
    weekday: DAYS[d.getDay()],
    time: `${h}:${m}`,
    full: `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h}:${m}`,
  };
}

// ─── Stage config ─────────────────────────────────────────────────────────────
const STAGE_ORDER = ['All','Group Stage','Round of 32','Round of 16','Quarter-Finals','Semi-Finals','3rd Place Play-off','Final'];
const GROUPS = ['All Groups','Group A','Group B','Group C','Group D','Group E','Group F','Group G','Group H','Group I','Group J','Group K','Group L'];
const KNOCKOUT_STAGES = new Set(['Round of 32','Round of 16','Quarter-Finals','Semi-Finals','3rd Place Play-off','Final']);

const STAGE_BADGE: Record<string, string> = {
  'Final':              'bg-amber-100 text-amber-800 border-amber-300',
  'Semi-Finals':        'bg-purple-100 text-purple-700 border-purple-200',
  'Quarter-Finals':     'bg-blue-100 text-blue-700 border-blue-200',
  'Round of 16':        'bg-teal-100 text-teal-700 border-teal-200',
  'Round of 32':        'bg-indigo-100 text-indigo-700 border-indigo-200',
  '3rd Place Play-off': 'bg-orange-100 text-orange-700 border-orange-200',
  'Group Stage':        'bg-slate-100 text-slate-500 border-slate-200',
};

const URGENCY: Record<string, string> = {
  'Final':              'FINAL MATCH — Only a handful of tickets remain. Prices will only go up.',
  'Semi-Finals':        'SEMI-FINAL — Extreme demand. Act now before prices rise further.',
  'Quarter-Finals':     'QUARTER-FINAL — Prices rising fast as knockout fever hits.',
  'Round of 16':        'ROUND OF 16 — Knockout stage. Very limited availability.',
  'Round of 32':        'ROUND OF 32 — First knockout round. Demand is surging.',
  '3rd Place Play-off': 'Third place on the line — a proper World Cup fixture.',
  'Group Stage':        'Over 4,200 fans viewed World Cup tickets in the last hour.',
};

const PAGE_SIZE = 20;

// ─── Ticket tier definitions ───────────────────────────────────────────────────
interface TierDef {
  id: 'floor' | 'lower' | 'upper';
  label: string;
  icon: string;
  description: string;
  perks: string[];
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

const TIERS: TierDef[] = [
  {
    id: 'floor',
    label: 'Floor Seat',
    icon: '⭐',
    description: 'Best seats in the stadium — pitch-side with an unobstructed view of every play.',
    perks: ['Pitch-side position', 'VIP lounge access', 'Premium hospitality', 'Priority entry'],
    accent: 'amber',
    accentBg: 'bg-amber-50',
    accentBorder: 'border-amber-300',
    accentText: 'text-amber-800',
  },
  {
    id: 'lower',
    label: 'Lower Stand',
    icon: '🟢',
    description: 'Lower tier seating with excellent close-up views of the action.',
    perks: ['Lower bowl position', 'Great sightlines', 'Instant e-ticket', 'Seated together'],
    accent: 'emerald',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-300',
    accentText: 'text-emerald-800',
  },
  {
    id: 'upper',
    label: 'Upper Stand',
    icon: '🔵',
    description: 'Upper tier — full panoramic view of the entire pitch. Great atmosphere.',
    perks: ['Full panoramic view', 'Lively atmosphere', 'Instant e-ticket', 'Seated together'],
    accent: 'blue',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-300',
    accentText: 'text-blue-800',
  },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function StorefrontPage() {
  const [data, setData] = useState<TicketsData | null>(null);
  const [loading, setLoading] = useState(true);

  // View state
  const [currentView, setCurrentView] = useState<'list' | 'details'>('list');
  const [selectedMatch, setSelectedMatch] = useState<Ticket | null>(null);
  const [selectedMatchIdx, setSelectedMatchIdx] = useState(0);

  // Quantity modal
  const [quantityPending, setQuantityPending] = useState<{ match: Ticket; idx: number } | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [seatedTogether, setSeatedTogether] = useState(true);

  // Checkout modal
  const [checkoutTicket, setCheckoutTicket] = useState<Ticket | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStage, setActiveStage] = useState('All');
  const [activeGroup, setActiveGroup] = useState('All Groups');
  const [showPastMatches, setShowPastMatches] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets', { cache: 'no-store' });
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeStage, activeGroup, showPastMatches]);

  // ── Date filter ───────────────────────────────────────────────────────────────
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const filteredTickets = useMemo(() => {
    if (!data) return [];
    let list = [...data.tickets];

    if (!showPastMatches) {
      list = list.filter(t => { const d = parseMatchDate(t.date); return !d || d >= today; });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.matchTeams.toLowerCase().includes(q) ||
        t.stadiumName.toLowerCase().includes(q) ||
        (t.stage || '').toLowerCase().includes(q)
      );
    }
    if (activeStage !== 'All') list = list.filter(t => t.stage === activeStage);
    if (activeGroup !== 'All Groups' && activeStage === 'Group Stage') {
      list = list.filter(t => t.group === activeGroup);
    }
    return list;
  }, [data, searchQuery, activeStage, activeGroup, showPastMatches, today]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const pagedTickets = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages);
    else pages.push(1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages);
    return pages;
  }, [currentPage, totalPages]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const openQuantityModal = (match: Ticket, idx: number) => {
    setQuantityPending({ match, idx });
  };

  const confirmQuantity = () => {
    if (!quantityPending) return;
    setSelectedMatch(quantityPending.match);
    setSelectedMatchIdx(quantityPending.idx);
    setCurrentView('details');
    setQuantityPending(null);
    window.scrollTo(0, 0);
  };

  const goBack = () => { setCurrentView('list'); setSelectedMatch(null); };

  const handleBuyTier = (tier: TierDef) => {
    if (!selectedMatch) return;
    const priceMap = {
      floor: selectedMatch.priceFloor ?? Math.round(selectedMatch.price * 4.5),
      lower: selectedMatch.priceLower ?? Math.round(selectedMatch.price * 2.7),
      upper: selectedMatch.priceUpper ?? selectedMatch.price,
    };
    const unitPrice = priceMap[tier.id];
    setCheckoutTicket({
      id: selectedMatch.id,
      matchTeams: selectedMatch.matchTeams,
      stadiumName: selectedMatch.stadiumName,
      seatCategory: `${tier.label} — ${selectedQty} ticket${selectedQty > 1 ? 's' : ''}`,
      price: unitPrice * selectedQty,
      imageUrl: selectedMatch.imageUrl,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800" style={{ fontFamily: 'var(--font-inter)' }}>

      {/* ════════════════════════════════ HEADER ════════════════════════════════ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div onClick={() => { setCurrentView('list'); setActiveStage('All'); setActiveGroup('All Groups'); setSearchQuery(''); }}
            className="flex items-center gap-2 flex-shrink-0 cursor-pointer select-none">
            <span className="text-emerald-700 font-black text-2xl tracking-tighter">ArenaPass</span>
            <span className="hidden md:inline-block text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold border border-slate-200 uppercase tracking-wider">Tickets</span>
          </div>
          {currentView === 'list' && (
            <div className="flex-1 max-w-xl relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search teams, stadium, or stage..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all" />
            </div>
          )}
          <div className="flex items-center gap-5 text-sm font-semibold text-slate-600 flex-shrink-0">
            <span className="hidden lg:block text-slate-800 font-bold">USD ($)</span>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════ LIST VIEW ══════════════════════════════ */}
      {currentView === 'list' && (
        <>
          {/* Page banner */}
          <div className="bg-white border-b border-slate-200 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="text-xs text-slate-400 mb-3 flex items-center gap-1.5 font-medium flex-wrap">
                <span>Home</span><span>›</span><span>Sports Tickets</span><span>›</span><span>Soccer</span><span>›</span>
                <span className="text-slate-600 font-semibold">World Cup 2026</span>
              </nav>
              <div className="md:flex md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">FIFA World Cup 2026 Tickets</h1>
                  <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                    Buy official World Cup 2026 tickets — Group Stage through the Final. Instant e-ticket delivery. 100% ArenaPass FanProtect Guarantee.
                  </p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-emerald-800 flex-shrink-0">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <p className="text-xs font-bold leading-none">ArenaPass Guarantee</p>
                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5">100% Valid Tickets or Full Refund</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
                <span className="text-rose-500 text-base flex-shrink-0 mt-0.5">🔥</span>
                <div>
                  <p className="text-sm font-bold text-rose-900">High demand alert</p>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{URGENCY[activeStage] || URGENCY['Group Stage']}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stage tabs */}
          <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center overflow-x-auto scrollbar-none">
                {STAGE_ORDER.map(stage => (
                  <button key={stage}
                    id={`stage-tab-${stage.replace(/\s+/g,'-').toLowerCase()}`}
                    onClick={() => { setActiveStage(stage); setActiveGroup('All Groups'); setCurrentPage(1); }}
                    className={`whitespace-nowrap px-4 py-3.5 text-xs font-bold border-b-2 transition-all flex-shrink-0 ${
                      activeStage === stage ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
                    {stage}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Group sub-tabs */}
          {activeStage === 'Group Stage' && (
            <div className="bg-slate-50 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex flex-wrap gap-2">
                  {GROUPS.map(g => (
                    <button key={g} id={`group-filter-${g.replace(/\s+/g,'-').toLowerCase()}`}
                      onClick={() => { setActiveGroup(g); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        activeGroup === g ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-600 hover:text-emerald-700'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main layout */}
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

              {/* Sidebar */}
              <aside className="lg:col-span-1 space-y-5">
                {/* Past matches toggle */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Date Filter</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button onClick={() => setShowPastMatches(!showPastMatches)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 focus:outline-none ${showPastMatches ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${showPastMatches ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-xs font-semibold text-slate-700 leading-snug">Show already played matches</span>
                  </label>
                </div>

                {/* Seat tiers legend */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Seat Tiers</h3>
                  <div className="space-y-3">
                    {TIERS.map(t => (
                      <div key={t.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${t.accentBg} ${t.accentBorder}`}>
                        <span className="text-base">{t.icon}</span>
                        <div>
                          <p className={`text-xs font-bold ${t.accentText}`}>{t.label}</p>
                          <p className="text-[10px] text-slate-500 leading-snug">{t.description.split('—')[0].trim()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Market Stats</h3>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Upcoming events</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{filteredTickets.length}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Tickets from</p>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">
                      ${filteredTickets.length > 0 ? Math.min(...filteredTickets.map(t => t.priceUpper ?? t.price)).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-700 rounded-lg p-4 text-white space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-wider">🛡️ FanProtect</p>
                  <p className="text-[11px] leading-relaxed opacity-90">Every order is covered. Cancelled event? Full refund guaranteed.</p>
                </div>
              </aside>

              {/* Ticket list */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-t-lg border-t border-x border-slate-200 p-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">
                    {activeStage === 'All' ? 'All Upcoming Matches' : activeStage}
                    {activeGroup !== 'All Groups' ? ` — ${activeGroup}` : ''}
                    <span className="ml-2 text-slate-400 font-normal">({filteredTickets.length} events)</span>
                  </h2>
                  <div className="text-xs text-slate-400 font-medium hidden sm:block">All prices in USD · Fees included</div>
                </div>

                <div className="bg-white rounded-b-lg border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loading matches...</span>
                    </div>
                  ) : pagedTickets.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-slate-400 text-base mb-3">No upcoming matches found.</p>
                      <button onClick={() => { setSearchQuery(''); setActiveStage('All'); setActiveGroup('All Groups'); setShowPastMatches(true); }}
                        className="text-xs font-bold text-emerald-700 hover:underline">Show all matches including past</button>
                    </div>
                  ) : (
                    pagedTickets.map((ticket, idx) => {
                      const di = formatMatchDate(ticket.date, idx);
                      const isKnockout = KNOCKOUT_STAGES.has(ticket.stage || '');
                      const badgeClass = STAGE_BADGE[ticket.stage || ''] || STAGE_BADGE['Group Stage'];
                      const fromPrice = ticket.priceUpper ?? ticket.price;
                      return (
                        <div key={ticket.id} className="viagogo-row flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                          {/* Date block */}
                          <div className="flex-shrink-0">
                            <div className="date-block">
                              <span className="date-block-month">{di.month}</span>
                              <span className="date-block-day">{di.day}</span>
                              <span className="date-block-weekday">{di.weekday}</span>
                            </div>
                          </div>

                          {/* Match info */}
                          <div className="flex-grow text-left sm:px-3 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${badgeClass}`}>
                                {ticket.stage}{ticket.group ? ` · ${ticket.group}` : ''}
                              </span>
                              {isKnockout && (
                                <span className="text-[9px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-200 uppercase">🔥 Knockout</span>
                              )}
                            </div>
                            <h4 onClick={() => openQuantityModal(ticket, idx)}
                              className="text-sm font-extrabold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer transition-colors mb-1 leading-snug truncate">
                              {ticket.matchTeams}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">📍 {ticket.stadiumName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">🕐 {di.time} · {di.weekday} {di.month} {di.day}</p>
                            <p className="text-[10px] text-rose-600 font-bold mt-1">
                              ⚡ {isKnockout ? 'Very limited — selling fast!' : `Only ${idx % 3 === 0 ? '2' : idx % 3 === 1 ? '3' : '5'}% of tickets left!`}
                            </p>
                          </div>

                          {/* Price + CTA */}
                          <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 flex-shrink-0">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block leading-none">from</span>
                              <span className={`text-xl font-black ${ticket.stage === 'Final' ? 'text-amber-600' : 'text-slate-900'}`}>
                                ${fromPrice.toLocaleString()}
                              </span>
                            </div>
                            <button id={`see-tickets-btn-${ticket.id}`} onClick={() => openQuantityModal(ticket, idx)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-5 rounded text-xs transition-colors shadow-sm uppercase tracking-wider flex-shrink-0"
                              style={{ minWidth: '110px' }}>
                              See tickets
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-1.5">
                    <button id="pagination-prev" onClick={() => { setCurrentPage(p => Math.max(1, p-1)); window.scrollTo(0,0); }}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-xs font-bold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      ‹ Prev
                    </button>
                    {pageNumbers.map((p, i) =>
                      p === '...' ? (
                        <span key={`el${i}`} className="px-2 py-2 text-xs text-slate-400">…</span>
                      ) : (
                        <button key={p} id={`pagination-page-${p}`}
                          onClick={() => { setCurrentPage(p as number); window.scrollTo(0,0); }}
                          className={`w-9 h-9 text-xs font-bold rounded border transition-all ${
                            currentPage === p ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                          {p}
                        </button>
                      )
                    )}
                    <button id="pagination-next" onClick={() => { setCurrentPage(p => Math.min(totalPages, p+1)); window.scrollTo(0,0); }}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-xs font-bold rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      Next ›
                    </button>
                  </div>
                )}
                {!loading && filteredTickets.length > 0 && (
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Showing {Math.min((currentPage-1)*PAGE_SIZE+1, filteredTickets.length)}–{Math.min(currentPage*PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length} matches
                  </p>
                )}
              </div>
            </div>
          </main>
        </>
      )}

      {/* ════════════════════════════════ DETAIL VIEW ════════════════════════════ */}
      {currentView === 'details' && selectedMatch && (() => {
        const di = formatMatchDate(selectedMatch.date, selectedMatchIdx);
        const isKnockout = KNOCKOUT_STAGES.has(selectedMatch.stage || '');
        const badgeClass = STAGE_BADGE[selectedMatch.stage || ''] || STAGE_BADGE['Group Stage'];
        const priceMap = {
          floor: selectedMatch.priceFloor ?? Math.round(selectedMatch.price * 4.5),
          lower: selectedMatch.priceLower ?? Math.round(selectedMatch.price * 2.7),
          upper: selectedMatch.priceUpper ?? selectedMatch.price,
        };
        return (
          <div className="flex-grow flex flex-col">
            {/* Match header */}
            <div className="bg-white border-b border-slate-200 py-5 shadow-sm">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <button onClick={goBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors mb-4">
                  ← Back to all matches
                </button>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badgeClass}`}>
                        {selectedMatch.stage}{selectedMatch.group ? ` · ${selectedMatch.group}` : ''}
                      </span>
                      {isKnockout && <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded border border-rose-200 uppercase">🔥 Knockout Match</span>}
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 leading-tight mb-1">{selectedMatch.matchTeams}</h1>
                    <p className="text-sm text-slate-500 font-medium">{di.full}</p>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">📍 {selectedMatch.stadiumName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-full">🔥 Limited tickets left</span>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-semibold text-slate-600">👥 {selectedQty} ticket{selectedQty > 1 ? 's' : ''}</span>
                      <button onClick={() => setQuantityPending({ match: selectedMatch, idx: selectedMatchIdx })}
                        className="text-[10px] font-bold text-emerald-700 hover:underline">Change</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket tiers */}
            <div className="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="mb-6">
                <h2 className="text-lg font-extrabold text-slate-900">Choose your seat tier</h2>
                <p className="text-sm text-slate-500 mt-1">All tickets are official and guaranteed. Instant e-ticket delivery after purchase.</p>
              </div>

              <div className="space-y-4">
                {TIERS.map((tier, i) => {
                  const unitPrice = priceMap[tier.id];
                  const totalPrice = unitPrice * selectedQty;
                  const leftCount = [2, 4, 8][i];
                  return (
                    <div key={tier.id}
                      className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all hover:shadow-md ${tier.accentBorder}`}>
                      {/* Tier header strip */}
                      <div className={`${tier.accentBg} px-5 py-3 flex items-center justify-between border-b ${tier.accentBorder}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tier.icon}</span>
                          <span className={`text-sm font-extrabold ${tier.accentText}`}>{tier.label}</span>
                        </div>
                        <span className="text-xs font-bold text-rose-600">⚠️ Only {leftCount} left at this price</span>
                      </div>

                      {/* Tier body */}
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex-grow">
                          <p className="text-sm text-slate-600 leading-relaxed mb-3">{tier.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {tier.perks.map(perk => (
                              <span key={perk} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded-full">
                                ✓ {perk}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Price + buy */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">per ticket</p>
                            <p className="text-2xl font-black text-slate-900">${unitPrice.toLocaleString()}</p>
                            {selectedQty > 1 && (
                              <p className="text-xs text-slate-500 font-semibold">Total: ${totalPrice.toLocaleString()}</p>
                            )}
                          </div>
                          <button
                            id={`buy-${tier.id}-btn`}
                            onClick={() => handleBuyTier(tier)}
                            className={`${
                              tier.id === 'floor' ? 'bg-amber-500 hover:bg-amber-600' :
                              tier.id === 'lower' ? 'bg-emerald-700 hover:bg-emerald-800' :
                              'bg-blue-600 hover:bg-blue-700'
                            } text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors shadow-sm uppercase tracking-wider whitespace-nowrap`}>
                            Select {selectedQty > 1 ? `${selectedQty} tickets` : 'tickets'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Guarantee note */}
              <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4">
                <span className="text-2xl flex-shrink-0">🛡️</span>
                <div>
                  <p className="text-sm font-bold text-emerald-900">ArenaPass FanProtect Guarantee</p>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    Every ticket purchased through ArenaPass is 100% guaranteed. If your event is cancelled or your tickets are invalid, you will receive a full refund. No risk, no hassle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════ FOOTER ════════════════════════════════ */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex justify-center flex-wrap gap-5 text-sm font-semibold text-slate-400">
            <span className="hover:text-white cursor-pointer">About ArenaPass</span>
            <span className="hover:text-white cursor-pointer">Buyer Guarantee</span>
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
            ArenaPass is a secondary marketplace. Prices are set by sellers and may differ from face value. Every purchase is protected by our FanProtect coverage.
          </p>
          <p className="text-xs text-slate-600">© 2026 ArenaPass Inc. All rights reserved.</p>
        </div>
      </footer>

      {/* ════════════════════════════════ QUANTITY MODAL ═════════════════════════ */}
      {quantityPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <button onClick={() => setQuantityPending(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl font-bold z-10">✕</button>

            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900">How many tickets?</h2>
              <p className="text-sm text-slate-600 mt-1 pr-6 font-semibold">{quantityPending.match.matchTeams}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatMatchDate(quantityPending.match.date, quantityPending.idx).full}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Quantity dropdown */}
              <div className="relative">
                <select value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value))}
                  className="w-full border-2 border-slate-200 rounded-xl p-4 text-base font-bold focus:outline-none focus:border-emerald-600 appearance-none bg-white text-slate-800">
                  {[1,2,3,4,5,6,7,8].map(n => (
                    <option key={n} value={n}>{n} ticket{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">▾</span>
              </div>

              {/* Seated together toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="pr-4">
                  <p className="text-sm font-bold text-slate-800">👥 We want to be seated together</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">We&apos;ll find the best available seats for your group</p>
                </div>
                <button onClick={() => setSeatedTogether(!seatedTogether)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 focus:outline-none ${seatedTogether ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${seatedTogether ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Continue */}
              <button onClick={confirmQuantity}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl text-base transition-colors shadow-lg">
                Continue →
              </button>

              {/* Limit note */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs text-blue-700 leading-relaxed">
                  ℹ️ Per event guidelines, each household is limited to <strong>8 tickets per match</strong> and 40 tickets total across the competition.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════ PAYMENT MODAL ══════════════════════════ */}
      {checkoutTicket && (
        <PaymentModal
          ticket={checkoutTicket}
          walletAddress={data?.cryptoWalletAddress ?? ''}
          onClose={() => setCheckoutTicket(null)}
        />
      )}
    </div>
  );
}
