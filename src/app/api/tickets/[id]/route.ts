import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDataProvider } from '@/lib/data-provider';

// GET /api/tickets/[id] - Get ticket by ID
// PUT /api/tickets/[id] - Update ticket (user can update own, admin can update any)
// DELETE /api/tickets/[id] - Delete ticket (user can delete own, admin can delete any)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const provider = await getDataProvider();
        const ticket = await provider.getTicketById(id);

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Check ownership
        const isAdmin = 'isAdmin' in session.user && session.user.isAdmin;
        const userId = session.user.id as string;

        if (!isAdmin && ticket.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Get ticket error:', error);
        return NextResponse.json({ error: 'Failed to get ticket' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const provider = await getDataProvider();

        const isAdmin = 'isAdmin' in session.user && session.user.isAdmin;
        const userId = session.user.id as string;

        if (isAdmin) {
            // Admin can update any ticket
            await provider.updateTicket(id, {
                status: body.status,
                trelloCardId: body.trelloCardId,
                trelloCardUrl: body.trelloCardUrl
            });
        } else {
            // User can only update their own tickets
            await provider.updateTicketByUser(id, userId, {
                title: body.title,
                description: body.description,
                status: body.status
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update ticket error:', error);
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const provider = await getDataProvider();

        const isAdmin = 'isAdmin' in session.user && session.user.isAdmin;
        const userId = session.user.id as string;

        if (isAdmin) {
            // Admin can delete any ticket
            await provider.deleteTicket(id);
        } else {
            // User can only delete their own tickets
            await provider.deleteTicketByUser(id, userId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete ticket error:', error);
        return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
    }
}
