'use client';

import { useState, useEffect, useRef } from 'react';

import { signOut, useSession } from 'next-auth/react';
import { User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists, if not use clsx logic inline
import { Logo } from '@/components/ui/logo';

interface UserData {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    hasPassword?: boolean;
}

export interface UserMenuProps {
    variant?: 'glass' | 'simple';
}

export function UserMenu({ variant = 'glass' }: UserMenuProps) {
    const [user, setUser] = useState<UserData | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();

    // Check if user has password (if loaded), default to TRUE (show fields) if unsure or if user has password.
    // We want to hide ONLY if we know for sure they DON'T have a password (e.g. Google user).
    // user.hasPassword comes from API.
    // If user is null (loading), we default to false (show fields) because likely they are credentials user if they are "Normal user".
    // Actually, let's just compute it where needed.
    const isGoogleUser = user?.hasPassword === false;

    const fetchUserData = () => {
        console.log('UserMenu: Fetching user data...');
        fetch('/api/auth/me')
            .then(res => {
                console.log('UserMenu: API response status:', res.status);
                return res.ok ? res.json() : null;
            })
            .then(data => {
                console.log('UserMenu: Data received:', data);
                if (data?.user) {
                    setUser(data.user);
                } else {
                    console.log('UserMenu: No user found in data');
                }
            })
            .catch(err => console.error('Failed to fetch user', err));
    };

    useEffect(() => {
        fetchUserData();
        // Click outside listener
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/' });
    };

    // Use session user as fallback if state is not yet populated
    const sessionUser = session?.user as (UserData & { image?: string }) | undefined;
    const displayUser = user || (sessionUser ? {
        id: sessionUser.id || '',
        name: sessionUser.name || '',
        email: sessionUser.email || '',
        isAdmin: sessionUser.isAdmin || false
    } as UserData : null);

    if (!displayUser) {
        console.log('UserMenu: No user or session data, returning null');
        return null;
    }

    console.log('UserMenu: Rendering with user:', displayUser.email);

    const initials = displayUser.name
        ? displayUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : displayUser.email.substring(0, 2).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 rounded-full p-1 pr-3 text-sm font-medium transition-colors shadow-sm backdrop-blur-xl",
                    variant === 'glass'
                        ? "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                        : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                )}
            >
                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    variant === 'glass'
                        ? "bg-white/20 text-white"
                        : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                )}>
                    <Logo width={25} height={25} />
                </div>
                <span className="hidden sm:inline-block">{displayUser.name || displayUser.email}</span>
            </button>

            {isOpen && (
                <div className={cn(
                    "absolute right-0 mt-2 w-56 origin-top-right rounded-xl p-1 shadow-lg focus:outline-none z-50 backdrop-blur-xl",
                    variant === 'glass'
                        ? "border border-white/20 bg-white/10"
                        : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                )}>
                    <div className={cn(
                        "px-3 py-2 border-b mb-1",
                        variant === 'glass' ? "border-white/20" : "border-zinc-100 dark:border-zinc-800"
                    )}>
                        <p className={cn("text-sm font-medium truncate", variant === 'glass' ? "text-white" : "text-zinc-900 dark:text-white")}>{displayUser.name}</p>
                        <p className={cn("text-xs truncate", variant === 'glass' ? "text-white/60" : "text-zinc-500 dark:text-zinc-400")}>{displayUser.email}</p>
                    </div>

                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setIsProfileModalOpen(true);
                        }}
                        className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            variant === 'glass'
                                ? "text-white/70 hover:bg-white/10"
                                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        )}
                    >
                        <User className="h-4 w-4" />
                        Edit Profile
                    </button>



                    <div className={cn("my-1 border-t", variant === 'glass' ? "border-white/20" : "border-zinc-100 dark:border-zinc-800")}></div>

                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/20"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            )}



            {isProfileModalOpen && (
                <EditProfileModal
                    user={displayUser}
                    isGoogleUser={!!isGoogleUser}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSuccess={fetchUserData}
                />
            )}
        </div>
    );
}

function EditProfileModal({ user, isGoogleUser, onClose, onSuccess }: { user: UserData, isGoogleUser: boolean, onClose: () => void, onSuccess: () => void }) {
    const [name, setName] = useState(user.name);
    // Explicitly handle phone being undefined by defaulting to empty string
    // @ts-expect-error - Phone might be missing from type but present in API response
    const [phone, setPhone] = useState(user.phone || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!isGoogleUser && newPassword) {
            if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
            if (newPassword.length < 6) {
                setError('Password must be at least 6 characters');
                setLoading(false);
                return;
            }
        }

        try {
            const body: { name: string; phone: string; password?: string } = { name, phone };
            if (!isGoogleUser && newPassword) {
                body.password = newPassword;
            }

            const res = await fetch('/api/auth/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Edit Profile</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        />
                    </div>

                    {!isGoogleUser && (
                        <>
                            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-4">
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">Change Password</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Leave empty to keep current"
                                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Leave empty to keep current"
                                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:ring-offset-zinc-900"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


