import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Evita que Next tome como raíz un package-lock.json fuera del proyecto
    root: path.join(__dirname),
  },
};

export default nextConfig;
