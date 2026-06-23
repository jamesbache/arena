'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Ticket, TicketsData } from '@/app/api/tickets/route';

type EditableTicket = Ticket & { _dirty?: boolean };
type PublishState = 'idle' | 'saving' | 'success' | 'error';

export default function ManagementPage() {
  const [tickets, setTickets] = useState<EditableTicket[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [publishMsg, setPublishMsg] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);


  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets', { cache: 'no-store' });
      const json: TicketsData = await res.json();
      setTickets(json.tickets.map(t => ({ ...t, _dirty: false })));
      setWalletAddress(json.cryptoWalletAddress);
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTicket = (id: string, field: keyof Ticket, value: string | number) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id !== id) return t;
        const numFields: (keyof Ticket)[] = ['price','priceFloor','priceLower','priceUpper'];
        const updated = { ...t, [field]: numFields.includes(field) ? Number(value) : value, _dirty: true };
        // keep 'price' in sync with Upper (the cheapest / from-price on list)
        if (field === 'priceUpper') updated.price = Number(value);
        return updated;
      })
    );
  };

  const handlePublish = async () => {
    setPublishState('saving');
    setPublishMsg('');
    try {
      const payload: TicketsData = {
        cryptoWalletAddress: walletAddress,
        tickets: tickets.map(t => { const clean = { ...t }; delete clean._dirty; return clean; }),
      };
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server error');
      setPublishState('success');
      setPublishMsg('All changes published live successfully!');
      setTickets(prev => prev.map(t => ({ ...t, _dirty: false })));
      setLastSaved(new Date().toLocaleTimeString());
      setTimeout(() => setPublishState('idle'), 4000);
    } catch {
      setPublishState('error');
      setPublishMsg('Failed to publish. Check server logs.');
      setTimeout(() => setPublishState('idle'), 4000);
    }
  };

  const dirtyCount = tickets.filter(t => t._dirty).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="bg-slate-50 text-slate-800">
      
      {/* Navigation bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-emerald-700 font-extrabold text-2xl tracking-tighter" style={{ fontFamily: 'var(--font-inter)' }}>
              ArenaPass
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Admin Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            {lastSaved && (
              <span className="text-xs text-slate-400 font-medium">
                Last published: {lastSaved}
              </span>
            )}
            <Link
              href="/"
              id="view-storefront-link"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 border border-emerald-600/30 px-3.5 py-1.5 rounded hover:bg-emerald-50 transition-colors"
            >
              👁 View Live Storefront
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Admin Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Title Banner */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
            Inventory Management Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Edit ticket pricing, stadium details, and seat categories. Changes are saved globally and reflected instantly on the storefront.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Loading database fields...</span>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Wallet configuration block */}
            <section className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">💰</span>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Global Deposit Crypto Wallet Address
                  </h2>
                  <p className="text-xs text-slate-400">
                    All reserve order payments are directed to this bitcoin deposit address.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="wallet-address-input"
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="mgmt-input-light flex-1 font-mono text-sm"
                  placeholder="Enter crypto wallet address"
                />
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded flex items-center justify-center whitespace-nowrap">
                  ✓ Configured Wallet
                </span>
              </div>
            </section>

            {/* Inventory table block */}
            <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-base font-bold text-slate-800">
                  Live Ticket List
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Directly edit the values inside the cells. Unsaved edits are highlighted in light amber.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="p-4" style={{ minWidth:'180px' }}>Match</th>
                      <th className="p-4" style={{ minWidth:'200px' }}>Stadium</th>
                      <th className="p-3 text-center" style={{ minWidth:'120px' }}>⭐ Floor Seat</th>
                      <th className="p-3 text-center" style={{ minWidth:'120px' }}>🟢 Lower Stand</th>
                      <th className="p-3 text-center" style={{ minWidth:'120px' }}>🔵 Upper Stand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        id={`ticket-row-${ticket.id}`}
                        className={`transition-colors ${ticket._dirty ? 'bg-amber-50/40' : 'hover:bg-slate-50/30'}`}
                      >
                        <td className="p-3">
                          <input
                            type="text"
                            value={ticket.matchTeams}
                            onChange={(e) => updateTicket(ticket.id, 'matchTeams', e.target.value)}
                            className="mgmt-input-light font-semibold text-xs"
                            placeholder="Teams"
                          />
                          <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase">{ticket.stage}{ticket.group ? ` · ${ticket.group}` : ''}</p>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={ticket.stadiumName}
                            onChange={(e) => updateTicket(ticket.id, 'stadiumName', e.target.value)}
                            className="mgmt-input-light text-xs"
                            placeholder="Stadium"
                          />
                        </td>
                        {/* Floor Seat Price */}
                        <td className="p-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              value={ticket.priceFloor ?? ''}
                              onChange={(e) => updateTicket(ticket.id, 'priceFloor', e.target.value)}
                              className="mgmt-input-light pl-5 font-bold text-amber-600 text-sm"
                              min={0} step={50} placeholder="—"
                            />
                          </div>
                        </td>
                        {/* Lower Stand Price */}
                        <td className="p-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              value={ticket.priceLower ?? ''}
                              onChange={(e) => updateTicket(ticket.id, 'priceLower', e.target.value)}
                              className="mgmt-input-light pl-5 font-bold text-emerald-700 text-sm"
                              min={0} step={50} placeholder="—"
                            />
                          </div>
                        </td>
                        {/* Upper Stand Price */}
                        <td className="p-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              value={ticket.priceUpper ?? ticket.price}
                              onChange={(e) => updateTicket(ticket.id, 'priceUpper', e.target.value)}
                              className="mgmt-input-light pl-5 font-bold text-blue-700 text-sm"
                              min={0} step={50} placeholder="—"
                            />
                          </div>
                          <p className="text-[8px] text-slate-400 mt-1 text-center">(shown as &quot;from&quot; price)</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

      </main>

      {/* Floating Action bottom publish bar */}
      <div className="bg-white border-t border-slate-200 py-4 px-6 sticky bottom-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm font-semibold">
            {publishMsg ? (
              <span className={publishState === 'success' ? 'text-emerald-700' : 'text-rose-600'}>
                {publishMsg}
              </span>
            ) : dirtyCount > 0 ? (
              <span className="text-amber-700">
                ⚠️ You have {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''} in the table.
              </span>
            ) : (
              <span className="text-slate-400">All modifications are currently published live.</span>
            )}
          </div>

          <button
            id="publish-updates-btn"
            onClick={handlePublish}
            disabled={publishState === 'saving'}
            className={`font-bold py-2.5 px-6 rounded text-xs uppercase tracking-wider transition-all shadow-sm ${
              publishState === 'saving'
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {publishState === 'saving' ? 'Publishing changes...' : 'Publish Updates Live'}
          </button>
        </div>
      </div>

    </div>
  );
}
