import type { APIRoute } from 'astro';
import { getUser, createServerClient } from '../../lib/supabase';
import { deleteProject } from '../../lib/cloudflare';

interface DeleteRequest {
  deploymentId: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user
    const user = await getUser(cookies);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Please log in.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse input
    const body = (await request.json()) as DeleteRequest;
    const { deploymentId } = body;

    if (!deploymentId || typeof deploymentId !== 'string') {
      return new Response(JSON.stringify({ error: 'Deployment ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get deployment from database (RLS ensures user can only access their own)
    const supabase = createServerClient(cookies);
    const { data: deployment, error: fetchError } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', deploymentId)
      .single();

    if (fetchError || !deployment) {
      return new Response(JSON.stringify({ error: 'Deployment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Double-check ownership (defense in depth)
    if (deployment.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized to delete this deployment' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete from Cloudflare
    try {
      await deleteProject(deployment.project_name);
    } catch (cfError) {
      console.error('Cloudflare delete error:', cfError);
      // Continue to delete from database even if Cloudflare delete fails
      // The project may have already been deleted manually
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('deployments')
      .delete()
      .eq('id', deploymentId);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete from database' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Delete failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
