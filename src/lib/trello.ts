/**
 * Trello API Integration
 * 
 * Provides functions to interact with Trello API for creating and managing cards.
 */

const TRELLO_API_BASE = 'https://api.trello.com/1';

interface TrelloCardResponse {
    id: string;
    url: string;
    shortUrl: string;
}

/**
 * Create a new card in a Trello list
 * 
 * @param listId - The ID of the Trello list where the card should be created
 * @param name - Card title/name
 * @param desc - Card description
 * @returns Promise with card ID and URL
 */
export async function createTrelloCard(
    listId: string,
    name: string,
    desc: string
): Promise<{ cardId: string; cardUrl: string }> {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;

    if (!apiKey || !token) {
        throw new Error('Trello API credentials not configured');
    }

    const url = new URL(`${TRELLO_API_BASE}/cards`);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('token', token);
    url.searchParams.append('idList', listId);
    url.searchParams.append('name', name);
    url.searchParams.append('desc', desc);

    try {
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Trello API error (${response.status}): ${errorText}`);
        }

        const card: TrelloCardResponse = await response.json();

        return {
            cardId: card.id,
            cardUrl: card.shortUrl || card.url,
        };
    } catch (error) {
        console.error('Failed to create Trello card:', error);
        throw error;
    }
}

/**
 * Update a Trello card's description
 * 
 * @param cardId - The ID of the Trello card to update
 * @param desc - New description
 */
export async function updateTrelloCard(cardId: string, desc: string): Promise<void> {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;

    if (!apiKey || !token) {
        throw new Error('Trello API credentials not configured');
    }

    const url = new URL(`${TRELLO_API_BASE}/cards/${cardId}`);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('token', token);
    url.searchParams.append('desc', desc);

    const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Trello API error (${response.status}): ${errorText}`);
    }
}
