'use client';

import { useState } from 'react';
import { Ticket } from '@/app/api/tickets/route';

interface PaymentModalProps {
  ticket: Ticket | null;
  walletAddress: string;
  onClose: () => void;
}

const QR_PATTERN = [
  1,1,1,1,1,1,1,0,1,
  1,0,0,0,0,0,1,0,0,
  1,0,1,1,1,0,1,0,1,
  1,0,1,1,1,0,1,0,1,
  1,0,1,1,1,0,1,0,0,
  1,0,0,0,0,0,1,0,1,
  1,1,1,1,1,1,1,0,1,
  0,0,1,0,0,0,0,0,0,
  1,0,1,1,0,1,1,0,1,
];

function getCategoryClass(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes('vip')) return 'badge-vip';
  if (c.includes('1')) return 'badge-cat1';
  if (c.includes('2')) return 'badge-cat2';
  return 'badge-cat3';
}

export default function PaymentModal({ ticket, walletAddress, onClose }: PaymentModalProps) {
  const [copied, setCopied] = useState(false);

  if (!ticket) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = walletAddress;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Viagogo ticket details often show a service fee or subtotal, let's keep it simple but look authentic
  const subtotal = Math.round(ticket.price * 0.85);
  const serviceFee = ticket.price - subtotal;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-content relative w-full max-w-lg rounded-xl overflow-hidden bg-white shadow-2xl text-slate-800"
        style={{
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Viagogo signature style top bar */}
        <div style={{ height: '4px', backgroundColor: '#008a00' }} />

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% Guaranteed Ticket
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Confirm Ticket Reservation
            </h2>
          </div>
          <button
            onClick={onClose}
            id="modal-close-btn"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Event detail block */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">
                {ticket.matchTeams}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                📍 {ticket.stadiumName}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded font-medium ${getCategoryClass(ticket.seatCategory)}`}>
              {ticket.seatCategory}
            </span>
          </div>
        </div>

        {/* Pricing breakdown block */}
        <div className="p-6 border-b border-slate-100 space-y-3">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Ticket Price</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Booking &amp; Service Fee</span>
            <span>${serviceFee.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
            <span className="text-base font-bold text-slate-900">Total Price</span>
            <span className="text-2xl font-extrabold text-slate-900">${ticket.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment instructions */}
        <div className="p-6 bg-emerald-50/50 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 text-xs font-bold flex-shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-950">Payment instructions</h4>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                To guarantee your reservation, transfer the total USD value using crypto to the secure deposit wallet below. Click copy address to ensure accuracy.
              </p>
            </div>
          </div>

          <div className="flex gap-5 items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            {/* Deterministic QR */}
            <div className="p-1 border border-slate-100 rounded bg-white flex-shrink-0">
              <div className="qr-grid">
                {QR_PATTERN.map((cell, i) => (
                  <div
                    key={i}
                    className="qr-cell"
                    style={{ background: cell ? '#0f172a' : '#ffffff' }}
                  />
                ))}
              </div>
            </div>

            {/* Wallet copy block */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Crypto wallet address
              </span>
              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 mb-2 font-mono text-xs text-slate-700 break-all select-all">
                {walletAddress}
              </div>
              <button
                id="copy-wallet-btn"
                onClick={handleCopy}
                className="w-full py-2 px-3 rounded text-xs font-bold text-white transition-colors duration-200"
                style={{
                  backgroundColor: copied ? '#15803d' : '#008a00',
                }}
                onMouseEnter={(e) => { if (!copied) e.currentTarget.style.backgroundColor = '#007000'; }}
                onMouseLeave={(e) => { if (!copied) e.currentTarget.style.backgroundColor = '#008a00'; }}
              >
                {copied ? '✓ Copied Address!' : '⎘ Copy Address'}
              </button>
            </div>
          </div>
        </div>

        {/* Guarantee and note */}
        <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            All tickets on our platform are covered by the <strong>FanProtect Guarantee</strong>. You will receive your tickets before kickoff or your money back.
          </p>
        </div>
      </div>
    </div>
  );
}
