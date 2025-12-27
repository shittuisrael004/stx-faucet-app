/** @type {import('next').NextConfig} */
const nextConfig = {
  // This forces Next.js to skip the "Static Site Generation" for the home page
  // which is where the "prerendering" error happens.
  output: 'standalone', 
  experimental: {
    // Ensure turbopack is NOT enabled here
  }
};

export default nextConfig;