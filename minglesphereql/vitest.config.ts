import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globalSetup: './shared/test-setup.ts',
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
