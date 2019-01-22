var chokidar = require('chokidar');
const fs = require("fs");
const { src, task, context } = require("fuse-box/sparky");
const { FuseBox, QuantumPlugin, CSSPlugin, SassPlugin } = require("fuse-box");
const glob = require("glob");
const path = require("path");

const PAGE_ENTRIES = Symbol.for("Fusebox#PageEntries");
const CSS_FILES = Symbol.for("Fusebox#CssFiles");

const extractSpecPath = path => path.match(/src\/pages\/([^.]*)\/.*\..*$/)[1];

context(class {
  getConfig(dev = true) {
    const folderName = dev ? 'local' : "build";
    return FuseBox.init({
      homeDir: "./",
      target: "browser@es5",
      // if fuse has specific package name, group css will fall error to default
      // package: "demo",
      output: `dist/${folderName}/$name_$hash.js`,
      plugins: [
        [
          SassPlugin(),
          CSSPlugin()
        ],
        [
          CSSPlugin()
        ],
        !dev && QuantumPlugin({
          uglify: true,
          manifest: true,
          treeshake: true,
          css: { clean : true },
          cssFiles: this.cssFiles,
          bakeApiIntoBundle: "vendor"
        })
      ],
      cache: dev,
      hash: !dev
    });
  }

  get pageEntries() {
    if (!this[PAGE_ENTRIES]) {
      this[PAGE_ENTRIES] = glob.sync("src/pages/**/main.[tj]s?(x)").map(entry => ({
        name: extractSpecPath(entry),
        instructions: ` !> [${entry}]`
      }));
    }
    return this[PAGE_ENTRIES];
  }

  get cssFiles() {
    if (!this[CSS_FILES]) {
      this[CSS_FILES] = glob.sync("src/pages/**/main.[tj]s?(x)").reduce((cssFiles, entry) => {
        const specPath = extractSpecPath(entry);
        const key = `default/**${specPath.split("/").join("**")}**`;
        const value = `${specPath}.css`;
        cssFiles[key] = value;
        return cssFiles;
      }, {});
    }
    return this[CSS_FILES];
  }

  async clean(dev = true) {
    const folderName = dev ? 'local' : 'build';
    await src("dist").clean(`dist/${folderName}`).exec();
  }

  initFuse(dev = true) {
    const bundles = [
      {
        name: 'vendor',
        instructions: '~ src/pages/**/main.ts'
      }
    ].concat(this.pageEntries);

    const fuse = this.getConfig(dev);

    if (dev) {
      fuse.dev({ port: 4396 });
    }

    bundles.forEach(dev ?
      entry => {
        fuse.bundle(entry.name)
          .watch("client/**")
          .hmr()
          .instructions(entry.instructions);
      }
      : entry => {
        fuse.bundle(entry.name).instructions(entry.instructions)
      }
    );
    return fuse;
  }

  development() {
    const fuse = this.initFuse();
    return fuse.run();
  }

  async pre() {
    const fuse = this.initFuse(false);
    const { bundles } = await fuse.run();
    return bundles;
  }

  createJsHash(bundles) {
    console.log('  → Files: ====== preparing  version_js  file ======');
    // create version_js.json file for CDN and server application
    console.log('  → Files: ======  version_js  is done        ======');
  }

  async createCssHash() {
    console.log('  → Files: ====== preparing version_css  file ======');
    const filePath = path.resolve(__dirname, "./dist/build/manifest.json");
    const watcher = chokidar.watch(filePath);
    return new Promise((resolve, reject) => {
      try {
        watcher.on('add', () => {
          const manifest = require("./dist/build/manifest.json")
          console.log('  → Files: ======  version_css  is done       ======');
          // create version_css.json file for CDN and server application after manifest.json file changed
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }
});

task("default", async ctx => {
  await ctx.clean();
  await ctx.development();
});

task("pre", async ctx => {
  await ctx.clean(false);
  const bundles = await ctx.pre();
  ctx.createJsHash(bundles);
  await ctx.createCssHash();
  // CDN upload method
  // await ctx.runCDN();
  process.exit();
});
