import { NextRequest, NextResponse } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = [
  '/teacher',
  '/student',
  '/admin',
  '/moderator',
  '/school-admin',
  '/content-creator',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // For now, we rely on client-side auth check via Firebase
    // The useAuthGuard hook on the client side will handle redirects
    // This middleware is here as a future enhancement for server-side checks
    
    // Note: We cannot reliably check Firebase auth state in middleware
    // since Firebase SDK doesn't work in server middleware context.
    // Client-side protection is handled by useAuthGuard hook.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/teacher/:path*',
    '/student/:path*',
    '/admin/:path*',
    '/moderator/:path*',
    '/school-admin/:path*',
    '/content-creator/:path*',
  ],
};
