export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['index.js'],
  coveragePathIgnorePatterns: ['/node_modules/', 'example.js'],
  verbose: true,
};
