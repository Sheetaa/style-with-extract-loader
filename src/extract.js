import NativeModule from "module";

function evalModuleCode(loaderContext, code, filename) {
  const module = new NativeModule(filename, loaderContext);

  module.paths = NativeModule._nodeModulePaths(loaderContext.context); // eslint-disable-line no-underscore-dangle
  module.filename = filename;
  module._compile(code, filename); // eslint-disable-line no-underscore-dangle

  return module.exports;
}

function computeHash(loaderContext, content, hashDigestLength) {
  const { hashFunction, hashDigest } = loaderContext._compilation.outputOptions; // eslint-disable-line no-underscore-dangle

  const hash = loaderContext.utils.createHash(hashFunction);

  hash.update(content);

  return hash.digest(hashDigest).substring(0, hashDigestLength);
}

function emitCssFile(loaderContext, id, content, filenameOption) {
  const { basePath, hashDigestLength } = parseFilenameOption(filenameOption);

  const hash = computeHash(loaderContext, content, hashDigestLength);
  const filename = `${basePath}${id}.${hash}.css`;

  loaderContext.emitFile(filename, content);
  // const { webpack } = loaderContext._compiler;
  // loaderContext._compilation.emitAsset(filename, new webpack.sources.RawSource(content));

  return filename;
}

function parseFilenameOption(filenameOption) {
  const lastSlashIndex = filenameOption.lastIndexOf("/");
  const basePath = filenameOption.slice(0, lastSlashIndex + 1);

  const [, hashSegment] = filenameOption.split(".");
  const hashSegmentContent = hashSegment.slice(1, hashSegment.length - 1);
  const [, hashDigestLength] = hashSegmentContent.split(":");

  return {
    basePath,
    hashDigestLength,
  };
}

async function extractStyle(loaderContext, pluginName, request, publicPath) {
  return new Promise((resolve, reject) => {
    const loaders = loaderContext.loaders.slice(loaderContext.loaderIndex + 1);

    loaderContext.addDependency(loaderContext.resourcePath);

    const childFilename = "*";

    const outputOptions = {
      filename: childFilename,
      publicPath,
    };

    const childCompiler =
      // eslint-disable-next-line no-underscore-dangle
      loaderContext._compilation.createChildCompiler(
        `${pluginName} ${request}`,
        outputOptions,
      );

    // The templates are compiled and executed by NodeJS - similar to server side rendering
    // Unfortunately this causes issues as some loaders require an absolute URL to support ES Modules
    // The following config enables relative URL support for the child compiler
    childCompiler.options.module = { ...childCompiler.options.module };
    childCompiler.options.module.parser = {
      ...childCompiler.options.module.parser,
    };
    childCompiler.options.module.parser.javascript = {
      ...childCompiler.options.module.parser.javascript,
      url: "relative",
    };

    const { webpack } = loaderContext._compiler; // eslint-disable-line no-underscore-dangle
    const { NodeTemplatePlugin } = webpack.node;
    const { NodeTargetPlugin } = webpack.node;

    // @ts-ignore
    new NodeTemplatePlugin(outputOptions).apply(childCompiler);
    new NodeTargetPlugin().apply(childCompiler);

    const { EntryOptionPlugin } = webpack;

    const {
      library: { EnableLibraryPlugin },
    } = webpack;

    new EnableLibraryPlugin("commonjs2").apply(childCompiler);

    EntryOptionPlugin.applyEntryOption(childCompiler, loaderContext.context, {
      child: {
        library: {
          type: "commonjs2",
        },
        import: [`!!${request}`],
      },
    });
    const { LimitChunkCountPlugin } = webpack.optimize;

    new LimitChunkCountPlugin({ maxChunks: 1 }).apply(childCompiler);

    const { NormalModule } = webpack;

    childCompiler.hooks.thisCompilation.tap(
      `${pluginName} childCompiler loader`,
      (compilation) => {
        const normalModuleHook =
          NormalModule.getCompilationHooks(compilation).loader;

        normalModuleHook.tap(
          `${pluginName} childCompiler loader`,
          (context, module) => {
            if (module.request === request) {
              // eslint-disable-next-line no-param-reassign
              module.loaders = loaders.map((loader) => {
                return {
                  type: null,
                  loader: loader.path,
                  options: loader.options,
                  ident: loader.ident,
                };
              });
            }
          },
        );
      },
    );

    let source;

    childCompiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(pluginName, () => {
        source =
          compilation.assets[childFilename] &&
          compilation.assets[childFilename].source();

        // Remove all chunk assets
        compilation.chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            compilation.deleteAsset(file);
          });
        });
      });
    });

    childCompiler.runAsChild((error, entries, compilation) => {
      if (error) {
        reject(error);

        return;
      }

      if (compilation.errors.length > 0) {
        reject(compilation.errors[0]);

        return;
      }

      const assets = Object.create(null);
      const assetsInfo = new Map();

      for (const asset of compilation.getAssets()) {
        assets[asset.name] = asset.source;
        assetsInfo.set(asset.name, asset.info);
      }

      compilation.fileDependencies.forEach((dep) => {
        loaderContext.addDependency(dep);
      }, loaderContext);

      compilation.contextDependencies.forEach((dep) => {
        loaderContext.addContextDependency(dep);
      }, loaderContext);

      if (!source) {
        reject(new Error("Didn't get a result from child compiler"));

        return;
      }

      let originalExports;
      try {
        originalExports = evalModuleCode(loaderContext, source, request);
      } catch (e) {
        reject(e);

        return;
      }

      // eslint-disable-next-line no-underscore-dangle
      const exports = originalExports.__esModule
        ? originalExports.default
        : originalExports;

      resolve(exports);
    });
  });
}

export { emitCssFile, extractStyle };
