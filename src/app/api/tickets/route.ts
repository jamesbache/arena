import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'tickets.json');

export interface Ticket {
  id: string;
  matchTeams: string;
  stadiumName: string;
  seatCategory: string;
  price: number;        // = priceUpper (cheapest, shown as "from" on list)
  priceFloor?: number;  // Floor Seat (premium)
  priceLower?: number;  // Lower Stand
  priceUpper?: number;  // Upper Stand (cheapest)
  imageUrl: string;
  date?: string;
  stage?: string;
  group?: string;
  matchNumber?: number;
}

export interface TicketsData {
  cryptoWalletAddress: string;
  tickets: Ticket[];
}

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const data: TicketsData = JSON.parse(raw);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[GET /api/tickets] Error reading data file:', error);
    return NextResponse.json(
      { error: 'Failed to read ticket data.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate structure
    if (
      !body ||
      typeof body.cryptoWalletAddress !== 'string' ||
      !Array.isArray(body.tickets)
    ) {
      return NextResponse.json(
        { error: 'Invalid payload structure.' },
        { status: 400 }
      );
    }

    const data: TicketsData = {
      cryptoWalletAddress: body.cryptoWalletAddress.trim(),
      tickets: body.tickets,
    };

    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');

    return NextResponse.json(
      { success: true, message: 'Data published successfully.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/tickets] Error writing data file:', error);
    return NextResponse.json(
      { error: 'Failed to save ticket data.' },
      { status: 500 }
    );
  }
}
