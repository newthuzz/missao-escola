import {onRequest} from './functions/api/social.js';

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/social') return onRequest({request, env});
    if (pathname.startsWith('/api/')) {
      return Response.json({error: 'Rota não encontrada.'}, {status: 404, headers: {'Cache-Control': 'no-store'}});
    }
    return env.ASSETS.fetch(request);
  }
};
