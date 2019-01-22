const path = require("path");
const webpack = require("webpack");

module.exports = (env, argv) => {
  return {
    entry: [path.resolve(__dirname, "src/feature.js")],
    output: {
      path: path.join(__dirname, "../../dist"),
      filename: "dll.feature.js",
      library: "feature"
    },
    plugins: [
      new webpack.DllPlugin({
        path: path.join(__dirname, "../../dist/feature-manifest.json"),
        name: "feature"
      })
    ]
  };
};
