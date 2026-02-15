import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';
import { CreateGameInput } from '@/lib/data-provider/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const provider = await getDataProvider();
    const games = await provider.getGames();
    return NextResponse.json(games);
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateGameInput = await request.json();
        if (!body.name) {
            return NextResponse.json({ error: 'Name required' }, { status: 400 });
        }

        const provider = await getDataProvider();
        const game = await provider.createGame(body);

        return NextResponse.json(game);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
