import { NextResponse } from 'next/server';
import { type SubscriptionTier } from '@/lib/store';

/**
 * Middleware-style premium gate for API routes. Returns a 403 response when
 * the caller is on the free tier, or null to let the handler proceed.
 *
 * NOTE: until real authentication lands (Supabase Auth), the tier is read
 * from the client-supplied profile, so this enforces the product experience
 * rather than hard security. When auth is added, swap the tier source for the
 * authenticated user's server-side record and every call site stays the same.
 */
export function requirePremium(tier: SubscriptionTier | undefined): NextResponse | null {
  if (tier === 'premium') return null;
  return NextResponse.json(
    { error: 'Upgrade to Premium', code: 'premium_required' },
    { status: 403 }
  );
}
