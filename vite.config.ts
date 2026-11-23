import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // "/" for a custom domain or local dev, "/<repo>/" for a GitHub Pages project site.
    base: env.VITE_BASE_PATH || "/",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // Guard against two React copies (e.g. from linked packages) breaking hooks.
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
  };
});
