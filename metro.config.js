// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Extend the default config
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'db', 'sqlite'],
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  resolverMainFields: ['react-native', 'browser', 'main'],
};

// Apply NativeWind after extending the config
module.exports = withNativeWind(config, { 
  input: "./src/global.css" 
}); 