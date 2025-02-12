// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support
  isCSSEnabled: true,
});

// Add custom configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'db', 'sqlite'],
  sourceExts: [...config.resolver.sourceExts, 'svg'],
  // Prioritize the 'react-native' field in package.json
  resolverMainFields: ['react-native', 'browser', 'main'],
};

module.exports = withNativeWind(config, { 
  input: "./src/global.css" 
}); 