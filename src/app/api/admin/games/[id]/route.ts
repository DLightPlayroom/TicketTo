import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDataProvider } from '@/lib/data-provider';

// PUT /api/admin/games/[id] - Update game
// DELETE /api/admin/games/[id] - Delete game
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const provider = await getDataProvider();

        await provider.updateGame(id, {
            name: body.name,
            trelloListId: body.trelloListId,
            trelloListMap: body.trelloListMap
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update game error:', error);
        return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const provider = await getDataProvider();

        await provider.deleteGame(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete game error:', error);
        return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
    }
}
