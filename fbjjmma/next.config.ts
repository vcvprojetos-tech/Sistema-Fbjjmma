const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://fbjjmma.com.br/",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
