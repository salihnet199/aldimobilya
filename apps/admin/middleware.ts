import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith('/api/auth');
  const isLoginPage = pathname === '/login';

  if (isAuthRoute || isLoginPage) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const isApiRoute = pathname.startsWith('/api');
    if (isApiRoute) {
      return NextResponse.json({ error: 'Yetkisiz erişim / Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Protect everything except static assets, images, the login page itself,
// and the Next.js internals.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
