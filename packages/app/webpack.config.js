const path = require("path");
const webpack = require("webpack");

module.exports = (env, argv) => {
  return {
    target: "web",
    entry: path.resolve(__dirname, "src/app.js"),
    output: {
      path: path.resolve(__dirname, "../../dist/"),
      filename: "app.js"
    },
    plugins: [
      new webpack.DllReferencePlugin({
        context: path.resolve(__dirname, "../feature"),
        manifest: require(path.resolve(
          __dirname,
          "../../dist/feature-manifest.json"
        ))
      })
    ]
  };
};
