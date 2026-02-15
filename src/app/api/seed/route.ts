import { NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/data-provider';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const provider = await getDataProvider();

        // Create Admin
        const adminEmail = 'admin@example.com';
        const existing = await provider.getUserByEmail(adminEmail);

        if (!existing) {
            await provider.createUser({
                name: 'Admin User',
                email: adminEmail,
                isAdmin: true,
                password: 'password123',
            });
            return NextResponse.json({ success: true, message: 'Admin created' });
        }

        // Create Games
        const games = await provider.getGames();
        if (games.length === 0) {
            await provider.createGame({ name: 'Pacman', trelloListId: 'list_123' });
            await provider.createGame({ name: 'Pinball', trelloListId: 'list_456' });
        }

        return NextResponse.json({ success: true, message: 'Already seeded' });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
