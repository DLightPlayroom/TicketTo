'use client';

import { useState, useEffect } from 'react';
import { GlassPopup, GlassAlert, GlassConfirm, AlertType } from '@/components/ui';

type ToolType = 'PC' | 'Laptop' | 'VR Headset';

interface Tool {
    id: string;
    placeId: string;
    name: string;
    type: ToolType;
    parameters?: string;
    createdAt?: string;
}

interface Place {
    id: string;
    name: string;
    address?: string;
    tools?: Tool[];
}

export default function PlacesPage() {
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newAddress, setNewAddress] = useState('');

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

    // Edit Modal state (Consolidated)
    const [editingPlace, setEditingPlace] = useState<Place | null>(null);
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');

    // Tools management state (Integrated into Edit Modal)
    const [tools, setTools] = useState<Tool[]>([]);
    const [loadingTools, setLoadingTools] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [toolName, setToolName] = useState('');
    const [toolType, setToolType] = useState<ToolType>('PC');
    const [toolParameters, setToolParameters] = useState('');
    const [toolMacAddress, setToolMacAddress] = useState('');

    useEffect(() => {
        fetchPlaces();
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

    const fetchPlaces = async () => {
        try {
            const res = await fetch('/api/admin/places');
            if (res.ok) {
                const data = await res.json();
                setPlaces(data);
            }
        } catch (err) {
            console.error('Failed to fetch places', err);
            showAlert('error', 'Error', 'Failed to load places');
        } finally {
            setLoading(false);
        }
    };

    // Create Place
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/admin/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, address: newAddress }),
            });

            if (res.ok) {
                showAlert('success', 'Success', 'Place created successfully!');
                setNewName('');
                setNewAddress('');
                fetchPlaces();
            } else {
                const data = await res.json();
                showAlert('error', 'Creation Failed', data.error || 'Failed to create place');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An unexpected error occurred');
        }
    };

    // Edit Logic
    const openEditModal = async (place: Place) => {
        setEditingPlace(place);
        setEditName(place.name);
        setEditAddress(place.address || '');

        // Fetch Tools for this place
        setLoadingTools(true);
        try {
            const res = await fetch(`/api/admin/places/${place.id}/tools`);
            if (res.ok) {
                const data = await res.json();
                setTools(data);
            }
        } catch (err) {
            console.error('Failed to load tools', err);
            showAlert('error', 'Error', 'Failed to load tools');
        } finally {
            setLoadingTools(false);
        }
    };

    const closeEditModal = () => {
        setEditingPlace(null);
        setEditName('');
        setEditAddress('');
        // Reset tools state
        setTools([]);
        setEditingTool(null);
        setToolName('');
        setToolType('PC');
        setToolParameters('');
        setToolMacAddress('');
    };

    const handleUpdatePlace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlace) return;

        try {
            const res = await fetch(`/api/admin/places/${editingPlace.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, address: editAddress }),
            });

            if (res.ok) {
                showAlert('success', 'Success', 'Place updated successfully!');
                closeEditModal();
                fetchPlaces();
            } else {
                const data = await res.json();
                showAlert('error', 'Update Failed', data.error || 'Failed to update place');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An unexpected error occurred while updating');
        }
    };

    // Delete Place Logic
    const handleDeletePlaceClick = () => {
        if (!editingPlace) return;
        showConfirm(
            'Delete Place',
            `Are you sure you want to delete ${editingPlace.name}? This action cannot be undone.`,
            () => handleDeletePlace(editingPlace.id)
        );
    };

    const handleDeletePlace = async (id: string) => {
        setConfirmLoading(true);
        try {
            const res = await fetch(`/api/admin/places/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setConfirmOpen(false);
                showAlert('success', 'Deleted', 'Place deleted successfully');
                closeEditModal();
                fetchPlaces();
            } else {
                const data = await res.json();
                setConfirmOpen(false);
                showAlert('error', 'Error', data.error || 'Failed to delete place');
            }
        } catch (err) {
            setConfirmOpen(false);
            showAlert('error', 'Error', 'An error occurred while deleting');
        } finally {
            setConfirmLoading(false);
        }
    };

    // Tool Management Logic
    const handleAddTool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlace) return;

        try {
            const res = await fetch(`/api/admin/places/${editingPlace.id}/tools`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: toolName,
                    type: toolType,
                    parameters: toolParameters,
                    id: toolMacAddress
                }),
            });

            if (res.ok) {
                const newTool = await res.json();
                setTools([...tools, newTool]);
                showAlert('success', 'Success', 'Tool added successfully!');
                // Reset form
                setToolName('');
                setToolType('PC');
                setToolParameters('');
                setToolMacAddress('');
            } else {
                const data = await res.json();
                showAlert('error', 'Error', data.error || 'Failed to add tool');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred while adding tool');
        }
    };

    const handleEditToolClick = (tool: Tool) => {
        setEditingTool(tool);
        setToolName(tool.name);
        setToolType(tool.type);
        setToolParameters(tool.parameters || '');
        setToolMacAddress(tool.id);
    };

    const handleUpdateTool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlace || !editingTool) return;

        try {
            const res = await fetch(`/api/admin/places/${editingPlace.id}/tools/${encodeURIComponent(editingTool.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: toolName,
                    type: toolType,
                    parameters: toolParameters,
                    id: toolMacAddress // Pass new MAC address
                }),
            });

            if (res.ok) {
                // Update tools list
                setTools(tools.map(t => t.id === editingTool.id ? {
                    ...t,
                    name: toolName,
                    type: toolType,
                    parameters: toolParameters
                } : t));
                showAlert('success', 'Success', 'Tool updated successfully!');
                // Reset form
                setEditingTool(null);
                setToolName('');
                setToolType('PC');
                setToolParameters('');
                setToolMacAddress('');
            } else {
                const data = await res.json();
                showAlert('error', 'Error', data.error || 'Failed to update tool');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred while updating tool');
        }
    };

    const handleDeleteToolClick = (toolId: string) => {
        showConfirm(
            'Delete Tool',
            'Are you sure you want to delete this tool?',
            () => handleDeleteTool(toolId)
        );
    };

    const handleDeleteTool = async (toolId: string) => {
        if (!editingPlace) return;

        setConfirmLoading(true);
        try {
            const res = await fetch(`/api/admin/places/${editingPlace.id}/tools/${encodeURIComponent(toolId)}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setTools(tools.filter(t => t.id !== toolId));
                setConfirmOpen(false);
                showAlert('success', 'Deleted', 'Tool deleted successfully');
            } else {
                const data = await res.json();
                setConfirmOpen(false);
                showAlert('error', 'Error', data.error || 'Failed to delete tool');
            }
        } catch (err) {
            setConfirmOpen(false);
            showAlert('error', 'Error', 'An error occurred while deleting tool');
        } finally {
            setConfirmLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white">Manage Places</h1>
                    <a href="/admin" className="text-white/80 hover:text-white">&larr; Back to Dashboard</a>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Create Place Form (Always visible) */}
                    <div className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg">
                        <h2 className="mb-4 text-xl font-semibold text-white">Create Place</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80">Address (Optional)</label>
                                <input
                                    type="text"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full rounded-lg bg-white py-2 font-bold text-purple-600 transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                Create Place
                            </button>
                        </form>
                    </div>

                    {/* Places List */}
                    <div className="lg:col-span-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg">
                        <h2 className="mb-4 text-xl font-semibold text-white">Existing Places</h2>
                        {loading ? (
                            <p className="text-white/60">Loading...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/20">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Address</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/20 bg-white/5">
                                        {places.map((place) => (
                                            <tr key={place.id}>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">{place.name}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-white/80">{place.address || '—'}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                    <button
                                                        onClick={() => openEditModal(place)}
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

            {/* Consolidated Edit Modal */}
            <GlassPopup
                isOpen={!!editingPlace}
                onClose={closeEditModal}
                title={editingPlace ? `Edit Place: ${editingPlace.name}` : 'Edit Place'}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
                {/* Place Details Form */}
                <form onSubmit={handleUpdatePlace} className="mb-8 border-b border-white/10 pb-8">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">Place Details</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-foreground/80">Name</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/80">Address</label>
                            <input
                                type="text"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            className="rounded-lg bg-foreground px-6 py-2 font-bold text-background transition hover:bg-foreground/90"
                        >
                            Update Details
                        </button>
                    </div>
                </form>

                {/* Tools Management Section */}
                <div className="mb-8">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">Manage Tools</h3>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Tools List */}
                        <div>
                            <h4 className="mb-3 text-sm font-medium text-foreground/80">Existing Tools</h4>
                            {loadingTools ? (
                                <p className="text-muted-foreground">Loading tools...</p>
                            ) : tools.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No tools added yet</p>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {tools.map((tool) => (
                                        <div
                                            key={tool.id}
                                            className="rounded-lg bg-white/5 border border-white/10 p-3"
                                        >
                                            <div className="mb-2">
                                                <p className="font-semibold text-foreground">{tool.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {tool.type} | MAC: {tool.id.startsWith('tool-') ? 'N/A' : tool.id}
                                                </p>
                                                {tool.parameters && (
                                                    <p className="mt-1 text-sm text-muted-foreground/80">{tool.parameters}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditToolClick(tool)}
                                                    className="rounded bg-blue-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600 transition"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteToolClick(tool.id)}
                                                    className="rounded bg-red-500/80 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 transition"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add/Edit Tool Form */}
                        <div>
                            <h4 className="mb-3 text-sm font-medium text-foreground/80">
                                {editingTool ? 'Edit Tool' : 'Add New Tool'}
                            </h4>
                            <form onSubmit={editingTool ? handleUpdateTool : handleAddTool} className="space-y-4 rounded-lg bg-white/5 p-4 border border-white/10">
                                <div>
                                    <label className="block text-xs font-medium text-foreground/70">Tool Name</label>
                                    <input
                                        type="text"
                                        value={toolName}
                                        onChange={(e) => setToolName(e.target.value)}
                                        className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                                        placeholder="Gaming PC 1"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-foreground/70">Tool Type</label>
                                    <select
                                        value={toolType}
                                        onChange={(e) => setToolType(e.target.value as ToolType)}
                                        className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20 [&>option]:text-gray-900 [&>option]:bg-white"
                                        required
                                    >
                                        <option value="PC">PC</option>
                                        <option value="Laptop">Laptop</option>
                                        <option value="VR Headset">VR Headset</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-foreground/70">Parameters (Optional)</label>
                                    <textarea
                                        value={toolParameters}
                                        onChange={(e) => setToolParameters(e.target.value)}
                                        className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                                        placeholder="RTX 4090, 32GB RAM..."
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-foreground/70">MAC Address (Optional)</label>
                                    <input
                                        type="text"
                                        value={toolMacAddress}
                                        onChange={(e) => setToolMacAddress(e.target.value)}
                                        className="mt-1 block w-full rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                                        placeholder="AA:BB:CC:DD:EE:FF"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTool(null);
                                            setToolName('');
                                            setToolType('PC');
                                            setToolParameters('');
                                            setToolMacAddress('');
                                        }}
                                        className="flex-1 rounded border border-white/10 bg-white/5 py-1.5 text-sm font-bold text-foreground transition hover:bg-white/10"
                                        disabled={!editingTool && !toolName && !toolParameters && !toolMacAddress}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 rounded bg-foreground py-1.5 text-sm font-bold text-background transition hover:bg-foreground/90"
                                    >
                                        {editingTool ? 'Update Tool' : 'Add Tool'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="border-t border-white/10 pt-6">
                    <h3 className="mb-4 text-lg font-semibold text-red-400">Danger Zone</h3>
                    <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                        <div>
                            <p className="font-medium text-red-200">Delete this place</p>
                            <p className="text-sm text-red-200/60">Once you delete a place, there is no going back. Please be certain.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDeletePlaceClick}
                            className="rounded-lg bg-red-500/20 px-4 py-2 font-bold text-red-200 transition hover:bg-red-500/30 border border-red-500/30"
                        >
                            Delete Place
                        </button>
                    </div>
                </div>
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
