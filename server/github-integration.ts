import { Octokit } from "@octokit/rest";

/**
 * GitHub Integration for Property Synchronization
 * Handles repository creation, data extraction, and webhook configuration
 */

export async function initializeGitHubIntegration(token: string) {
  const octokit = new Octokit({ auth: token });

  try {
    // Validate token by getting authenticated user
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ GitHub token validated for user: ${user.login}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Company: ${user.company}`);

    return {
      success: true,
      user: {
        login: user.login,
        name: user.name,
        company: user.company,
        id: user.id,
      },
      octokit,
    };
  } catch (error) {
    console.error("❌ GitHub token validation failed:", error);
    throw new Error("Invalid GitHub token");
  }
}

/**
 * Create centralized properties catalog repository
 */
export async function createPropertiesCatalogRepo(
  octokit: any,
  owner: string
) {
  try {
    // Check if repo already exists
    try {
      const existing = await octokit.rest.repos.get({
        owner,
        repo: "vecy-properties-catalog",
      });
      console.log(
        `✅ Repository already exists: ${existing.data.html_url}`
      );
      return existing.data;
    } catch (e: any) {
      if (e.status !== 404) throw e;
    }

    // Create new repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: "vecy-properties-catalog",
      description:
        "Centralized catalog of Vecy Tech Real Estate properties with auto-sync from individual repositories",
      private: false,
      auto_init: true,
      topics: ["real-estate", "properties", "bogota", "vecy"],
    });

    console.log(`✅ Repository created: ${repo.html_url}`);

    // Create initial structure
    await createRepositoryStructure(octokit, owner, repo.name);

    return repo;
  } catch (error) {
    console.error("❌ Failed to create repository:", error);
    throw error;
  }
}

/**
 * Create initial repository structure
 */
async function createRepositoryStructure(
  octokit: any,
  owner: string,
  repo: string
) {
  const files = [
    {
      path: "properties.json",
      content: JSON.stringify(
        {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          properties: [],
          metadata: {
            totalProperties: 0,
            totalValue: 0,
            categories: {},
          },
        },
        null,
        2
      ),
    },
    {
      path: "README.md",
      content: `# Vecy Tech Real Estate - Properties Catalog

Centralized catalog of all Vecy Tech Real Estate properties with automatic synchronization.

## Structure

- \`properties.json\` - Complete property database
- \`categories/\` - Properties organized by type
- \`locations/\` - Properties organized by location

## Auto-Sync

This repository is automatically synchronized with individual property repositories via GitHub Actions and webhooks.

## Last Updated

${new Date().toISOString()}
`,
    },
    {
      path: ".gitignore",
      content: `node_modules/
.env
.env.local
*.log
.DS_Store
`,
    },
  ];

  for (const file of files) {
    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file.path,
        message: `Initialize ${file.path}`,
        content: Buffer.from(file.content).toString("base64"),
      });
      console.log(`✅ Created ${file.path}`);
    } catch (error) {
      console.error(`❌ Failed to create ${file.path}:`, error);
    }
  }
}

// ============================================================
// PORTAFOLIO OFICIAL VECY BIENES RAÍCES
// Organización GitHub: Vecy-Bienes-Raices
// Lista actualizada manualmente — precisión de reloj suizo ⌚
// ============================================================
const VECY_ORG = "Vecy-Bienes-Raices";

const VECY_PROPERTY_REPOS = [
  "Ap-Nuevo-Cedritos-Bog",
  "ap-venta-cantalejo-bogota",
  "Apartamento-Bucaramanga-Santander",
  "Apartamento-en-venta-en-Cedritos-Bogota",
  "edificio-teusaquillo-bogota",
  "Casa-en-La-Calleja-Bogot-",
  "Casa-Polo-Club-Bogot-",
  "Apto-San-Patricio-Bogota",
  "Hotel-en-Venta-Quinta-Paredes-Bogota",
  "edificio-castellana",
  "apto-mirador-puerto-suba",
  "edificio-santa-barbara",
];

/**
 * List all property repositories from Vecy-Bienes-Raices organization
 * Uses the definitive hardcoded list for precision.
 */
