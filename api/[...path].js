import app from './index.js';

// The catch-all function receives `/config`, while Express routes include `/api`.
export default function handler(request, response) {
  request.url = `/api${request.url}`;
  return app(request, response);
}
