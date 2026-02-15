'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
    const { data: session, status } = useSession();
    const [apiData, setApiData] = useState<any>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                return res.json();
            })
            .then(data => setApiData(data))
            .catch(err => setError(err.message));
    }, []);

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">Auth Debugger</h1>

            <div className="mb-8 p-4 border rounded bg-gray-100 dark:bg-zinc-800">
                <h2 className="font-bold mb-2">Client Session (useSession)</h2>
                <pre>{JSON.stringify({ status, session }, null, 2)}</pre>
            </div>

            <div className="mb-8 p-4 border rounded bg-gray-100 dark:bg-zinc-800">
                <h2 className="font-bold mb-2">API Response (/api/auth/me)</h2>
                {error && <div className="text-red-500 mb-2">Error: {error}</div>}
                <pre>{JSON.stringify(apiData, null, 2)}</pre>
            </div>

            <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
                Force Sign Out
            </button>
        </div>
    );
}
