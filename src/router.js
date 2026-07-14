/**
 * router.js
 * Simple hash-based SPA router.
 */

const routes = {};
let defaultRoute = '/';

export const router = {
  on(path, handler) { routes[path] = handler; return this; },
  setDefault(path) { defaultRoute = path; return this; },
  navigate(path, params = {}) {
    window.history.pushState({ path, params }, '', `#${path}`);
    this._resolve(path, params);
  },
  start() {
    window.addEventListener('popstate', (e) => {
      const { path, params } = e.state || { path: defaultRoute, params: {} };
      this._resolve(path, params);
    });
    const hash = window.location.hash.replace('#', '') || defaultRoute;
    this._resolve(hash, {});
  },
  _resolve(path, params) {
    const handler = routes[path] || routes[defaultRoute];
    if (handler) handler(params);
  }
};
