// global-polyfill.js
if (typeof globalThis.DOMException === 'undefined') {
  class DOMExceptionPolyfill extends Error {
    constructor(message, name) {
      super(message);
      this.name = name ?? 'DOMException';
      this.code = 0;
    }
  }
  globalThis.DOMException = DOMExceptionPolyfill;
  global.DOMException = DOMExceptionPolyfill;
}   