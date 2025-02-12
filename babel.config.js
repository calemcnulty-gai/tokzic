module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
      "nativewind/babel"
    ],
    plugins: [
      [require.resolve('babel-plugin-module-resolver'), {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src'
        }
      }],
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true
      }],
      'react-native-reanimated/plugin'
    ]
  };
}; 