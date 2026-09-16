import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';
import { normalizeCallbackUrl } from './lib/callback-url';
import { normalizeRole } from './lib/roles';

const { auth } = NextAuth(authConfig);

/**
 * Edge authentication gate.
 *
 * This layer can only see the JWT, so it is deliberately coarse: it checks that
 * a session with a known role exists. Role *capabilities* and revocation are
 * enforced against the live database in `lib/auth-guard.ts` (API routes) and in
 * `app/dashboard/layout.tsx` (pages).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith('/api/auth');
  const isLoginPage = pathname === '/login';

  if (isAuthRoute || isLoginPage) {
    return NextResponse.next();
  }

  const user = req.auth?.user;
  const isAuthorized = Boolean(user) && normalizeRole(user?.role) !== null;

  if (!isAuthorized) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Yetkisiz erişim / Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set(
      'callbackUrl',
      normalizeCallbackUrl(`${pathname}${req.nextUrl.search}`),
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Protect everything except static assets, images, the login page itself,
// and the Next.js internals.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
