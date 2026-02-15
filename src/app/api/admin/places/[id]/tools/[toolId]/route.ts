import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDataProvider } from '@/lib/data-provider';

// PUT /api/admin/places/[id]/tools/[toolId] - Update tool
// DELETE /api/admin/places/[id]/tools/[toolId] - Delete tool
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; toolId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id, toolId } = await params;
        const body = await req.json();
        const provider = await getDataProvider();

        let newId = body.id;
        if (newId === "") {
            // User cleared the MAC address, generate a new internal ID
            newId = `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }

        await provider.updateTool(id, toolId, {
            name: body.name,
            type: body.type,
            parameters: body.parameters,
            id: newId, // Support renaming/changing MAC
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update tool error:', error);
        return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; toolId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id, toolId } = await params;
        const provider = await getDataProvider();

        await provider.deleteTool(id, toolId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete tool error:', error);
        return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
    }
}
