import withPWA from '@ducanh2912/next-pwa'

const isProd = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const baseConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

const nextConfig = withPWA({
  ...baseConfig,
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: !isProd,
    cacheOnFrontEndNav: true,
    workboxOptions: {
      navigateFallback: '/offline',
      runtimeCaching: [
        {
          urlPattern: ({ request }) => ['image', 'font', 'style'].includes(request.destination),
          handler: 'CacheFirst',
          options: { cacheName: 'static-assets', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } }
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 }
        },
        {
          urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase', networkTimeoutSeconds: 10 }
        }
      ]
    }
  }
})

export default nextConfig
