// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tambahkan headers untuk Content Security Policy
  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)", // Terapkan untuk semua halaman
  //       headers: [
  //         {
  //           key: "Content-Security-Policy",
  //           value:
  //             "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';",
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;
