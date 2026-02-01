import type { APIRoute } from 'astro';
import { createAuthClient, setSessionCookies } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);

  // PKCE flow: Supabase sends ?code=... in query params
  const code = url.searchParams.get('code');

  if (!code) {
    console.error('No code parameter in callback URL');
    return redirect('/login?error=no_code');
  }

  // Use PKCE-enabled auth client
  const supabase = createAuthClient();

  try {
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Code exchange error:', error);
      return redirect('/login?error=auth_failed');
    }

    if (!data.session) {
      console.error('No session returned from code exchange');
      return redirect('/login?error=no_session');
    }

    // Set session cookies
    setSessionCookies(
      cookies,
      data.session.access_token,
      data.session.refresh_token
    );

    return redirect('/app');
  } catch (error) {
    console.error('Callback error:', error);
    return redirect('/login?error=callback_failed');
  }
};
