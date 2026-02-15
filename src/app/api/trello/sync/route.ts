import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';
import { getSession } from '@/lib/auth';
import { TicketStatus } from '@/lib/data-provider/types';

export const dynamic = 'force-dynamic';

const TRELLO_API_BASE = 'https://api.trello.com/1';

async function getTrelloCardListId(cardId: string): Promise<string | null> {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;

    if (!apiKey || !token) return null;

    try {
        const url = `${TRELLO_API_BASE}/cards/${cardId}?fields=idList&key=${apiKey}&token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.idList;
    } catch (error) {
        console.error('Error fetching Trello card:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const provider = await getDataProvider();
        const tickets = await provider.getAllTickets();
        const games = await provider.getGames();

        let updatedCount = 0;

        // Process only active tickets that have a Trello Card ID
        const activeTickets = tickets.filter(t => t.trelloCardId);

        for (const ticket of activeTickets) {
            const game = games.find(g => g.id === ticket.gameId);

            // Skip if game doesn't have mapping configuration
            if (!game || !game.trelloListMap) continue;

            const currentTrelloListId = await getTrelloCardListId(ticket.trelloCardId!);

            if (!currentTrelloListId) continue;

            let newStatus: TicketStatus | null = null;

            // Check which status this list ID corresponds to
            if (currentTrelloListId === game.trelloListMap.NEW) newStatus = 'NEW';
            else if (currentTrelloListId === game.trelloListMap.IN_PROGRESS) newStatus = 'IN_PROGRESS';
            else if (currentTrelloListId === game.trelloListMap.DONE) newStatus = 'DONE';

            // If found a matching status and it's different from current, update
            if (newStatus && newStatus !== ticket.status) {
                await provider.updateTicket(ticket.id, { status: newStatus });
                updatedCount++;
                console.log(`Updated Ticket ${ticket.id} status to ${newStatus}`);
            }
        }

        return NextResponse.json({ success: true, updatedCount });
    } catch (error) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
