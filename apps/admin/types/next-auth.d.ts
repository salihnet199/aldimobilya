import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: 'ADMIN' | 'EDITOR';
  }

  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'EDITOR';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'ADMIN' | 'EDITOR';
  }
}