export async function listPropertyRepositories(octokit: any, _owner: string) {
  try {
    const repos = [];

    for (const repoName of VECY_PROPERTY_REPOS) {
      try {
        const { data: repo } = await octokit.rest.repos.get({
          owner: VECY_ORG,
          repo: repoName,
        });
        repos.push(repo);
        console.log(`✅ Found: ${repo.full_name}`);
      } catch (e: any) {
        if (e.status === 404) {
          console.warn(`⚠️  Not found (may not be updated yet): ${VECY_ORG}/${repoName}`);
        } else {
          console.error(`❌ Error fetching ${repoName}:`, e.message);
        }
      }
    }

    console.log(`\n✅ Portafolio Vecy: ${repos.length}/${VECY_PROPERTY_REPOS.length} repositorios disponibles`);
    return repos;
  } catch (error) {
    console.error("❌ Failed to list repositories:", error);
    throw error;
  }
}

export { VECY_ORG, VECY_PROPERTY_REPOS };

/**
 * Extract real property data from Vecy ficha técnica repos
 * Strategy:
 * 1. Cover image → assets/1.png or assets/1.jpg (raw.githubusercontent.com URL)
 * 2. Price & name → JSON-LD schema in index.html
 * 3. Characteristics → parsed from index.html meta and content
 * 4. Gallery → all image files in the assets/ folder
 */
export async function extractPropertyData(
  octokit: any,
  _owner: string,
  repo: string
) {
  const owner = VECY_ORG; // Always use the official Vecy org
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/main`;

  try {
    // ── Step 1: Get assets listing to find cover image and gallery ──────────
    let coverImage = `${rawBase}/assets/1.png`; // default — assets/1.png is always the cover
    const gallery: string[] = [];

    try {
      const { data: assetFiles } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "assets",
      });

      if (Array.isArray(assetFiles)) {
        const imageFiles = assetFiles
          .filter((f: any) =>
            /\.(png|jpg|jpeg|webp)$/i.test(f.name) && f.type === "file"
          )
          .sort((a: any, b: any) => {
            // Sort numerically: 1.png, 2.jpg, 3.jpg ...
            const numA = parseInt(a.name.replace(/\D/g, "")) || 999;
            const numB = parseInt(b.name.replace(/\D/g, "")) || 999;
            return numA - numB;
          });

        if (imageFiles.length > 0) {
          // Cover = first image (assets/1.png or biggest)
          const coverFile = imageFiles.find((f: any) => /^1\.(png|jpg|jpeg|webp)$/i.test(f.name)) || imageFiles[0];
          coverImage = `${rawBase}/${coverFile.path}`;
          // Gallery = all images
          gallery.push(...imageFiles.map((f: any) => `${rawBase}/${f.path}`));
        }
      }
    } catch (e: any) {
      console.warn(`⚠️  Could not read assets for ${repo}:`, e.message);
    }

    // ── Step 2: Parse index.html for real property data ──────────────────────
    let propertyData: any = {
      id: repo,
      name: humanizeName(repo),
      sourceRepository: repo,
      image: coverImage,
      gallery,
      fichaUrl: `https://${repo.toLowerCase()}.netlify.app`,
    };

    try {
      const { data: indexFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "index.html",
      });

      if (indexFile.type === "file") {
        const html = Buffer.from(indexFile.content as string, "base64").toString("utf-8");
        propertyData = {
          ...propertyData,
          ...parsePropertyFromHTML(html, repo, coverImage, gallery),
        };
      }
    } catch (e: any) {
      if (e.status !== 404) console.warn(`⚠️  Could not read index.html for ${repo}`);
    }

    console.log(`✅ Extracted data for ${repo}: ${JSON.stringify({
      name: propertyData.name,
      price: propertyData.price,
      area: propertyData.area,
      images: gallery.length,
    })}`);

    return propertyData;
  } catch (error) {
    console.error(`❌ Failed to extract data from ${repo}:`, error);
    return null;
  }
}

/**
 * Parse all property fields from Vecy ficha técnica HTML
 */
