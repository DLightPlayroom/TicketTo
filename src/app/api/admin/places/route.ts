import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';
import { Place } from '@/lib/data-provider/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const provider = await getDataProvider();
    const places = await provider.getPlaces();
    return NextResponse.json(places);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, address } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const provider = await getDataProvider();
        const place = await provider.createPlace(name, address);

        return NextResponse.json(place);
    } catch (error) {
        console.error('Create Place Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
