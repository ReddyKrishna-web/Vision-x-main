// Production entrypoint: respects Render/Heroku `PORT`, defaults to 30001 locally.
// The standalone server (`.next/standalone/server.js`) already reads
// `process.env.PORT` (fallback 3000) and binds `0.0.0.0`, but this wrapper
// keeps the repo's historical default of 30001 for local `npm start` / Docker
// while letting hosts like Render inject their own PORT (e.g. 10000).
process.env.PORT ||= '30001';
process.env.HOSTNAME ||= '0.0.0.0';

await import('../.next/standalone/server.js');
