import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Google sign-in via Auth.js. The whole feature is gated on configuration:
 * until GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET exist in the
 * environment (Vercel project settings), no provider is registered and the
 * UI shows a "not configured" note instead of a sign-in button — so the app
 * deploys and runs safely either way.
 */
export const authConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: authConfigured
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [],
  // A placeholder secret keeps the handler mountable while unconfigured;
  // with zero providers registered it cannot mint a real session.
  secret: process.env.AUTH_SECRET ?? 'valoris-unconfigured-placeholder',
  trustHost: true,
});
