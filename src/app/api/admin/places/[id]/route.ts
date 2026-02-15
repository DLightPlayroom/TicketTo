import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';

export const dynamic = 'force-dynamic';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, address } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const provider = await getDataProvider();
        await provider.updatePlace(id, name, address);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update Place Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const provider = await getDataProvider();
        await provider.deletePlace(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Place Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
