import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
	plugins: [react()],
	root: "src/renderer",
	build: {
		outDir: "../../dist/renderer",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
});
