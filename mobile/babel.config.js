/**
 * babel.config.js
 *
 * WHY THESE PLUGINS:
 *
 * Firebase v9 JS SDK uses private class fields (#field syntax) which Hermes
 * does not support natively. These Babel plugins transform them to
 * WeakMap-based equivalents that Hermes can execute.
 *
 * The `loose: true` option is REQUIRED — all three plugins must use the same
 * loose setting or Babel will throw a conflict error.
 *
 * react-native-reanimated/plugin MUST be last in the plugins array.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated worklet transform — MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
