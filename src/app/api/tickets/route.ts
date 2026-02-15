import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';
import { getSession } from '@/lib/auth';
import { CreateTicketInput } from '@/lib/data-provider/types';
import { createTrelloCard } from '@/lib/trello';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: { gameId: string; title: string; description: string } = await request.json();

        if (!body.gameId || !body.title || !body.description) {
            return NextResponse.json({ error: 'Game, Title, and Description required' }, { status: 400 });
        }

        const provider = await getDataProvider();

        // Create Ticket in database first
        const ticket = await provider.createTicket({
            userId: session.userId,
            gameId: body.gameId,
            title: body.title,
            description: body.description,
        });

        // Get game details to retrieve Trello list ID
        const game = await provider.getGameById(body.gameId);

        if (!game) {
            return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        }

        // Create Trello card asynchronously
        // Prioritize trelloListMap.NEW, fall back to trelloListId
        const targetListId = game.trelloListMap?.NEW || game.trelloListId;

        if (targetListId) {
            createTrelloCard(
                targetListId,
                ticket.title,
                body.description
            )
                .then(async ({ cardId, cardUrl }) => {
                    await provider.updateTicket(ticket.id, {
                        trelloCardId: cardId,
                        trelloCardUrl: cardUrl,
                    });
                    console.log(`Trello card created for ticket ${ticket.id}: ${cardUrl}`);
                })
                .catch((error) => {
                    console.error(`Failed to create Trello card for ticket ${ticket.id}:`, error);
                });
        } else {
            console.warn(`No Trello List ID configured for Game ${game.name}`);
        }

        return NextResponse.json({ ticket });
    } catch (error) {
        console.error('Create Ticket Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = await getDataProvider();

    // Admin sees all, User sees theirs
    if (session.isAdmin) {
        const tickets = await provider.getAllTickets();
        return NextResponse.json(tickets);
    } else {
        const tickets = await provider.getTicketsByUser(session.userId);
        return NextResponse.json(tickets);
    }
}
