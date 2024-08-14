# style-with-extract-loader

Inject CSS into the DOM with extracting capability. Base on [style-loader](https://github.com/webpack-contrib/style-loader), which also extracts style content to files. Developed for web page record and replay optimization.

Only works when build mode is 'production' and hmr is disabled.

## Getting Started

To begin, you'll need to install `style-with-extract-loader`:

```console
npm install --save-dev style-with-extract-loader
```

or

```console
yarn add -D style-with-extract-loader
```

or

```console
pnpm add -D style-with-extract-loader
```

It's recommended to combine `style-with-extract-loader` with the [`css-loader`](https://github.com/webpack-contrib/css-loader)

Then add the loader to your `webpack` config. For example:

**style.css**

```css
body {
  background: green;
}
```

**component.js**

```js
import "./style.css";
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [
          {
            loader: "style-with-extract-loader",
            options: {
              extract: true,
              attributesKey: "data-custom-attribute-key",
              publicPath: "/",
              filename: "[id].[contenthash:8].css",
            },
          },
          "css-loader",
        ],
      },
    ],
  },
};
```

## Options

- [injectType](https://github.com/webpack-contrib/style-loader#injecttype)
- [attributes](https://github.com/webpack-contrib/style-loader#attributes)
- [insert](https://github.com/webpack-contrib/style-loader#insert)
- [styleTagTransform](https://github.com/webpack-contrib/style-loader#styleTagTransform)
- [base](https://github.com/webpack-contrib/style-loader#base)
- [esModule](https://github.com/webpack-contrib/style-loader#esModule)
- [extract](#extract)
- [attributesKey](#attributesKey)
- [publicPath](#publicPath)
- [filename](#filename)

## More Information

When turn off the extracting feature, This loader is just as same as [style-loader](https://github.com/webpack-contrib/style-loader). So you can read more information about the loader in [style-loader](https://github.com/webpack-contrib/style-loader) doc page.

## License

[MIT](./LICENSE)
