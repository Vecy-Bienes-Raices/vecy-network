import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { properties, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  initializeGitHubIntegration,
  createPropertiesCatalogRepo,
  listPropertyRepositories,
  extractPropertyData,
} from '../github-integration';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export const githubRouter = router({
  /**
   * Validate GitHub token and get user info
   */
  validateToken: publicProcedure.query(async () => {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    try {
      const result = await initializeGitHubIntegration(GITHUB_TOKEN);
      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      throw new Error(`GitHub validation failed: ${error}`);
    }
  }),

  /**
   * Create or get centralized properties catalog repository
   */
  setupCatalogRepo: publicProcedure.query(async () => {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    try {
      const { octokit, user } = await initializeGitHubIntegration(GITHUB_TOKEN);
      const repo = await createPropertiesCatalogRepo(octokit, user.login);

      return {
        success: true,
        repository: {
          name: repo.name,
          url: repo.html_url,
          owner: repo.owner.login,
          description: repo.description,
        },
      };
    } catch (error) {
      throw new Error(`Failed to setup catalog repository: ${error}`);
    }
  }),

  /**
   * List all property repositories
   */
  listPropertyRepos: publicProcedure.query(async () => {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    try {
      const { octokit, user } = await initializeGitHubIntegration(GITHUB_TOKEN);
      const repos = await listPropertyRepositories(octokit, user.login);

      return {
        success: true,
        repositories: repos.map((repo: any) => ({
          name: repo.name,
          url: repo.html_url,
          description: repo.description,
          updatedAt: repo.updated_at,
          topics: repo.topics || [],
        })),
      };
    } catch (error) {
      throw new Error(`Failed to list property repositories: ${error}`);
    }
  }),

  /**
   * Synchronize properties from GitHub repositories
   */
  syncPropertiesFromGitHub: publicProcedure
    .input(
      z.object({
        repositories: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!GITHUB_TOKEN) {
        throw new Error('GitHub token not configured');
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const { octokit, user } = await initializeGitHubIntegration(GITHUB_TOKEN);

        // Obtener el ID del superadmin de Vecy para asignarlo como agente
        const adminUser = await db
          .select()
          .from(users)
          .where(eq(users.email, 'vecybienesraices@gmail.com'))
          .limit(1);
        const adminId = adminUser.length > 0 ? adminUser[0].id : 1;

        // Get list of repos to sync
        let reposToSync = input.repositories || [];
        if (reposToSync.length === 0) {
          const repos = await listPropertyRepositories(octokit, user.login);
          reposToSync = repos.map((r: any) => r.name);
        }

        const syncedProperties = [];
        const errors = [];

        // Extract and sync data from each repository
        for (const repoName of reposToSync) {
          try {
            const propertyData = await extractPropertyData(
              octokit,
              user.login,
              repoName
            );

            if (propertyData) {
              // Check if property already exists
              const existing = await db
                .select()
                .from(properties)
                .where(eq(properties.sourceRepository, repoName))
                .limit(1);

              if (existing.length > 0) {
                // Update existing property
                await db
                  .update(properties)
                  .set({
                    ...propertyData,
                    agentId: adminId,
                    sourceRepository: repoName,
                    lastSyncedAt: new Date(),
                  })
                  .where(eq(properties.id, existing[0].id));
              } else {
                // Insert new property — asignar superadmin como captador
                await db.insert(properties).values({
                  ...propertyData,
                  agentId: adminId,
                  sourceRepository: repoName,
                  lastSyncedAt: new Date(),
                });
              }

              syncedProperties.push({
                repository: repoName,
                name: propertyData.name,
                status: 'synced',
              });
            }
          } catch (error) {
            errors.push({
              repository: repoName,
              error: String(error),
            });
          }
        }

        return {
          success: true,
          syncedCount: syncedProperties.length,
          syncedProperties,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error) {
        throw new Error(`Synchronization failed: ${error}`);
      }
    }),

  /**
   * Get sync status
   */
  getSyncStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    try {
      const allProperties = await db.select().from(properties);

      const syncedProperties = allProperties.filter(
        (p: any) => p.sourceRepository
      );
      const lastSync = syncedProperties.length > 0
        ? new Date(
            Math.max(
              ...syncedProperties.map((p: any) =>
                new Date(p.lastSyncedAt).getTime()
              )
            )
          )
        : null;

      return {
        success: true,
        totalProperties: allProperties.length,
        syncedFromGitHub: syncedProperties.length,
        lastSyncTime: lastSync,
        status: syncedProperties.length > 0 ? 'synced' : 'not_synced',
      };
    } catch (error) {
      throw new Error(`Failed to get sync status: ${error}`);
    }
  }),

  /**
   * Get all synced properties from GitHub
   */
  getSyncedProperties: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    try {
      const allProperties = await db.select().from(properties);
      const syncedProperties = allProperties.filter(
        (p: any) => p.sourceRepository
      );

      return {
        success: true,
        properties: syncedProperties,
        count: syncedProperties.length,
      };
    } catch (error) {
      throw new Error(`Failed to get synced properties: ${error}`);
    }
  }),
});
