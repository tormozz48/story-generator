import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Required for Next.js standalone to trace and bundle node_modules
  // from the monorepo root, not just the app directory.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
