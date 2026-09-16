import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible base config. Kept free of Prisma/bcrypt imports so it can
 * run inside middleware (Edge runtime). The full config with the Credentials
 * provider lives in auth.ts and is only used in Node.js contexts (API routes,
 * server components).
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as 'ADMIN' | 'EDITOR';
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts (Node.js runtime only)
} satisfies NextAuthConfig;
