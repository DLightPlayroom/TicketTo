import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDataProvider } from '@/lib/data-provider';

// DELETE /api/admin/users/[id]/places/[placeId] - Remove place from user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; placeId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id, placeId } = await params;
        const provider = await getDataProvider();

        await provider.removePlaceFromUser(id, placeId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Remove place from user error:', error);
        return NextResponse.json({ error: 'Failed to remove place from user' }, { status: 500 });
    }
}
