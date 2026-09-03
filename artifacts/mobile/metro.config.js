const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

// Expo SDK 54 handles pnpm monorepo symlinks automatically.
config.resolver.unstable_enablePackageExports = true;
// This workspace also contains an Expo SDK 57 app. Force Metro to resolve
// native singletons from this app so it cannot pull React Native 0.86 through
// a linked workspace package while bundling this SDK 54 app.
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(__dirname, "node_modules/react"),
  "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
  "react-native": path.resolve(__dirname, "node_modules/react-native"),
  "@tanstack/react-query": path.resolve(
    __dirname,
    "node_modules/@tanstack/react-query",
  ),
};
const appSingletons = new Set([
  "react",
  "react-dom",
  "react-native",
  "@tanstack/react-query",
]);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const singleton = [...appSingletons].find(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`),
  );
  if (singleton) {
    const suffix = moduleName.slice(singleton.length);
    return context.resolveRequest(
      context,
      path.join(__dirname, "node_modules", singleton) + suffix,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
