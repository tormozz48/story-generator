/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the shared workspace package
  transpilePackages: ['@story-generator/shared'],
  // Required for standalone Docker image
  output: 'standalone',
};

export default nextConfig;
