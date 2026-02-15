'use client';

import { useState, useEffect, useMemo } from 'react';
import { GlassAlert, AlertType } from '@/components/ui';

interface Game {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
}

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: 'NEW' | 'IN_PROGRESS' | 'DONE';
    gameId: string;
    userId: string;
    trelloCardId?: string;
    trelloCardUrl?: string;
    createdAt: string; // ISO string from JSON
}

export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter & Sort State
    const [filterGameId, setFilterGameId] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Alert State
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertType, setAlertType] = useState<AlertType>('info');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertTitle, setAlertTitle] = useState('');

    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    // Auto-sync every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            handleSync(true); // silent sync
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ticketsRes, gamesRes, usersRes] = await Promise.all([
                fetch('/api/tickets'),
                fetch('/api/games'),
                fetch('/api/admin/users')
            ]);

            if (ticketsRes.ok && gamesRes.ok && usersRes.ok) {
                const ticketsData = await ticketsRes.json();
                const gamesData = await gamesRes.json();
                const usersData = await usersRes.json();

                setTickets(ticketsData);
                setGames(gamesData);
                setUsers(usersData);
            } else {
                throw new Error('Failed to fetch data');
            }
        } catch (err) {
            console.error('Data fetch error:', err);
            showAlert('error', 'Error', 'Failed to load tickets data');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (silent = false) => {
        if (!silent) setIsSyncing(true);
        try {
            const res = await fetch('/api/trello/sync', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (!silent && data.updatedCount > 0) {
                    showAlert('success', 'Sync Complete', `Updated ${data.updatedCount} tickets from Trello.`);
                }
                // Always refresh data after sync if changes might have happened
                if (data.updatedCount > 0) {
                    const ticketsRes = await fetch('/api/tickets');
                    if (ticketsRes.ok) {
                        setTickets(await ticketsRes.json());
                    }
                }
            }
        } catch (error) {
            console.error('Sync failed', error);
            if (!silent) showAlert('error', 'Sync Failed', 'Failed to sync with Trello.');
        } finally {
            if (!silent) setIsSyncing(false);
        }
    };

    const showAlert = (type: AlertType, title: string, message: string) => {
        setAlertType(type);
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertOpen(true);
    };

    // Derived Query for Filtering & Sorting
    const processedTickets = useMemo(() => {
        let result = [...tickets];

        // 1. Filter by Game
        if (filterGameId) {
            result = result.filter(t => t.gameId === filterGameId);
        }

        // 2. Sort by Created Date
        result.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return result;
    }, [tickets, filterGameId, sortDirection]);

    const getGameName = (gameId: string) => {
        return games.find(g => g.id === gameId)?.name || 'Unknown Game';
    };

    const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? `${user.name} (${user.email})` : userId;
    };

    const toggleSort = () => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white">Manage Tickets</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleSync(false)}
                            disabled={isSyncing}
                            className={`rounded-lg bg-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/30 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSyncing ? 'Syncing...' : 'Sync Trello'}
                        </button>
                        <a href="/admin" className="text-white/80 hover:text-white transition-colors flex items-center">&larr; Back to Dashboard</a>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="mb-6 flex flex-wrap gap-4 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 shadow-lg">
                    {/* Game Filter */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="gameFilter" className="text-sm font-medium text-white/90">Filter by Game:</label>
                        <select
                            id="gameFilter"
                            value={filterGameId}
                            onChange={(e) => setFilterGameId(e.target.value)}
                            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-white focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                        >
                            <option value="" className="bg-zinc-800">All Games</option>
                            {games.map(game => (
                                <option key={game.id} value={game.id} className="bg-zinc-800">
                                    {game.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Toggle */}
                    <button
                        onClick={toggleSort}
                        className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 text-white hover:bg-white/20 transition-colors"
                    >
                        <span>Sort Date:</span>
                        <span className="font-bold">{sortDirection === 'asc' ? 'Oldest First' : 'Newest First'}</span>
                    </button>

                    <div className="ml-auto text-white/80 text-sm flex items-center">
                        Total Tickets: {processedTickets.length}
                    </div>
                </div>

                {/* Tickets Table */}
                <div className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <p className="text-white/60 animate-pulse">Loading tickets...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/20">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Game</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Created At</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Trello</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/20 bg-white/5">
                                    {processedTickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                                                No tickets found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        processedTickets.map((ticket) => (
                                            <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-white">{ticket.title}</div>
                                                    <div className="text-xs text-white/60 mt-1 max-w-xs">{ticket.description}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                    {getGameName(ticket.gameId)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                    {getUserName(ticket.userId)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 border ${ticket.status === 'DONE' ? 'bg-green-500/20 text-green-200 border-green-500/50' :
                                                        ticket.status === 'IN_PROGRESS' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/50' :
                                                            'bg-blue-500/20 text-blue-200 border-blue-500/50'
                                                        }`}>
                                                        {ticket.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                                    {ticket.trelloCardUrl ? (
                                                        <a
                                                            href={ticket.trelloCardUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-300 hover:text-blue-200 hover:underline inline-flex items-center gap-1"
                                                        >
                                                            View Card &rarr;
                                                        </a>
                                                    ) : (
                                                        <span className="text-white/40">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <GlassAlert
                isOpen={alertOpen}
                onClose={() => setAlertOpen(false)}
                type={alertType}
                title={alertTitle}
                message={alertMessage}
            />
        </div>
    );
}
