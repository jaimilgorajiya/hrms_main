/**
 * polyfills.js (or index.js) — loaded FIRST before any other module.
 */

// ─── 0. Event / event-target-shim read-only 'NONE' Fix ──────────────────────
(function polyfillEvent() {
  let originalEvent = global.Event;

  function wrapEvent(value) {
    if (!value) return value;
    try {
      const CustomEvent = function Event(type, options) {
        return Reflect.construct(value, [type, options]);
      };
      
      Object.getOwnPropertyNames(value).forEach(prop => {
        try {
          const desc = Object.getOwnPropertyDescriptor(value, prop);
          if (desc) {
            desc.writable = true;
            desc.configurable = true;
            Object.defineProperty(CustomEvent, prop, desc);
          } else {
            Object.defineProperty(CustomEvent, prop, {
              value: value[prop],
              writable: true,
              configurable: true,
              enumerable: true
            });
          }
        } catch (e) {}
      });
      
      CustomEvent.prototype = value.prototype;
      return CustomEvent;
    } catch (e) {
      return value;
    }
  }

  // Wrap immediately if already defined
  if (originalEvent) {
    originalEvent = wrapEvent(originalEvent);
    global.Event = originalEvent;
    if (typeof globalThis !== 'undefined') {
      globalThis.Event = originalEvent;
    }
  }

  // Define getter/setter to intercept future assignments
  const defineInterceptor = (obj) => {
    try {
      Object.defineProperty(obj, 'Event', {
        configurable: true,
        enumerable: true,
        get() {
          return originalEvent;
        },
        set(value) {
          originalEvent = wrapEvent(value);
        }
      });
    } catch (e) {
      console.warn('[polyfills] Failed to define Event interceptor on', obj === global ? 'global' : 'globalThis', e.message);
    }
  };

  defineInterceptor(global);
  if (typeof globalThis !== 'undefined' && globalThis !== global) {
    defineInterceptor(globalThis);
  }
})();

// ─── 1. DOMException ────────────────────────────────────────────────────────
// DEFINE THIS FIRST before importing anything else!
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DOMException);
      }
    }
  };
  if (typeof globalThis !== 'undefined' && typeof globalThis.DOMException === 'undefined') {
    globalThis.DOMException = global.DOMException;
  }
}

// ─── 2. TextEncoder / TextDecoder ───────────────────────────────────────────
if (typeof global.TextEncoder === 'undefined') {
  try {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
    if (typeof globalThis !== 'undefined') {
      globalThis.TextEncoder = TextEncoder;
      globalThis.TextDecoder = TextDecoder;
    }
  } catch (e) {
    console.warn('[polyfills] text-encoding not available:', e.message);
  }
}

// ─── 3. btoa / atob ─────────────────────────────────────────────────────────
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof global.atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// ─── 4. URL / URLSearchParams ────────────────────────────────────────────────
if (typeof global.URL === 'undefined' || typeof global.URLSearchParams === 'undefined') {
  try {
    require('react-native-url-polyfill/auto');
  } catch (e) {
    console.warn('[polyfills] react-native-url-polyfill not available:', e.message);
  }
}

// ─── 5. NOW LOAD THE ROUTER ──────────────────────────────────────────────────
// Now that globals are safely attached, we can boot Expo Router safely.
require('expo-router/entry');