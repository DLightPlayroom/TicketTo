'use client';

import { useState, useEffect } from 'react';
import { GlassPopup, GlassAlert, GlassConfirm, AlertType } from '@/components/ui';
import emailjs from '@emailjs/browser';

interface Place {
    id: string;
    name: string;
    address?: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    isAdmin: boolean;
    createdAt: string;
    places?: Place[];
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [isGoogleAccount, setIsGoogleAccount] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

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
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editIsAdmin, setEditIsAdmin] = useState(false);

    // Places management state (integrated into Edit modal)
    const [allPlaces, setAllPlaces] = useState<Place[]>([]);
    const [userPlaces, setUserPlaces] = useState<Place[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);

    useEffect(() => {
        fetchUsers();
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

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
            showAlert('error', 'Error', 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail,
                    phone: newPhone,
                    isAdmin,
                    isGoogleAccount
                }),
            });

            if (res.ok) {
                const data = await res.json();

                // If Google Account, just show success
                // If Google Account, just show success
                if (data.isGoogleAccount) {
                    showAlert('success', 'User Created', 'Google Account User created successfully! No password generated.');
                } else if (data.emailMode === 'EMAILJS' && data.generatedPassword) {
                    // EMAILJS Mode: Send Email via EmailJS from frontend
                    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
                    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
                    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

                    console.log('Attempting EmailJS send:', {
                        serviceId: serviceId ? 'Set' : 'Missing',
                        templateId: templateId ? 'Set' : 'Missing',
                        publicKey: publicKey ? 'Set' : 'Missing',
                        data: { to_email: newEmail, password: '***', url: window.location.origin }
                    });

                    const message = `Hello ${newName},

Your account has been created successfully.

You can login here: ${window.location.origin}
Your temporary password is: ${data.generatedPassword}

Please change your password after logging in.

Best regards,
TicketTo Team`;

                    if (serviceId && templateId && publicKey) {
                        try {
                            const templateParams = {
                                email: newEmail,
                                to_email: newEmail,
                                title: 'Welcome to TicketTo',
                                message: message
                            };
                            console.log('Sending EmailJS with Params:', templateParams);

                            await emailjs.send(
                                serviceId,
                                templateId,
                                templateParams,
                                publicKey
                            );
                            console.log('EmailJS sent successfully');
                            showAlert('success', 'User Created', `User created & Email sent via EmailJS! Password: ${data.generatedPassword}`);
                        } catch (emailErr) {
                            console.error('EmailJS failed', JSON.stringify(emailErr));
                            // If it's an object with text (EmailJS standard), log that too
                            // @ts-ignore
                            if (emailErr && emailErr.text) console.error('EmailJS Error Text:', emailErr.text);

                            showAlert('warning', 'User Created', `User created but Email failed. Check console for details. Password: ${data.generatedPassword}`);
                        }
                    } else {
                        console.warn('EmailJS credentials missing in .env');
                        showAlert('warning', 'User Created', `User created but EmailJS config missing. Password: ${data.generatedPassword}`);
                    }
                } else {
                    // SMTP Mode: Email sent by backend
                    showAlert('success', 'User Created', 'User created successfully! Email sent via SMTP.');
                }

                setNewName('');
                setNewEmail('');
                setNewPhone('');
                setIsAdmin(false);
                setIsGoogleAccount(false);
                fetchUsers();
            } else {
                const data = await res.json();
                showAlert('error', 'Creation Failed', data.error || 'Failed to create user');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred during creation');
        }
    };

    const openEditModal = async (user: User) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditPhone(user.phone || '');
        setEditIsAdmin(user.isAdmin);

        // Load places for this user
        setLoadingPlaces(true);
        try {
            // Fetch all places
            const placesRes = await fetch('/api/admin/places');
            if (placesRes.ok) {
                const places = await placesRes.json();
                setAllPlaces(places);
            }
            // Set user's current places
            setUserPlaces(user.places || []);
        } catch (err) {
            console.error('Failed to load places', err);
        } finally {
            setLoadingPlaces(false);
        }
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setEditName('');
        setEditEmail('');
        setEditPhone('');
        setEditIsAdmin(false);
        setUserPlaces([]);
        setAllPlaces([]);
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    email: editEmail,
                    phone: editPhone,
                    isAdmin: editIsAdmin
                }),
            });

            if (res.ok) {
                showAlert('success', 'Success', 'User updated successfully!');
                closeEditModal();
                fetchUsers();
            } else {
                const data = await res.json();
                showAlert('error', 'Update Failed', data.error || 'Failed to update user');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred while updating');
        }
    };

    const handleDeleteClick = (user: User) => {
        showConfirm(
            'Delete User',
            `Are you sure you want to delete user ${user.name}? This action cannot be undone.`,
            () => handleDelete(user.id)
        );
    };

    const handleDelete = async (userId: string) => {
        setConfirmLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                showAlert('success', 'Deleted', 'User deleted successfully!');
                setConfirmOpen(false);
                closeEditModal();
                fetchUsers();
            } else {
                const data = await res.json();
                setConfirmOpen(false);
                showAlert('error', 'Error', data.error || 'Failed to delete user');
            }
        } catch (err) {
            setConfirmOpen(false);
            showAlert('error', 'Error', 'An error occurred while deleting');
        } finally {
            setConfirmLoading(false);
        }
    };

    const handleAddPlace = async (placeId: string) => {
        if (!editingUser) return;

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}/places`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId }),
            });

            if (res.ok) {
                const addedPlace = allPlaces.find(p => p.id === placeId);
                if (addedPlace) {
                    setUserPlaces([...userPlaces, addedPlace]);
                }
                // Removed success alert for smoother UX
                // We don't fetchUsers() here to keep the modal open and state preserved, 
                // but we might want to update the local users list if we want the table to update in background
            } else {
                const data = await res.json();
                showAlert('error', 'Error', data.error || 'Failed to add place');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred while adding place');
        }
    };

    const handleRemovePlace = async (placeId: string) => {
        if (!editingUser) return;

        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}/places/${placeId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setUserPlaces(userPlaces.filter(p => p.id !== placeId));
                // Removed success alert for smoother UX
            } else {
                const data = await res.json();
                showAlert('error', 'Error', data.error || 'Failed to remove place');
            }
        } catch (err) {
            showAlert('error', 'Error', 'An error occurred while removing place');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white">Manage Users</h1>
                    <a href="/admin" className="text-white/80 hover:text-white">&larr; Back to Dashboard</a>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Create User Form */}
                    <div className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg">
                        <h2 className="mb-4 text-xl font-semibold text-white">Create User</h2>

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
                                <label className="block text-sm font-medium text-white/80">Email</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80">Phone (Optional)</label>
                                <input
                                    type="text"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/40 backdrop-blur-xl focus:border-purple-300 focus:outline-none focus:ring focus:ring-purple-300/20"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isAdmin"
                                        checked={isAdmin}
                                        onChange={(e) => setIsAdmin(e.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-300"
                                    />
                                    <label htmlFor="isAdmin" className="ml-2 block text-sm text-white/80">Is Admin</label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isGoogleAccount"
                                        checked={isGoogleAccount}
                                        onChange={(e) => setIsGoogleAccount(e.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-300"
                                    />
                                    <label htmlFor="isGoogleAccount" className="ml-2 block text-sm text-white/80">
                                        Google Account (No password generated)
                                    </label>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full rounded-lg bg-white py-2 font-bold text-purple-600 transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                Create User
                            </button>
                        </form>
                    </div>

                    {/* Users List */}
                    <div className="lg:col-span-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-lg">
                        <h2 className="mb-4 text-xl font-semibold text-white">Existing Users</h2>
                        {loading ? (
                            <p className="text-white/60">Loading...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-white/20">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/20 bg-white/5">
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">{user.name}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-white/80">{user.email}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-white/80">
                                                    {user.isAdmin ? (
                                                        <span className="inline-flex rounded-full bg-green-500/20 px-2 text-xs font-semibold leading-5 text-green-200 border border-green-500/50">Admin</span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-white/20 px-2 text-xs font-semibold leading-5 text-white/80 border border-white/30">User</span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                    <button
                                                        onClick={() => openEditModal(user)}
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

            {/* Edit User & Places Modal */}
            <GlassPopup
                isOpen={!!editingUser}
                onClose={closeEditModal}
                title="Edit User"
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
                <form onSubmit={handleEdit} className="space-y-6">
                    {/* User Details Section */}
                    <div className="space-y-4 border-b border-white/10 pb-6">
                        <h3 className="text-lg font-semibold text-foreground">User Details</h3>
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
                            <label className="block text-sm font-medium text-foreground/80">Email</label>
                            <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground/80">Phone (Optional)</label>
                            <input
                                type="text"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-foreground placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring focus:ring-purple-500/20"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="editIsAdmin"
                                checked={editIsAdmin}
                                onChange={(e) => setEditIsAdmin(e.target.checked)}
                                className="h-4 w-4 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
                            />
                            <label htmlFor="editIsAdmin" className="ml-2 block text-sm text-foreground/80">Is Admin</label>
                        </div>
                    </div>

                    {/* Places Management Section */}
                    <div className="space-y-4 border-b border-white/10 pb-6">
                        <h3 className="text-lg font-semibold text-foreground">Manage Places</h3>
                        {loadingPlaces ? (
                            <p className="text-muted-foreground">Loading places...</p>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Assigned Places */}
                                <div>
                                    <h4 className="mb-2 text-sm font-medium text-foreground/80">Assigned</h4>
                                    {userPlaces.length === 0 ? (
                                        <p className="text-muted-foreground text-xs">No places assigned</p>
                                    ) : (
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {userPlaces.map((place) => (
                                                <div
                                                    key={place.id}
                                                    className="flex items-center justify-between rounded bg-white/5 border border-white/10 p-2"
                                                >
                                                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]" title={place.name}>{place.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePlace(place.id)}
                                                        className="rounded bg-red-500/80 px-2 py-1 text-xs text-white hover:bg-red-600"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Available Places */}
                                <div>
                                    <h4 className="mb-2 text-sm font-medium text-foreground/80">Available</h4>
                                    {allPlaces.filter(p => !userPlaces.find(up => up.id === p.id)).length === 0 ? (
                                        <p className="text-muted-foreground text-xs">No available places</p>
                                    ) : (
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {allPlaces
                                                .filter(p => !userPlaces.find(up => up.id === p.id))
                                                .map((place) => (
                                                    <div
                                                        key={place.id}
                                                        className="flex items-center justify-between rounded bg-white/5 border border-white/10 p-2"
                                                    >
                                                        <span className="text-sm font-medium text-foreground truncate max-w-[120px]" title={place.name}>{place.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddPlace(place.id)}
                                                            className="rounded bg-green-500/80 px-2 py-1 text-xs text-white hover:bg-green-600"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions and Danger Zone */}
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
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

                        <div className="border-t border-white/10 pt-4">
                            <button
                                type="button"
                                onClick={() => editingUser && handleDeleteClick(editingUser)}
                                className="w-full rounded-lg border border-red-500/30 bg-red-500/20 py-2 font-bold text-red-200 transition hover:bg-red-500/30"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
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
