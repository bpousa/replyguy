/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['oaidalleapiprodscus.blob.core.windows.net'], // For DALL-E images if needed
  },
};

module.exports = nextConfig;