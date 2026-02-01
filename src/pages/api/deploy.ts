import type { APIRoute } from 'astro';
import { getUser, createServerClient } from '../../lib/supabase';
import { createProject, deployToPages, generateLandingPageHTML } from '../../lib/cloudflare';

interface DeployRequest {
  title: string;
  subtitle: string;
  cta: string;
  themeColor?: string;
}

// Input validation constraints
const MAX_TITLE_LENGTH = 100;
const MAX_SUBTITLE_LENGTH = 300;
const MAX_CTA_LENGTH = 50;
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

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

    // Parse and validate input
    const body = (await request.json()) as DeployRequest;
    const { title, subtitle, cta, themeColor } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!subtitle || typeof subtitle !== 'string' || subtitle.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Subtitle is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!cta || typeof cta !== 'string' || cta.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Call-to-action text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate lengths
    if (title.length > MAX_TITLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Title must be ${MAX_TITLE_LENGTH} characters or less` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (subtitle.length > MAX_SUBTITLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Subtitle must be ${MAX_SUBTITLE_LENGTH} characters or less` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (cta.length > MAX_CTA_LENGTH) {
      return new Response(
        JSON.stringify({ error: `CTA must be ${MAX_CTA_LENGTH} characters or less` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate theme color if provided
    const validatedColor = themeColor && COLOR_REGEX.test(themeColor) ? themeColor : '#667eea';

    // Generate unique project name: lp-{slug}-{timestamp}
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    const timestamp = Date.now();
    const projectName = `lp-${slug}-${timestamp}`;

    // Generate the landing page HTML
    const html = generateLandingPageHTML(title.trim(), subtitle.trim(), cta.trim(), validatedColor);

    // Create files map
    const files = new Map<string, string>();
    files.set('index.html', html);

    // Create Cloudflare Pages project
    try {
      await createProject(projectName);
    } catch (cfError) {
      console.error('Cloudflare project creation error:', cfError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create deployment project. Please check Cloudflare credentials.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deploy to Cloudflare Pages
    let deploymentResult: { url: string; deploymentId: string };
    try {
      deploymentResult = await deployToPages(projectName, files);
    } catch (deployError) {
      console.error('Cloudflare deployment error:', deployError);
      return new Response(
        JSON.stringify({ error: 'Failed to deploy to Cloudflare. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Construct the final URL
    const finalUrl = deploymentResult.url || `https://${projectName}.pages.dev`;

    // Save to database
    const supabase = createServerClient(cookies);
    const { error: dbError } = await supabase.from('deployments').insert({
      user_id: user.id,
      project_name: projectName,
      title: title.trim(),
      subtitle: subtitle.trim(),
      cta: cta.trim(),
      theme_color: validatedColor,
      url: finalUrl,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request - the deployment succeeded
      // Just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: finalUrl,
        projectName,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Deploy error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Deployment failed',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
