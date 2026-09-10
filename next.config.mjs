/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minimal deployment enabler: `next build` also emits a self-contained
  // server (`.next/standalone/server.js`) used by the Dockerfile.
  // `npm run dev` / `npm start` behavior is unchanged.
  output: 'standalone',
  experimental: { serverComponentsExternalPackages: ['tesseract.js'] },
};
export default nextConfig;
