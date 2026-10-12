/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "sqlite3"],
  },
  reactStrictMode: false,
};

export default nextConfig;
