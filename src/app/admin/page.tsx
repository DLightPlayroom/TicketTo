'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/logo';

interface Ticket {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    gameId: string;
    trelloCardUrl?: string;
}

interface Game {
    id: string;
    name: string;
}

export default function AdminDashboard() {
    const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
    const [games, setGames] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ticketsRes, gamesRes] = await Promise.all([
                    fetch('/api/tickets'),
                    fetch('/api/games')
                ]);

                if (ticketsRes.ok && gamesRes.ok) {
                    const ticketsData: Ticket[] = await ticketsRes.json();
                    const gamesData: Game[] = await gamesRes.json();

                    // Create Game Map
                    const gameMap: Record<string, string> = {};
                    gamesData.forEach(g => gameMap[g.id] = g.name);
                    setGames(gameMap);

                    // Sort by createdAt desc and take top 3
                    const sorted = ticketsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setRecentTickets(sorted.slice(0, 3));
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
            <div className="mx-auto max-w-6xl">
                <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold text-white">
                    Admin Dashboard <Logo width={36} height={36} />
                </h1>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Manage Users Card */}
                    <Link href="/admin/users" className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg transition-all hover:shadow-xl hover:bg-white/15">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 transition-all group-hover:scale-150"></div>
                        <h3 className="relative z-10 text-xl font-semibold text-white">Manage Users</h3>
                        <p className="relative z-10 mt-2 text-white/70">Add, edit, and view system users.</p>
                    </Link>

                    {/* Manage Games Card */}
                    <Link href="/admin/games" className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg transition-all hover:shadow-xl hover:bg-white/15">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 transition-all group-hover:scale-150"></div>
                        <h3 className="relative z-10 text-xl font-semibold text-white">Manage Games</h3>
                        <p className="relative z-10 mt-2 text-white/70">Configure games and Trello lists.</p>
                    </Link>

                    {/* Manage Places Card */}
                    <Link href="/admin/places" className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg transition-all hover:shadow-xl hover:bg-white/15">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 transition-all group-hover:scale-150"></div>
                        <h3 className="relative z-10 text-xl font-semibold text-white">Manage Places</h3>
                        <p className="relative z-10 mt-2 text-white/70">Add and manage locations.</p>
                    </Link>

                    {/* Manage Tickets Card */}
                    <Link href="/admin/tickets" className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg transition-all hover:shadow-xl hover:bg-white/15">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 transition-all group-hover:scale-150"></div>
                        <h3 className="relative z-10 text-xl font-semibold text-white">Manage Tickets</h3>
                        <p className="relative z-10 mt-2 text-white/70">View and track support tickets.</p>
                    </Link>

                    {/* Recent 3 Tickets Display */}
                    <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg md:col-span-2">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 transition-all"></div>
                        <h3 className="relative z-10 text-xl font-semibold text-white mb-4">Recent Tickets</h3>
                        <div className="relative z-10 flex flex-col gap-3">
                            {recentTickets.length > 0 ? (
                                recentTickets.map(ticket => (
                                    <a
                                        key={ticket.id}
                                        href={ticket.trelloCardUrl || '#'}
                                        target={ticket.trelloCardUrl ? "_blank" : undefined}
                                        rel={ticket.trelloCardUrl ? "noopener noreferrer" : undefined}
                                        className="block relative rounded-lg bg-white/5 p-3 pr-24 hover:bg-white/10 transition custom-ticket-item group/item"
                                    >
                                        <div className="font-semibold text-white truncate">{ticket.title}</div>
                                        <div className="text-sm text-white/70 line-clamp-1">{ticket.description}</div>
                                        {games[ticket.gameId] && (
                                            <span className="absolute right-3 top-3 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-200 border border-indigo-500/30">
                                                {games[ticket.gameId]}
                                            </span>
                                        )}
                                    </a>
                                ))
                            ) : (
                                <p className="text-white/50 text-sm">No recent tickets found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
