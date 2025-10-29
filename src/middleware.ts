import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/', '/pages/login', 'pages/signup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If trying to access protected route without token
  if (!isPublicRoute && !token) {
    return NextResponse.redirect(new URL('/pages/login', request.url));
  }

  // If logged in and trying to access auth pages
  if (token && (pathname === '/pages/login' || pathname === '/pages/signup')) {
    return NextResponse.redirect(new URL('/pages/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};