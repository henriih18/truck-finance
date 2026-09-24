const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Evita que Metro intente resolver archivos .wasm en móviles
config.resolver.unstable_enablePackageExports = false;

module.exports = config;