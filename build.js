import * as esbuild from "esbuild"
import glsl from "./glsl-plugin.js"

const port = 8080;

async function run() {
  const entryPoints = [
    "src/index.html",
    "src/torn-leaf.jpg",
    "src/app.css",
    "src/app.js",
  ];
  const plugins = [
    glsl(),
  ];
  const context = await esbuild.context({
    entryPoints: entryPoints,
    outdir: "public",
    bundle: true,
    sourcemap: false,
    minify: true,
    loader: {
      ".html": "copy",
      ".css": "copy",
      ".jpg": "copy",
    },
    write: true,
    metafile: true,
    plugins: plugins,
  });

  await context.watch();
  await context.serve({port: port});
  console.log(`Serving on port ${port}`);
}

void run();
