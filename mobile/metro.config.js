const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs extension (required for Firebase v9 JS SDK)
config.resolver.sourceExts.push('cjs');

// Disable package exports to resolve Firebase initialization issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
