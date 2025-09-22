import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		"main/index": "src/main/index.ts",
		"preload/index": "src/config/preload.ts",
	},
	format: ["cjs"],
	outDir: "dist",
	sourcemap: true,
	target: "node18",
	outExtension() {
		return { js: ".cjs" };
	},
	watch: process.env.WATCH === "true",
	external: ["electron"],
	esbuildOptions(options) {
		options.define = {
			...options.define,
			__filename: "__filename",
			__dirname: "__dirname",
		};
		options.keepNames = true;
		options.minify = false;
		options.treeShaking = false;
		options.platform = "node";
		options.mainFields = ["main", "module"];
	},
});
