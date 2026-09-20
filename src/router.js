/**
 * router.js
 * Robust hash-based SPA router.
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
  _resolve(path, params) {
    const handler = routes[path] || routes[defaultRoute];
    if (handler) handler(params);
  }
};
