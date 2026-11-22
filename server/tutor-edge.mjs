import {onRequest} from './tutor-handler.mjs';
import {tutorRuntimeEnv, withTutorCors} from './tutor-http.mjs';

export async function handleEdgeRequest({request, env, waitUntil}) {
  return withTutorCors(request, env, () => onRequest({request, env, waitUntil}));
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(request => handleEdgeRequest({
    request,
    env: tutorRuntimeEnv(),
    waitUntil: typeof EdgeRuntime !== 'undefined' ? promise => EdgeRuntime.waitUntil(promise) : undefined
  }));
}
