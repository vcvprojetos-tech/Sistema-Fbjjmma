const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: process.cwd(),
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
