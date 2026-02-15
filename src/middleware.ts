import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Protect routes that require authentication
export default withAuth(
    function middleware(req) {
        // This function runs if the user is authenticated
        const token = req.nextauth.token;
        const pathname = req.nextUrl.pathname;

        // 1. Admin Route Protection
        // If trying to access admin routes
        if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
            // If NOT an admin, redirect to dashboard
            if (!token?.isAdmin) {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        }

        // 2. User Route Protection (Strict Separation)
        // If trying to access dashboard routes (user area)
        if (pathname.startsWith('/dashboard')) {
            // If IS an admin, redirect to admin panel
            // Admins should not see user dashboard
            if (token?.isAdmin) {
                return NextResponse.redirect(new URL('/admin', req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // This determines if the middleware function above runs
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*', '/dashboard/:path*'],
};
