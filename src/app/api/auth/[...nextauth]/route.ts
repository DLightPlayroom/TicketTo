import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDataProvider } from "@/lib/data-provider";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Email and Password",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const provider = await getDataProvider();

                    // Validate credentials using the provider's method
                    const user = await provider.validateCredentials(credentials.email, credentials.password);

                    if (!user) {
                        return null;
                    }

                    // Return user object that will be stored in JWT
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        isAdmin: user.isAdmin,
                    };
                } catch (error) {
                    console.error("Error during credentials authentication:", error);
                    return null;
                }
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            console.log('[Auth] signIn callback', {
                email: user.email,
                provider: account?.provider
            });

            // Check if user's email exists in our database
            if (!user.email) {
                console.log('[Auth] No email provided');
                return false;
            }

            try {
                const provider = await getDataProvider();
                // Ensure we look up with lowercase email
                const dbUser = await provider.getUserByEmail(user.email);
                console.log('[Auth] DB Lookup result:', dbUser ? 'Found' : 'Not Found');

                // Only allow sign in if user exists in database
                if (!dbUser) {

                    // Special case: Auto-create admin user for tibi.father@gmail.com
                    if (user.email === 'tibi.father@gmail.com') {
                        console.log(`[Auth] Auto-creating admin user for email: ${user.email}`);
                        await provider.createUser({
                            name: user.name || 'Tibor Father',
                            email: user.email,
                            isAdmin: true,
                            isGoogleAccount: true, // No password will be generated
                        });
                        return true;
                    }

                    console.log(`[Auth] Access denied for email: ${user.email}`);
                    return false;
                }

                return true;
            } catch (error) {
                console.error("[Auth] Error checking user in database:", error);
                return false;
            }
        },
        async jwt({ token, user, account }) {
            // Add user data from database to token on first sign in
            if (user) {
                console.log('[Auth] jwt callback - Initial sign in', { userId: user.id });
                // For both Google and Credentials providers, user data is available
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.isAdmin = user.isAdmin;

                // For Google Auth (or others), we must fetch the real DB user to get ID and isAdmin
                // Credentials provider returns the DB user directly, but Google does not.
                if (account?.provider === 'google' || !user.isAdmin) {
                    try {
                        const provider = await getDataProvider();
                        const dbUser = await provider.getUserByEmail(user.email as string);
                        console.log('[Auth] jwt callback - Fetched DB user', { dbUserId: dbUser?.id });

                        if (dbUser) {
                            token.id = dbUser.id;
                            token.isAdmin = dbUser.isAdmin;
                        }
                    } catch (error) {
                        console.error("[Auth] Error fetching user from database:", error);
                    }
                }
            }
            return token;
        },
        async session({ session, token }) {
            // Pass token data to session
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.isAdmin = token.isAdmin as boolean;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            console.log('[Auth] redirect callback', { url, baseUrl });
            // Allow relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allow callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;

            // Default redirect based on the session - this won't work here as we don't have token
            // We'll let the client-side handle it or use the default
            return baseUrl;
        },
    },
    pages: {
        signIn: "/",
        error: "/", // Error page
    },
    session: {
        strategy: "jwt",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
