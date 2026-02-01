import type { APIRoute } from 'astro';
import { clearSessionCookies, createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Sign out from Supabase
    const supabase = createServerClient(cookies);
    await supabase.auth.signOut();

    // Clear cookies
    clearSessionCookies(cookies);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear cookies even if Supabase call fails
    clearSessionCookies(cookies);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
