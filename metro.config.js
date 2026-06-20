const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Agregar .mjs a las extensiones que Metro resuelve
// necesario para lucide-react-native que exporta en ESM (.mjs)
config.resolver.sourceExts.push("mjs");

module.exports = config;
