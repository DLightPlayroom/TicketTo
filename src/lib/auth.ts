import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type Session = {
    userId: string;
    email: string;
    name: string;
    isAdmin: boolean;
};

/**
 * Get the current session from NextAuth
 */
export async function getSession(): Promise<Session | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return null;
    }

    return {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        isAdmin: session.user.isAdmin,
    };
}
