// Cloudflare Pages Direct Upload API utilities

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

interface Project {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  created_on: string;
}

interface Deployment {
  id: string;
  url: string;
  environment: string;
  created_on: string;
}

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${import.meta.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function getAccountId(): string {
  return import.meta.env.CLOUDFLARE_ACCOUNT_ID;
}

/**
 * Create a new Cloudflare Pages project
 */
export async function createProject(projectName: string): Promise<Project> {
  const accountId = getAccountId();

  const response = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/pages/projects`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name: projectName,
        production_branch: 'main',
      }),
    }
  );

  const data = (await response.json()) as CloudflareResponse<Project>;

  if (!data.success) {
    // If project already exists, get and return it
    if (data.errors.some(e => e.message.includes('already exists') || e.code === 8000007)) {
      return getProject(projectName);
    }
    throw new Error(`Failed to create project: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return data.result;
}

/**
 * Get an existing Cloudflare Pages project
 */
export async function getProject(projectName: string): Promise<Project> {
  const accountId = getAccountId();

  const response = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/pages/projects/${projectName}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  const data = (await response.json()) as CloudflareResponse<Project>;

  if (!data.success) {
    throw new Error(`Failed to get project: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return data.result;
}

/**
 * Delete a Cloudflare Pages project
 */
export async function deleteProject(projectName: string): Promise<void> {
  const accountId = getAccountId();

  const response = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/pages/projects/${projectName}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  );

  const data = (await response.json()) as CloudflareResponse<null>;

  if (!data.success) {
    // Ignore "not found" errors - project may already be deleted
    if (!data.errors.some(e => e.message.includes('not found') || e.code === 8000007)) {
      throw new Error(`Failed to delete project: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }
}

/**
 * Deploy files to a Cloudflare Pages project using Direct Upload
 */
export async function deployToPages(
  projectName: string,
  files: Map<string, string>
): Promise<{ url: string; deploymentId: string }> {
  const accountId = getAccountId();

  // Create FormData with all files
  const formData = new FormData();

  for (const [path, content] of files) {
    const blob = new Blob([content], { type: getContentType(path) });
    formData.append(path, blob, path);
  }

  const response = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  );

  const data = (await response.json()) as CloudflareResponse<Deployment>;

  if (!data.success) {
    throw new Error(`Failed to deploy: ${data.errors.map(e => e.message).join(', ')}`);
  }

  return {
    url: data.result.url,
    deploymentId: data.result.id,
  };
}

/**
 * Generate static HTML for a landing page
 */
export function generateLandingPageHTML(
  title: string,
  subtitle: string,
  cta: string,
  themeColor: string = '#667eea'
): string {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeCta = escapeHtml(cta);
  const safeColor = escapeHtml(themeColor);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${safeSubtitle}">
  <title>${safeTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${safeColor} 0%, ${adjustColor(safeColor, -30)} 100%);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      animation: fadeIn 0.8s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      font-size: clamp(2rem, 5vw, 4rem);
      margin-bottom: 1rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
      line-height: 1.2;
    }
    p {
      font-size: clamp(1rem, 2.5vw, 1.5rem);
      margin-bottom: 2rem;
      opacity: 0.9;
      line-height: 1.6;
    }
    .cta-button {
      display: inline-block;
      padding: 1rem 2.5rem;
      font-size: 1.2rem;
      font-weight: 600;
      color: ${safeColor};
      background: white;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }
    footer {
      position: fixed;
      bottom: 20px;
      font-size: 0.875rem;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${safeTitle}</h1>
    <p>${safeSubtitle}</p>
    <a href="#" class="cta-button">${safeCta}</a>
  </div>
  <footer>Built with Landing Page Generator</footer>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Adjust color brightness
 */
function adjustColor(hex: string, amount: number): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse RGB values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Adjust
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get content type for a file
 */
function getContentType(filename: string): string {
  if (filename.endsWith('.html')) return 'text/html';
  if (filename.endsWith('.css')) return 'text/css';
  if (filename.endsWith('.js')) return 'application/javascript';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  return 'text/plain';
}
