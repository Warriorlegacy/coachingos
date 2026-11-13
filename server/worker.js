// server/worker.js - Cloudflare Workers Edge Entrypoint
import { createApp } from './app.js';

export default {
  async fetch(request, env, ctx) {
    // When running inside Cloudflare Workers, env.ASSETS serves static assets
    // and env.DB provides Cloudflare D1
    const app = createApp();

    // Check if request is an API call
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    // Static assets fallback via Workers Static Assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return app.fetch(request, env, ctx);
  },
};
