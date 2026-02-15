import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Optional: Check if user is logged in?
    // User dashboard requires login, so yes.
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = await getDataProvider();
    const games = await provider.getGames();
    return NextResponse.json(games);
}
