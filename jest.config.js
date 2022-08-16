module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: ['^.+\\.js$'],
  modulePaths: ['<rootDir>/src', '<rootDir>/tests'],
  runner: 'jest-serial-runner',
};
