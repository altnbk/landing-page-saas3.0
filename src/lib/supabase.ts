import { createClient, type User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

// Database types
export interface Deployment {
  id: string;
  user_id: string;
  project_name: string;
  title: string;
  subtitle: string;
  cta: string;
  theme_color: string;
  url: string;
  created_at: string;
}

// Cookie names for session storage
const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';

// Cookie options
const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Create a Supabase client for browser-side usage
 */
export function createBrowserClient() {
  return createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY
  );
}

/**
 * Create a Supabase client with session from cookies (for server-side)
 */
export function createServerClient(cookies: AstroCookies) {
  const accessToken = cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // If we have tokens, set the session
  if (accessToken && refreshToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  return supabase;
}

/**
 * Create a Supabase admin client (server-side only, bypasses RLS)
 */
export function createAdminClient() {
  return createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Get the current user from cookies
 */
export async function getUser(cookies: AstroCookies): Promise<User | null> {
  const accessToken = cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const supabase = createServerClient(cookies);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Clear invalid cookies
    clearSessionCookies(cookies);
    return null;
  }

  return user;
}

/**
 * Set session cookies from Supabase session
 */
export function setSessionCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string
) {
  cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions);
  cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);
}

/**
 * Clear session cookies (logout)
 */
export function clearSessionCookies(cookies: AstroCookies) {
  cookies.delete(ACCESS_TOKEN_COOKIE, { path: '/' });
  cookies.delete(REFRESH_TOKEN_COOKIE, { path: '/' });
}

/**
 * Validate session and refresh if needed
 */
export async function validateAndRefreshSession(cookies: AstroCookies): Promise<User | null> {
  const accessToken = cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY
  );

  // Try to refresh the session
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    clearSessionCookies(cookies);
    return null;
  }

  // Update cookies with potentially refreshed tokens
  setSessionCookies(
    cookies,
    data.session.access_token,
    data.session.refresh_token
  );

  return data.user;
}
