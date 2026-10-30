import {onRequest} from './functions/api/social.js';
import {onRequest as tutor} from './functions/api/tutor.js';

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/social') return onRequest({request, env});
    if (pathname === '/api/tutor') return tutor({request,env,waitUntil:ctx ? promise=>ctx.waitUntil(promise) : undefined});
    if (pathname.startsWith('/api/')) {
      return Response.json({error: 'Rota não encontrada.'}, {status: 404, headers: {'Cache-Control': 'no-store'}});
    }
    return env.ASSETS.fetch(request);
  }
};
