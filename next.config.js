/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // PWA configuration will be added later
    // For now, optimize for mobile
    images: {
        formats: ['image/avif', 'image/webp'],
    },
}

module.exports = nextConfig
