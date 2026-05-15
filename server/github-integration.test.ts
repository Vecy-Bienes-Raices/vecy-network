import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeGitHubIntegration } from './github-integration';

describe('GitHub Integration', () => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  beforeAll(() => {
    if (!GITHUB_TOKEN) {
      console.warn('⚠️ GITHUB_TOKEN not set, skipping GitHub integration tests');
    }
  });

  it('should validate GitHub token', async () => {
    if (!GITHUB_TOKEN) {
      console.log('Skipping test: GITHUB_TOKEN not configured');
      expect(true).toBe(true);
      return;
    }

    try {
      const result = await initializeGitHubIntegration(GITHUB_TOKEN);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.login).toBeDefined();
      expect(result.user.login).toBeTruthy();
      expect(result.octokit).toBeDefined();
      
      console.log(`✅ GitHub token validated for user: ${result.user.login}`);
    } catch (error) {
      console.error('❌ GitHub token validation failed:', error);
      throw error;
    }
  });

  it('should have valid token format', async () => {
    if (!GITHUB_TOKEN) {
      console.log('Skipping test: GITHUB_TOKEN not configured');
      expect(true).toBe(true);
      return;
    }

    expect(GITHUB_TOKEN).toBeDefined();
    expect(GITHUB_TOKEN).toBeTruthy();
    expect(GITHUB_TOKEN.length).toBeGreaterThan(0);
    
    // GitHub personal access tokens typically start with 'ghp_'
    expect(GITHUB_TOKEN.startsWith('ghp_')).toBe(true);
  });
});
