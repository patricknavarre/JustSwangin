/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mediapipe/pose", "@mediapipe/camera_utils", "@mediapipe/drawing_utils"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
