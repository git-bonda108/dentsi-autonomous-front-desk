/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'build',
  basePath: '/dashboard',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
