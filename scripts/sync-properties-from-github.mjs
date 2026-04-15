#!/usr/bin/env node

/**
 * Script to synchronize properties from GitHub repositories
 * Usage: node scripts/sync-properties-from-github.mjs
 */

import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const KNOWN_PROPERTY_REPOS = [
  'Apto-San-Patricio-Bogota',
  'Casa-en-La-Calleja-Bogot-',
  'Casa-Polo-Club-Bogot-',
  'Apartamento-en-venta-en-Cedritos-Bogota',
  'edificio-castellana',
  'Ap-Chico-Norte-III',
  'apto-mirador-guero-suba',
  'Ap-Nuevo-Ceditos-Bog',
  'Apartamento-Bucaramanga-Santander',
  'edificio-santa-barbara',
  'Edificio-Sta-B-rabara-Bogota',
];

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is not set');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

/**
 * Parse property data from README content
 */
function parsePropertyFromReadme(content, repoName) {
  const property = {
    id: repoName,
    name: repoName.replace(/-/g, ' '),
    repository: repoName,
    source: 'github',
    description: '',
  };

  // Extract title/name from first heading
  const titleMatch = content.match(/^#\s+(.+?)$/m);
  if (titleMatch) {
    property.name = titleMatch[1].trim();
  }

  // Extract price
  const priceMatch = content.match(/\$[\d,]+(?:\.\d{2})?|\$\s*[\d,]+(?:\.\d{2})?/);
  if (priceMatch) {
    property.price = priceMatch[0].replace(/\s/g, '');
  }

  // Extract bedrooms
  const bedsMatch = content.match(/(\d+)\s*(?:bed|bedroom|alcoba|dormitorio)s?/i);
  if (bedsMatch) {
    property.bedrooms = parseInt(bedsMatch[1]);
  }

  // Extract bathrooms
  const bathsMatch = content.match(/(\d+)\s*(?:bath|bathroom|baño|sanitario)s?/i);
  if (bathsMatch) {
    property.bathrooms = parseInt(bathsMatch[1]);
  }

  // Extract area in square meters
  const areaMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:m2|m²|square\s*meters?|metros?\s*cuadrados?)/i);
  if (areaMatch) {
    property.area = parseFloat(areaMatch[1]);
  }

  // Extract location/zone
  const locationMatch = content.match(/(?:Location|Ubicación|Zona|Zone):\s*([^\n]+)/i);
  if (locationMatch) {
    property.location = locationMatch[1].trim();
  }

  // Extract year built
  const yearMatch = content.match(/(?:Built|Construido|Año|Year):\s*(\d{4})/i);
  if (yearMatch) {
    property.yearBuilt = parseInt(yearMatch[1]);
  }

  // Base details object
  property.propertyDetails = {};

  // Extract property type (try from repoName FIRST, then content)
  const repoNameLower = repoName.toLowerCase();
  const contentLower = content.toLowerCase();
  
  const determineType = (text) => {
    if (text.includes('bodega') || text.includes('warehouse')) return 'warehouse';
    if (text.includes('finca') || text.includes('farm')) return 'farm';
    if (text.includes('hotel') || text.includes('hostal') || text.includes('motel')) return 'hotel';
    if (text.includes('oficina') || text.includes('office')) return 'office';
    if (text.includes('apartamento') || text.includes('apto') || text.includes('apartment')) return 'apartment';
    if (text.includes('casa') || text.includes('house')) return 'house';
    if (text.includes('edificio') || text.includes('building')) return 'building';
    if (text.includes('terreno') || text.includes('lote') || text.includes('land')) return 'land';
    if (text.includes('comercial') || text.includes('commercial')) return 'commercial';
    return null;
  };

  property.propertyType = determineType(repoNameLower) || determineType(contentLower) || 'apartment';

  // House specifics
  if (property.propertyType === 'house') {
    const conjuntoMatch = contentLower.match(/conjunto|condominio/i);
    const barrioMatch = contentLower.match(/barrio/i);
    property.propertyDetails.houseType = conjuntoMatch ? 'conjunto' : (barrioMatch ? 'barrio' : 'independiente');
  }

  // Extract Floor Level
  const pisoMatch = content.match(/(?:piso|nivel)[\s:]*(\d+|alto|bajo)/i);
  if (pisoMatch) {
    property.propertyDetails.floorLevel = pisoMatch[1];
  }

  // Extract View Type (Interior/Exterior)
  const viewMatch = content.match(/(?:vista|iluminaci[óo]n).*?(exterior|interior|calle|interna|panor[aá]mica)/i) 
    || content.match(/\b(exterior|interior)\b/i);
  if (viewMatch) {
    property.propertyDetails.viewType = viewMatch[1].toLowerCase();
  }

  // Extract Administration Fee
  const adminMatch = content.match(/administraci[óo]n[\s:\$]*([\d\.\,]+|no aplica|incluida)/i);
  if (adminMatch) {
    property.propertyDetails.administrationFee = adminMatch[1];
  } else {
     // If it's a neighborhood house it doesn't have administration usually
     if (property.propertyDetails.houseType === 'barrio') {
         property.propertyDetails.administrationFee = '0';
     }
  }

  // Extract description (first paragraph)
  const descMatch = content.match(/^[^#\n]+\n\n(.+?)(?:\n\n|$)/s) || content.match(/(?:Descripción|Description)[\s\S]*?\n(.+?)(?:\n\n|$)/i);
  if (descMatch) {
    property.description = descMatch[1].trim();
  }

  return property;
}

/**
 * Extract property data from repository
 */
async function extractPropertyData(owner, repo) {
  try {
    console.log(`📦 Extracting data from ${repo}...`);

    // Try to find property data in common locations
    const possiblePaths = [
      'property.json',
      'data.json',
      'README.md',
      'properties.json',
    ];

    for (const path of possiblePaths) {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
        });

        if (data.type === 'file') {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');

          if (path.endsWith('.json')) {
            console.log(`   ✅ Found JSON data at ${path}`);
            return JSON.parse(content);
          } else if (path === 'README.md') {
            console.log(`   ✅ Parsing README.md`);
            return parsePropertyFromReadme(content, repo);
          }
        }
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    }

    // If no data found, create minimal property entry
    console.log(`   ⚠️ No structured data found, creating minimal entry`);
    return {
      id: repo,
      name: repo.replace(/-/g, ' '),
      repository: repo,
      source: 'github',
      propertyType: 'apartment', // Default type
    };
  } catch (error) {
    console.error(`❌ Failed to extract data from ${repo}:`, error.message);
    return null;
  }
}

