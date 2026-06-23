# ArenaPass — FIFA World Cup 2026 Ticket Marketplace

A full-stack ticket resale marketplace built with **Next.js 14**, styled with **Tailwind CSS**, and powered entirely by a local JSON data store. No external database or third-party ticket API is required.

---

## What This Project Is

ArenaPass is a secondary ticket marketplace website for the FIFA World Cup 2026. Visitors can:

- Browse all **104 World Cup matches** (72 Group Stage + 32 Knockout rounds)
- Filter by stage (Group Stage, Round of 32, Round of 16, Quarter-Finals, Semi-Finals, Final…)
- Filter by group (A through L) within the Group Stage
- Search by team name, stadium, or stage
- See only **upcoming matches** (past matches are hidden by default with a toggle to reveal them)
- Click **"See Tickets"** → choose quantity in a popup → view 3 seat tier options with prices
- Pay via **Bitcoin (crypto)** — the wallet address is shown in a secure payment modal

The site owner manages everything through a **private admin portal** at `/admin-portal`.

---

## Technology Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| Framework | **Next.js** | 14.2.x | Full-stack React — handles both the frontend UI and the backend API routes in one project |
| Language | **TypeScript** | 5.x | Type safety across the full stack |
| Styling | **Tailwind CSS** | 3.x | Utility-first CSS — all UI built without separate CSS files (except globals.css) |
| Font | **Inter** (Google Fonts) | — | Loaded via HTML `<link>` tag (not `next/font/google`) to avoid build-time network issues |
| Runtime | **Node.js** | 18+ | Required by Next.js 14 |
| Package manager | **npm** | — | Standard |
| Data store | **JSON file** | — | `src/data/tickets.json` — no database needed |

### No External APIs Used

Everything runs from local data. The project does **not** call any live sports API, authentication service, or payment processor. The crypto payment flow just shows a wallet address for manual transfer.

---

## Project Structure

```
football-ticket/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Main storefront (public-facing)
│   │   ├── layout.tsx            ← Root HTML layout, fonts, MetaMask error suppressor
│   │   ├── globals.css           ← Global Tailwind base + custom component classes
│   │   ├── admin-portal/
│   │   │   └── page.tsx          ← Private admin dashboard (URL: /admin-portal)
│   │   └── api/
│   │       └── tickets/
│   │           └── route.ts      ← REST API: GET and POST for ticket data
│   ├── components/
│   │   └── PaymentModal.tsx      ← Crypto payment popup shown when user selects a ticket
│   └── data/
│       └── tickets.json          ← THE DATABASE — all 104 matches + prices + wallet address
├── public/                       ← Static assets (empty by default)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## How the Data Works

The entire database is the single file: **`src/data/tickets.json`**

### Structure

```json
{
  "cryptoWalletAddress": "bc1qxyz...",
  "tickets": [
    {
      "id": "1",
      "matchTeams": "Mexico vs South Africa",
      "stadiumName": "Estadio Azteca (Mexico City, Mexico)",
      "seatCategory": "VIP Suite",
      "date": "06/11/2026 20:00",
      "stage": "Group Stage",
      "group": "Group A",
      "matchNumber": 1,
      "priceFloor": 715,
      "priceLower": 418,
      "priceUpper": 154,
      "price": 154,
      "imageUrl": "https://images.unsplash.com/photo-..."
    }
    // ... 103 more tickets
  ]
}
```

### Price Fields

Each ticket has **3 price tiers**:

| Field | Tier Name (shown to users) | Description |
|---|---|---|
| `priceFloor` | ⭐ Floor Seat | Pitch-side premium seats |
| `priceLower` | 🟢 Lower Stand | Lower bowl, great sightlines |
| `priceUpper` | 🔵 Upper Stand | Panoramic upper tier |
| `price` | *(the "from" price)* | Always = `priceUpper` (cheapest) — shown on the match list as "from $X" |

> **Important:** When you change **Upper Stand** price in the admin portal, the "from $X" price on the storefront updates automatically.

### Stage Values

The `stage` field must be one of these exact strings:
- `"Group Stage"`
- `"Round of 32"`
- `"Round of 16"`
- `"Quarter-Finals"`
- `"Semi-Finals"`
- `"3rd Place Play-off"`
- `"Final"`

The `group` field is only used for Group Stage matches: `"Group A"` through `"Group L"`.

---

## API Routes

### `GET /api/tickets`

Returns the full contents of `tickets.json`.

**Response:**
```json
{
  "cryptoWalletAddress": "bc1q...",
  "tickets": [ ... ]
}
```

### `POST /api/tickets`

Overwrites `tickets.json` with the request body. Used by the admin portal when "Publish Updates Live" is clicked.

**Request body:** Same structure as GET response.

**Both routes are defined in:** `src/app/api/tickets/route.ts`

---

## Pages

### `/` — Public Storefront (`src/app/page.tsx`)

This is the main website visitors see. It is a **Client Component** (`'use client'`) because it manages interactive state (filters, modals, pagination).

**Key features:**
- Loads ticket data from `/api/tickets` on mount
- Filters past matches (date < today) by default
- Stage tabs + Group A–L sub-tabs
- Search bar (matches team name, stadium, stage)
- Numbered pagination (20 matches per page)
- **"How many tickets?" modal** — appears when user clicks "See Tickets", lets them choose 1–8 tickets
- **Detail view** — 3 ticket tier cards (Floor Seat, Lower Stand, Upper Stand) with prices
- **Payment modal** — shows Bitcoin wallet address when a tier is selected

### `/admin-portal` — Admin Dashboard (`src/app/admin-portal/page.tsx`)

**This URL is private — not linked from the public site.** Only the site owner knows about it.

Features:
- Edit the **Bitcoin wallet address** (shown in the payment modal on the storefront)
- Edit each match's **Match Teams** name and **Stadium** name
- Set **3 prices per match**: Floor Seat (amber), Lower Stand (green), Upper Stand (blue)
- Changes are highlighted in amber until saved
- **"Publish Updates Live"** button sends all changes to the server instantly — visitors see them immediately with no restart needed

---

## How to Run (for developers)

### Requirements

- **Node.js 18 or higher** — download from https://nodejs.org (choose LTS)
- That's all. No database, no API keys, no `.env` file needed.

### Steps

```bash
# 1. Install dependencies (only needed once)
npm install

