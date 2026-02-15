'use client';

import { useState, useEffect } from 'react';
import { GlassPopup, GlassAlert, GlassConfirm, AlertType } from '@/components/ui';

interface Game {
    id: string;
    name: string;
    trelloListId?: string;
    trelloListMap?: {
        NEW?: string;
        IN_PROGRESS?: string;
        DONE?: string;
    };
}

export default function GamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [trelloListId, setTrelloListId] = useState('');

    // Alert state
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertType, setAlertType] = useState<AlertType>('info');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertTitle, setAlertTitle] = useState('');

    // Confirm state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Edit modal state
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [editName, setEditName] = useState('');
    const [editTrelloListId, setEditTrelloListId] = useState('');
    const [editMapNew, setEditMapNew] = useState('');
    const [editMapProgress, setEditMapProgress] = useState('');
    const [editMapDone, setEditMapDone] = useState('');

    useEffect(() => {
        fetchGames();
    }, []);

    const showAlert = (type: AlertType, title: string, message: string) => {
        setAlertType(type);
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertOpen(true);
    };

    const showConfirm = (title: string, message: string, action: () => void) => {
        setConfirmTitle(title);
        setConfirmMessage(message);
        setConfirmAction(() => action);
        setConfirmOpen(true);
    };

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/admin/games');
            if (res.ok) {
                const data = await res.json();
                setGames(data);
            }
        } catch (err) {
            console.error('Failed to fetch games', err);
            showAlert('error', 'Error', 'Failed to load games');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/admin/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, trelloListId }),
            });

            if (res.ok) {
                showAlert('success', 'Game Created', 'Game created successfully!');
                setNewName('');
                setTrelloListId('');
                fetchGames();
            } else {
                const data = await res.json();
                showAlert('error', 'Creation Failed', data.error || 'Failed to create game');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred during creation');
        }
    };

    const openEditModal = (game: Game) => {
        setEditingGame(game);
        setEditName(game.name);
        setEditTrelloListId(game.trelloListId || '');
        setEditMapNew(game.trelloListMap?.NEW || '');
        setEditMapProgress(game.trelloListMap?.IN_PROGRESS || '');
        setEditMapDone(game.trelloListMap?.DONE || '');
    };

    const closeEditModal = () => {
        setEditingGame(null);
        setEditName('');
        setEditTrelloListId('');
        setEditMapNew('');
        setEditMapProgress('');
        setEditMapDone('');
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGame) return;

        try {
            const res = await fetch(`/api/admin/games/${editingGame.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    trelloListId: editTrelloListId,
                    trelloListMap: {
                        NEW: editMapNew,
                        IN_PROGRESS: editMapProgress,
                        DONE: editMapDone
                    }
                }),
            });

            if (res.ok) {
                showAlert('success', 'Success', 'Game updated successfully!');
                closeEditModal();
                fetchGames();
            } else {
                const data = await res.json();
                showAlert('error', 'Update Failed', data.error || 'Failed to update game');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred while updating');
        }
    };

    const handleDeleteClick = (game: Game) => {
        showConfirm(
            'Delete Game',
            `Are you sure you want to delete game ${game.name}? This will also delete all associated tickets. This action cannot be undone.`,
            () => handleDelete(game.id)
        );
    };

    const handleDelete = async (gameId: string) => {
        setConfirmLoading(true);
        try {
            const res = await fetch(`/api/admin/games/${gameId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                showAlert('success', 'Deleted', 'Game deleted successfully!');
                setConfirmOpen(false);
                fetchGames();
            } else {
                const data = await res.json();
                setConfirmOpen(false);
                showAlert('error', 'Error', data.error || 'Failed to delete game');
            }
        } catch (err) {
            setConfirmOpen(false);
            showAlert('error', 'Error', 'An error occurred while deleting');
        } finally {
            setConfirmLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white">Manage Games</h1>
                    <a href="/admin" className="text-white/80 hover:text-white">&larr; Back to Dashboard</a>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Create Game Form */}
                    <div className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg">
                        <h2 className="mb-4 text-xl font-semibold text-white">Create Game</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80">Game Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full rounded-lg bg-white py-2 font-bold text-purple-600 transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                Create Game
                            </button>
                        </form>
                    </div>

                    {/* Games List */}
                    <div className="lg:col-span-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg">
                        <h2 className="mb-4 text-xl font-semibold text-white">Existing Games</h2>
                        {loading ? (
                            <p className="text-white/60">Loading...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/20">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/20 bg-white/5">
                                        {games.map((game) => (
                                            <tr key={game.id}>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">{game.name}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                    <button
                                                        onClick={() => openEditModal(game)}
                                                        className="rounded bg-blue-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal via GlassPopup */}
            <GlassPopup
                isOpen={!!editingGame}
                onClose={closeEditModal}
                title="Edit Game"
            >
                <form onSubmit={handleEdit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/80">Game Name</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                            required
                        />
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-4">
                        <h3 className="text-sm font-semibold text-foreground">Trello Status Mapping (List IDs)</h3>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                                <label className="block text-xs font-medium text-foreground/70">NEW List ID</label>
                                <input
                                    type="text"
                                    value={editMapNew}
                                    onChange={(e) => setEditMapNew(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20 font-mono"
                                    placeholder="List ID for New tickets"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-foreground/70">IN PROGRESS List ID</label>
                                <input
                                    type="text"
                                    value={editMapProgress}
                                    onChange={(e) => setEditMapProgress(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20 font-mono"
                                    placeholder="List ID for In Progress"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-foreground/70">DONE List ID</label>
                                <input
                                    type="text"
                                    value={editMapDone}
                                    onChange={(e) => setEditMapDone(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20 font-mono"
                                    placeholder="List ID for Done"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={closeEditModal}
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 font-bold text-foreground transition hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded-lg bg-foreground py-2 font-bold text-background transition hover:bg-foreground/90"
                        >
                            Save Changes
                        </button>
                    </div>
                    {editingGame && (
                        <div className="border-t border-white/10 pt-4 mt-4">
                            <button
                                type="button"
                                onClick={() => handleDeleteClick(editingGame)}
                                className="w-full rounded-lg bg-red-500/10 py-2 font-bold text-red-500 transition hover:bg-red-500/20"
                            >
                                Delete Game
                            </button>
                        </div>
                    )}
                </form>
            </GlassPopup>

            {/* Global Alert */}
            <GlassAlert
                isOpen={alertOpen}
                onClose={() => setAlertOpen(false)}
                type={alertType}
                title={alertTitle}
                message={alertMessage}
            />

            {/* Global Confirm */}
            <GlassConfirm
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmAction}
                title={confirmTitle}
                message={confirmMessage}
                isLoading={confirmLoading}
                variant="danger"
            />
        </div>
    );
}
