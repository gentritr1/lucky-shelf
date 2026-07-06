const { createRequire } = require('node:module');

// pnpm keeps a strict node_modules: babel-preset-expo is a dependency of expo,
// not of the project root, so resolve it through expo's own require context.
const expoRequire = createRequire(require.resolve('expo/package.json'));

module.exports = function configureBabel(api) {
  api.cache(true);

  return {
    presets: [expoRequire.resolve('babel-preset-expo')],
    // Reanimated 4: the worklets Babel plugin moved to react-native-worklets.
    plugins: ['react-native-worklets/plugin'],
  };
};
