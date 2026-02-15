import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDataProvider } from '@/lib/data-provider';

// POST /api/admin/users/[id]/places - Add place to user
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { placeId } = body;

        if (!placeId) {
            return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
        }

        const provider = await getDataProvider();
        await provider.addPlaceToUser(id, placeId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Add place to user error:', error);
        return NextResponse.json({ error: 'Failed to add place to user' }, { status: 500 });
    }
}
