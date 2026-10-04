/**
 * router.js
 * Robust hash-based SPA router.
 */

const routes = {};
let defaultRoute = '/';
let currentCleanup = null;

export const router = {
  on(path, handler) {
    const norm = path.startsWith('/') ? path : '/' + path;
    routes[norm] = handler;
    return this;
  },
  setDefault(path) {
    defaultRoute = path.startsWith('/') ? path : '/' + path;
    return this;
  },
  registerCleanup(fn) {
    currentCleanup = fn;
    return this;
  },
  navigate(path, params = {}) {
    let norm = (path || '').trim();
    if (norm && !norm.startsWith('/')) norm = '/' + norm;
    window.history.pushState({ path: norm, params }, '', `#${norm || defaultRoute}`);
    this._resolve(norm || defaultRoute, params);
  },
  start() {
    const resolveCurrent = (params = {}) => {
      let hash = window.location.hash.replace(/^#/, '').trim();
      if (hash && !hash.startsWith('/')) hash = '/' + hash;
      const path = (hash ? hash.split('?')[0] : defaultRoute) || defaultRoute;
      this._resolve(path, params);
    };

    window.addEventListener('popstate', (e) => {
      let hash = window.location.hash.replace(/^#/, '').trim();
      if (hash && !hash.startsWith('/')) hash = '/' + hash;
      const path = e.state?.path || (hash ? hash.split('?')[0] : defaultRoute) || defaultRoute;
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
    let cleanPath = (path || '').split('?')[0] || defaultRoute;
    if (cleanPath && !cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
    window.dispatchEvent(new CustomEvent('app:route-changed', { detail: { path: cleanPath, fullPath: path, params } }));
    const handler = routes[cleanPath] || routes[defaultRoute];
    if (handler) handler(params);
  }
};
