/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.shopify.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.shopify.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
    NEXT_PUBLIC_SHOPIFY_API_VERSION: process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION,
    NEXT_PUBLIC_LP_METAOBJECT_HANDLE: process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE,
  },
}

module.exports = nextConfig
