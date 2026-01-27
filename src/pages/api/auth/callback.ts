import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { setSessionCookies } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);

  // Handle both hash and query parameters (Supabase uses hash for magic link)
  const code = url.searchParams.get('code');
  const accessToken = url.searchParams.get('access_token') || url.hash?.match(/access_token=([^&]+)/)?.[1];
  const refreshToken = url.searchParams.get('refresh_token') || url.hash?.match(/refresh_token=([^&]+)/)?.[1];

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY
  );

  try {
    // If we have a code, exchange it for a session
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Code exchange error:', error);
        return redirect('/login?error=auth_failed');
      }

      if (data.session) {
        setSessionCookies(
          cookies,
          data.session.access_token,
          data.session.refresh_token
        );
        return redirect('/app');
      }
    }

    // If we have tokens directly (older flow)
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Session set error:', error);
        return redirect('/login?error=auth_failed');
      }

      if (data.session) {
        setSessionCookies(
          cookies,
          data.session.access_token,
          data.session.refresh_token
        );
        return redirect('/app');
      }
    }

    // No valid auth data found
    return redirect('/login?error=no_session');
  } catch (error) {
    console.error('Callback error:', error);
    return redirect('/login?error=callback_failed');
  }
};
