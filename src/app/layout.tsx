import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArenaPass | FIFA World Cup 2026 Tickets",
  description:
    "Buy FIFA World Cup 2026 tickets. Group Stage through the Final — instant delivery with 100% FanProtect Guarantee.",
  keywords: "World Cup tickets, FIFA 2026, football tickets, VIP match tickets",
  openGraph: {
    title: "ArenaPass | FIFA World Cup 2026 Tickets",
    description: "Buy FIFA World Cup 2026 tickets with instant delivery and full buyer protection.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Suppress browser-extension errors (MetaMask, etc.) leaking into the app */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var origOnError = window.onerror;
                window.onerror = function(msg, src) {
                  if (src && src.indexOf('chrome-extension://') !== -1) return true;
                  if (typeof msg === 'string' && (msg.indexOf('MetaMask') !== -1 || msg.indexOf('extension') !== -1)) return true;
                  if (origOnError) return origOnError.apply(this, arguments);
                };
                window.addEventListener('unhandledrejection', function(e) {
                  var msg = e && e.reason && (e.reason.message || String(e.reason));
                  if (msg && (msg.indexOf('MetaMask') !== -1 || msg.indexOf('chrome-extension') !== -1)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
