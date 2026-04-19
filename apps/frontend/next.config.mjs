import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Required for Next.js standalone to trace and bundle node_modules
    // from the monorepo root, not just the app directory.
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  images: {
    // Image URLs point to localhost:9000 (MinIO) which is browser-accessible but not
    // reachable from inside the Next.js Docker container. Skip server-side optimization
    // so the browser fetches images directly from MinIO.
    unoptimized: true,
  },
};

export default nextConfig;
