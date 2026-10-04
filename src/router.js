/**
 * router.js
 * Robust hash-based SPA router.
 */

const routes = {};
let defaultRoute = '/';
let currentCleanup = null;

export const router = {
  on(path, handler) { routes[path] = handler; return this; },
  setDefault(path) { defaultRoute = path; return this; },
  registerCleanup(fn) {
    currentCleanup = fn;
    return this;
  },
  navigate(path, params = {}) {
    window.history.pushState({ path, params }, '', `#${path}`);
    this._resolve(path, params);
  },
  start() {
    const resolveCurrent = (params = {}) => {
      const hash = window.location.hash.replace(/^#/, '').trim() || defaultRoute;
      const path = hash.split('?')[0] || defaultRoute;
      this._resolve(path, params);
    };

    window.addEventListener('popstate', (e) => {
      const pathFromHash = window.location.hash.replace(/^#/, '').trim().split('?')[0];
      const path = e.state?.path || pathFromHash || defaultRoute;
      const params = e.state?.params || {};
      this._resolve(path, params);
    });

    window.addEventListener('hashchange', () => {
      resolveCurrent({});
    });

    resolveCurrent({});
  },
  _resolve(path, params = {}) {
    if (typeof currentCleanup === 'function') {
      try {
        currentCleanup();
      } catch (err) {
        console.warn('Router cleanup error:', err);
      }
      currentCleanup = null;
    }
    const cleanPath = (path || '').split('?')[0] || defaultRoute;
    window.dispatchEvent(new CustomEvent('app:route-changed', { detail: { path: cleanPath, fullPath: path, params } }));
    const handler = routes[cleanPath] || routes[defaultRoute];
    if (handler) handler(params);
  }
};