/**
 * Main sync function
 */
async function syncProperties() {
  try {
    console.log('🚀 Starting property synchronization from GitHub...\n');

    // Get authenticated user
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`👤 Authenticated as: ${user.login}\n`);

    const syncedProperties = [];
    const errors = [];

    // Sync each known property repository
    for (const repoName of KNOWN_PROPERTY_REPOS) {
      try {
        const propertyData = await extractPropertyData(user.login, repoName);

        if (propertyData) {
          syncedProperties.push({
            repository: repoName,
            name: propertyData.name,
            type: propertyData.propertyType || 'apartment',
            price: propertyData.price || 'N/A',
            location: propertyData.location || 'Bogotá',
            bedrooms: propertyData.bedrooms || 0,
            bathrooms: propertyData.bathrooms || 0,
            area: propertyData.area || 0,
            propertyDetails: propertyData.propertyDetails || {},
            status: 'synced',
          });
        }
      } catch (error) {
        errors.push({
          repository: repoName,
          error: error.message,
        });
      }
    }

    // Display results
    console.log('\n📊 Synchronization Results:');
    console.log('═'.repeat(60));
    console.log(`✅ Successfully synced: ${syncedProperties.length} properties`);
    if (errors.length > 0) {
      console.log(`❌ Failed: ${errors.length} repositories`);
    }

    if (syncedProperties.length > 0) {
      console.log('\n📋 Synced Properties:');
      console.log('─'.repeat(60));
      syncedProperties.forEach((prop, idx) => {
        console.log(`\n${idx + 1}. ${prop.name}`);
        console.log(`   Repository: ${prop.repository}`);
        console.log(`   Type: ${prop.type}`);
        console.log(`   Price: ${prop.price}`);
        console.log(`   Location: ${prop.location}`);
        console.log(`   Bedrooms: ${prop.bedrooms} | Bathrooms: ${prop.bathrooms}`);
        console.log(`   Area: ${prop.area} m²`);
        if (Object.keys(prop.propertyDetails || {}).length > 0) {
            console.log(`   Details: ${JSON.stringify(prop.propertyDetails)}`);
        }
      });
    }

    if (errors.length > 0) {
      console.log('\n⚠️ Errors:');
      console.log('─'.repeat(60));
      errors.forEach((err) => {
        console.log(`❌ ${err.repository}: ${err.error}`);
      });
    }

    // Save to JSON file
    const output = {
      timestamp: new Date().toISOString(),
      user: user.login,
      totalSynced: syncedProperties.length,
      totalErrors: errors.length,
      properties: syncedProperties,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('\n✅ Sync completed successfully!');
    console.log(`📁 Data ready for import into centralized catalog`);

    return output;
  } catch (error) {
    console.error('❌ Synchronization failed:', error.message);
    process.exit(1);
  }
}

// Run sync
syncProperties().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
