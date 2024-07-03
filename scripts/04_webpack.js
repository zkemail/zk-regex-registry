const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const path = require("path");
const fs = require("fs");

if (process.argv.length < 5) {
  console.log("Usage: node 04_webpack.js <inputFile> <outputDir> <filename>");
  process.exit(1);
}

const inputFile = process.argv[2];
const outputDir = process.argv[3];
const filename = process.argv[4];

webpackConfig.entry = inputFile;
webpackConfig.output = {
  ...webpackConfig.output,
  path: outputDir,
  filename: filename
}


if (!fs.existsSync(webpackConfig.entry)) {
  console.log("entry file not found")
  process.exit(1)
}

webpack(webpackConfig, (err, stats) => {
  if (err || stats.hasErrors()) {
    console.log(err || stats.compilation.errors);
  }
  if (!fs.existsSync(path.resolve(webpackConfig.output.path, webpackConfig.output.filename))) {
    console.log("output file not found");
    process.exit(1);
  }
});