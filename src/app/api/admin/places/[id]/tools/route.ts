import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDataProvider } from '@/lib/data-provider';

// GET /api/admin/places/[id]/tools - Get all tools for a place
// POST /api/admin/places/[id]/tools - Create a tool for a place
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const provider = await getDataProvider();
        const tools = await provider.getToolsByPlace(id);

        return NextResponse.json(tools);
    } catch (error) {
        console.error('Get tools error:', error);
        return NextResponse.json({ error: 'Failed to get tools' }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !('isAdmin' in session.user) || !session.user.isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();

        // Generate unique ID if MAC address not provided
        const toolId = body.id || `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const provider = await getDataProvider();
        const tool = await provider.createTool({
            placeId: id,
            name: body.name,
            type: body.type,
            id: toolId,
            parameters: body.parameters
        });

        return NextResponse.json(tool);
    } catch (error) {
        console.error('Create tool error:', error);
        return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
    }
}
