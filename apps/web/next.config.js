/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  serverExternalPackages: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', '@grpc/grpc-js', 'protobufjs'],
};

module.exports = nextConfig;
