export default {
  transform: {
    '^.+\\.m?js$': 'babel-jest',
  },
  transformIgnorePatterns: [],
  testMatch: ['**/chapters/**/*.test.js'],
  globalSetup: './shared/test-setup.js',
  globalTeardown: './shared/test-teardown.js',
  testTimeout: 30000,
  maxWorkers: 1,
};
