import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ProseMirror needs a DOM; the WebView bundle test opts into node itself.
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
