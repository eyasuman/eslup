const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Expo SDK 54 handles pnpm monorepo symlinks automatically.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
