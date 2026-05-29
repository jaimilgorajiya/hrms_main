/**
 * index.js — App entry point
 *
 * WHY require() INSTEAD OF import:
 * ES module `import` statements are HOISTED — the JS engine evaluates ALL
 * static imports before executing any code in this file, regardless of the
 * order they appear. This means `import './polyfills'` would NOT run before
 * `import 'expo-router/entry'` pulls in web-streams-polyfill and other
 * packages that reference DOMException at module evaluation time.
 *
 * Using require() is synchronous and executes in the order written, so
 * polyfills.js is guaranteed to run FIRST before any other module is loaded.
 *
 * This is the standard pattern recommended for React Native polyfills.
 */

// STEP 1: Load polyfills synchronously BEFORE anything else.
// This sets global.DOMException (and other missing globals) before
// web-streams-polyfill / expo / firebase modules are evaluated.
require('./polyfills');

// STEP 2: Load the Expo Router entry point (which pulls in all app modules).
require('expo-router/entry');
