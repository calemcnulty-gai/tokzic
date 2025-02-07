// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('@react-native/metro-config');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support
  isCSSEnabled: true,
});

// Add any custom configuration here
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'db', 'sqlite'],
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

module.exports = config; 