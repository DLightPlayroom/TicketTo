"use client";

import { useEffect, useState } from "react";
import { Game, Ticket } from "@/lib/data-provider/types";
import { GlassCard } from "@/components/ui/glass-card";
import { Logo } from '@/components/ui/logo';

export default function DashboardPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedGame, setSelectedGame] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [desc, setDesc] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string>("");
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [gamesRes, ticketsRes] = await Promise.all([
                    fetch('/api/games'),
                    fetch('/api/tickets')
                ]);

                if (gamesRes.ok) {
                    const gamesData = await gamesRes.json();
                    setGames(gamesData);
                }

                if (ticketsRes.ok) {
                    const ticketsData = await ticketsRes.json();
                    setTickets(ticketsData);
                }
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Auto-sync every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            handleSync(true); // silent sync
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleSync = async (silent = false) => {
        if (!silent) setIsSyncing(true);
        try {
            // Call sync endpoint
            const syncRes = await fetch('/api/trello/sync', { method: 'POST' });

            if (syncRes.ok) {
                const data = await syncRes.json();

                // Only refresh tickets if we had updates or if it was a manual sync (to be sure)
                if (data.updatedCount > 0 || !silent) {
                    if (!silent && data.updatedCount > 0) {
                        setMessage(`Sync complete! Updated ${data.updatedCount} tickets.`);
                        setTimeout(() => setMessage(""), 3000);
                    } else if (!silent) {
                        setMessage("Sync complete! No updates found.");
                        setTimeout(() => setMessage(""), 3000);
                    }

                    // Refresh tickets
                    const ticketsRes = await fetch('/api/tickets');
                    if (ticketsRes.ok) {
                        const ticketsData = await ticketsRes.json();
                        setTickets(ticketsData);
                    }
                }
            }
        } catch (error) {
            console.error("Sync failed", error);
            if (!silent) {
                setMessage("Failed to sync with Trello.");
                setTimeout(() => setMessage(""), 3000);
            }
        } finally {
            if (!silent) setIsSyncing(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedGame.trim() || !title.trim() || !desc.trim()) {
            setMessage("Please fill in all fields.");
            return;
        }

        setSubmitting(true);
        setMessage("");

        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: selectedGame,
                    title: title,
                    description: desc
                    // user is handled by session in API
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessage("Ticket submitted successfully!");
                setTitle("");
                setDesc("");
                setSelectedGame("");
                if (data.ticket) {
                    setTickets(prev => [data.ticket, ...prev]);

                    // Trigger a sync after submission to potentially get Trello card URL if created async (though unrelated strictly to basic creation, good practice)
                    setTimeout(() => handleSync(true), 1000);
                }
            } else {
                setMessage("Failed to submit ticket.");
            }
        } catch (error) {
            setMessage("Error submitting ticket.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            <div className="mx-auto max-w-5xl">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                            User Dashboard
                        </h1>
                        <p className="mt-2 text-white/80">
                            Manage your tickets and report issues.
                        </p>
                    </div>
                    <button
                        onClick={() => handleSync(false)}
                        disabled={isSyncing}
                        className={`rounded-lg bg-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/30 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSyncing ? 'Syncing...' : 'Sync Trello'}
                    </button>
                </header>

                <div className="grid gap-8 md:grid-cols-2">
                    {/* Create Ticket Form */}
                    <GlassCard className="p-8">
                        <h2 className="mb-6 text-2xl font-semibold text-white">
                            Report a Bug
                        </h2>
                        {message && (
                            <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("success") || message.includes("Sync complete") ? "bg-green-500/20 text-green-100 border border-green-500/50" : "bg-red-500/20 text-red-100 border border-red-500/50"}`}>
                                {message}
                            </div>
                        )}
                        <form className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-white/80">
                                    Select Game
                                </label>
                                <select
                                    className="block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                    value={selectedGame}
                                    onChange={(e) => setSelectedGame(e.target.value)}
                                >
                                    <option value="" className="bg-purple-900 text-white">Select a game...</option>
                                    {games.map((g) => (
                                        <option key={g.id} value={g.id} className="bg-purple-900 text-white">
                                            {g.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-white/80">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    className="block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                    placeholder="Brief summary of the issue"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-white/80">
                                    Description
                                </label>
                                <textarea
                                    rows={4}
                                    className="block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    placeholder="Describe the issue in detail..."
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full rounded-lg bg-white py-3 font-bold text-purple-600 transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
                            >
                                {submitting ? "Submitting..." : "Submit Ticket"}
                            </button>
                        </form>
                    </GlassCard>

                    {/* Ticket List */}
                    <GlassCard className="p-8">
                        <h2 className="mb-6 text-2xl font-semibold text-white">
                            My Tickets
                        </h2>
                        <div className="space-y-4">
                            {loading && tickets.length === 0 ? (
                                <div className="text-center py-8 text-white/60">Loading tickets...</div>
                            ) : tickets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="rounded-full bg-white/10 p-4">
                                        <svg
                                            className="h-8 w-8 text-white/60"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                            />
                                        </svg>
                                    </div>
                                    <p className="mt-4 text-white/60">
                                        No tickets found. Start by creating one!
                                    </p>
                                </div>
                            ) : (
                                tickets.map((ticket) => (
                                    <div key={ticket.id} className="rounded-lg border border-white/20 bg-white/10 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${ticket.status === 'DONE' ? 'bg-green-500/20 text-green-200 border border-green-500/50' :
                                                ticket.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-200 border border-blue-500/50' :
                                                    'bg-white/20 text-white/80 border border-white/30'
                                                }`}>
                                                {ticket.status}
                                            </span>
                                            <span className="text-xs text-white/60">
                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-2">{ticket.title}</h3>
                                        <p className="text-sm text-white/80 whitespace-pre-wrap">
                                            {ticket.description}
                                        </p>
                                        <p className="mt-2 text-xs text-white/60">
                                            Game: {games.find(g => g.id === ticket.gameId)?.name || 'Unknown'}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

