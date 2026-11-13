// server/worker.js - Cloudflare Workers Edge Entrypoint
import { createApp } from './app.js';
import { setActiveD1 } from './db.js';

export default {
  async fetch(request, env, ctx) {
    if (env.DB) {
      setActiveD1(env.DB);
    }

    const app = createApp();
    const url = new URL(request.url);

    // Check if request is an API call
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    // Static assets fallback via Workers Static Assets binding
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && !url.pathname.includes('.')) {
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return response;
    }

    return app.fetch(request, env, ctx);
  },
};