# 2. Start the development server
npm run dev

# 3. Open in browser
# Storefront:    http://localhost:3000
# Admin portal:  http://localhost:3000/admin-portal
```

> First time running `npm install` may take 1–2 minutes to download packages.

### Production Build (optional)

```bash
npm run build    # Compile and optimise for production
npm start        # Run the production server
```

---

## How to Change Prices

1. Go to **http://localhost:3000/admin-portal**
2. Scroll to the match you want to update
3. Edit the **Floor Seat**, **Lower Stand**, and/or **Upper Stand** price fields
4. Changed rows highlight in amber — this is normal
5. Click **"Publish Updates Live"** at the bottom of the page
6. Prices are live immediately on the storefront — no restart needed

---

## How to Change the Bitcoin Wallet Address

1. Go to **http://localhost:3000/admin-portal**
2. At the top, find the **"Global Deposit Crypto Wallet Address"** field
3. Replace the address with your new wallet address
4. Click **"Publish Updates Live"**

---

## Fonts

Fonts are loaded using a standard HTML `<link>` tag in `src/app/layout.tsx` (NOT via `next/font/google`).

**Why?** The `next/font/google` package fetches fonts at build time. In environments without internet access during the build (e.g. some CI servers, offline dev machines), it will crash. The HTML `<link>` approach loads fonts at runtime in the browser instead — much safer.

If the user has no internet, the site falls back to the system's default sans-serif font gracefully.

---

## MetaMask Error Suppression

MetaMask (and other browser extensions) inject scripts into every webpage. This sometimes triggers an `"Unhandled Runtime Error: Failed to connect to MetaMask"` popup in Next.js development mode.

A small inline script in `src/app/layout.tsx` silently catches and discards any errors originating from `chrome-extension://` URLs before they reach Next.js's error handler. This is harmless and only suppresses extension noise — it does not affect any app functionality.

---

## Data Persistence

All data is stored in `src/data/tickets.json`. Changes made through the admin portal are written directly to this file via the `POST /api/tickets` API. There is no database, no cache layer, and no environment-specific configuration.

**When zipping to send to another developer:**
- ✅ Include: everything EXCEPT `node_modules/`
- ❌ Exclude: `node_modules/` (it's ~300MB and regenerated with `npm install`)

### 🚂 Deploying to Railway (or Render)

If you host this on Railway, their servers are ephemeral (they reset files on every deploy). To make sure your `tickets.json` price updates are permanently saved:

1. Deploy the repo to Railway as a standard Node.js app.
2. In your Railway project, add a **Volume**.
3. Mount the volume to `/app/src/data` (this is where `tickets.json` lives in the container).
4. Now, any changes you make in the live `/admin-portal` will be saved to the persistent volume and will survive redeploys!

---

## Security Note

The `/admin-portal` route has **no password protection** — it relies on obscurity (the URL is not linked anywhere on the public site). If you deploy this publicly, you should add authentication (e.g. Next.js middleware with a secret cookie check, or HTTP Basic Auth at the server/CDN level).

---

## Match Data

- **Total matches:** 104
- **Group Stage:** 72 (12 groups × 6 matches each)
- **Round of 32:** 16 matches
- **Round of 16:** 8 matches
- **Quarter-Finals:** 4 matches
- **Semi-Finals:** 2 matches
- **3rd Place Play-off:** 1 match
- **Final:** 1 match

Prices are pre-set based on stage importance. Big-team matches (Brazil, France, Argentina, England, Germany, Spain, etc.) are priced ~35% higher within the same stage.
