import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('GitHub Router', () => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  it('should validate GitHub token', async () => {
    if (!GITHUB_TOKEN) {
      console.log('⏭️ Skipping test: GITHUB_TOKEN not configured');
      expect(true).toBe(true);
      return;
    }

    try {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.github.validateToken();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.login).toBe('Vecy-Bienes-Raices');

      console.log(`✅ GitHub token validated for user: ${result.user.login}`);
    } catch (error) {
      console.error('❌ GitHub token validation failed:', error);
      throw error;
    }
  });

  it('should setup catalog repository', async () => {
    if (!GITHUB_TOKEN) {
      console.log('⏭️ Skipping test: GITHUB_TOKEN not configured');
      expect(true).toBe(true);
      return;
    }

    try {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.github.setupCatalogRepo();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.repository).toBeDefined();
      expect(result.repository.name).toBe('vecy-properties-catalog');
      expect(result.repository.url).toContain('github.com');

      console.log(`✅ Catalog repository ready: ${result.repository.url}`);
    } catch (error) {
      console.error('❌ Failed to setup catalog repository:', error);
      throw error;
    }
  });

  it('should list property repositories', async () => {
    if (!GITHUB_TOKEN) {
      console.log('⏭️ Skipping test: GITHUB_TOKEN not configured');
      expect(true).toBe(true);
      return;
    }

    try {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.github.listPropertyRepos();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.repositories).toBeDefined();
      expect(Array.isArray(result.repositories)).toBe(true);
      expect(result.repositories.length).toBeGreaterThan(0);

      console.log(`✅ Found ${result.repositories.length} property repositories`);

      // Verify expected repositories
      const repoNames = result.repositories.map((r: any) => r.name);
      expect(repoNames).toContain('Apto-San-Patricio-Bogota');
      expect(repoNames).toContain('edificio-castellana');
    } catch (error) {
      console.error('❌ Failed to list property repositories:', error);
      throw error;
    }
  });

  it('should get sync status', async () => {
    if (!GITHUB_TOKEN) {
      console.log('⏭️ Skipping test: GITHUB_TOKEN not configured');
      expect(true).toBe(true);
      return;
    }

    try {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.github.getSyncStatus();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalProperties).toBeDefined();
      expect(result.syncedFromGitHub).toBeDefined();
      expect(result.status).toMatch(/synced|not_synced/);

      console.log(
        `✅ Sync status: ${result.totalProperties} total, ${result.syncedFromGitHub} from GitHub`
      );
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      throw error;
    }
  });
});
