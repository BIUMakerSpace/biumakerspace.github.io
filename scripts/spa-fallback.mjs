// GitHub Pages has no SPA rewrites: it serves 404.html for unknown paths.
// Shipping a copy of index.html as 404.html lets deep links like /catalog load the app.
import { copyFileSync } from "node:fs";

copyFileSync("dist/index.html", "dist/404.html");
console.log("spa-fallback: wrote dist/404.html");