function parsePropertyFromHTML(html: string, repoName: string, coverImage: string, gallery: string[]) {
  const property: any = {
    id: repoName,
    name: humanizeName(repoName),
    sourceRepository: repoName,
    image: coverImage,
    gallery,
    fichaUrl: `https://${repoName.toLowerCase()}.netlify.app`,
  };

  // ── Price from JSON-LD schema ──────────────────────────────────────────────
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const schema = JSON.parse(jsonLdMatch[1]);
      if (schema.offers?.price) {
        property.price = parseInt(schema.offers.price.toString().replace(/\D/g, ""));
      }
      if (schema.name) property.name = schema.name;
    } catch { /* ignore JSON parse errors */ }
  }

  // ── Price fallback: look for price patterns in text ───────────────────────
  if (!property.price) {
    const priceMatch = html.match(/\$\s*([\d.,]+)\s*(?:\.\d{3})*(?:\s*(?:COP|millones?|M))?/i);
    if (priceMatch) {
      const raw = priceMatch[1].replace(/[.,]/g, "");
      property.price = parseInt(raw) || undefined;
    }
  }

  // ── Property name from <title> ─────────────────────────────────────────────
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch && !property.name) {
    property.name = titleMatch[1].replace(/\s*\|.*$/, "").trim();
  }

  // ── OG image as fallback cover ────────────────────────────────────────────
  if (!property.image || property.image.includes("cloudfront")) {
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (ogImage) property.image = ogImage[1];
  }

  // ── Description from meta ─────────────────────────────────────────────────
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
  if (descMatch) property.description = descMatch[1];

  // ── Area in m² ────────────────────────────────────────────────────────────
  const areaMatch = html.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
  if (areaMatch) property.area = parseFloat(areaMatch[1].replace(",", "."));

  // ── Habitaciones / Rooms ──────────────────────────────────────────────────
  const bedsMatch = html.match(/(\d+)\s*(?:habitaci[oó]n|alcoba|cuarto|dormitorio|apt)/i);
  if (bedsMatch) property.bedrooms = parseInt(bedsMatch[1]);

  // ── Baños ─────────────────────────────────────────────────────────────────
  const bathsMatch = html.match(/(\d+)\s*(?:ba[ñn]o)/i);
  if (bathsMatch) property.bathrooms = parseInt(bathsMatch[1]);

  // ── Parqueaderos ─────────────────────────────────────────────────────────
  const parkingMatch = html.match(/(\d+)\s*(?:parqueadero|garaje|estacionamiento)/i);
  if (parkingMatch) property.parking = parseInt(parkingMatch[1]);

  // ── Determine type from repo name ────────────────────────────────────────
  const lower = repoName.toLowerCase();
  if (lower.includes("edificio")) property.propertyType = "building";
  else if (lower.includes("hotel") || lower.includes("hostal")) property.propertyType = "hotel";
  else if (lower.includes("casa")) property.propertyType = "house";
  else if (lower.includes("finca") || lower.includes("hacienda")) property.propertyType = "farm";
  else if (lower.includes("bodega")) property.propertyType = "warehouse";
  else if (lower.includes("lote") || lower.includes("terreno")) property.propertyType = "land";
  else if (lower.includes("oficina")) property.propertyType = "office";
  else property.propertyType = "apartment";

  // ── Determine city from repo name ────────────────────────────────────────
  if (lower.includes("bucaramanga") || lower.includes("santander")) {
    property.city = "Bucaramanga";
    property.location = "Bucaramanga, Santander";
  } else {
    property.city = "Bogotá";
    property.location = "Bogotá, Colombia";
  }

  return property;
}

/**
 * Convert repo name into human-readable property name
 */
function humanizeName(repoName: string): string {
  return repoName
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bBogot\b/i, "Bogotá")
    .replace(/\bBogota\b/i, "Bogotá")
    .trim();
}

/**
 * Setup webhook for automatic updates
 */
export async function setupWebhook(
  octokit: any,
  owner: string,
  repo: string,
  webhookUrl: string
) {
  try {
    const { data: hook } = await octokit.rest.repos.createWebhook({
      owner,
      repo,
      name: "web",
      active: true,
      events: ["push", "pull_request"],
      config: {
        url: webhookUrl,
        content_type: "json",
        insecure_ssl: "0",
      },
    });

    console.log(`✅ Webhook created for ${repo}: ${hook.id}`);
    return hook;
  } catch (error) {
    console.error(`❌ Failed to create webhook for ${repo}:`, error);
    throw error;
  }
}
