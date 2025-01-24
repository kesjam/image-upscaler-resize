/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        os: false,
        path: false,
        stream: false,
        zlib: false
      };
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp']
  }
};

module.exports = nextConfig; 