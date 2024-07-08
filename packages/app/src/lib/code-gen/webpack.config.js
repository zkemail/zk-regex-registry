const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: "",
    output: {
        path: "",
        filename: 'generate_inputs_worker_bundled.js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "stream": require.resolve("stream-browserify"),
            "timers": require.resolve("timers-browserify"),
            "vm": require.resolve("vm-browserify"),
            "dns": false,
            'process/browser': require.resolve('process/browser')
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: "process/browser",
            Buffer: ["buffer", "Buffer"],
        }),
        new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
            const mod = resource.request.replace(/^node:/, "");
            switch (mod) {
                case "buffer":
                    resource.request = "buffer";
                    break;
                case "stream":
                    resource.request = "readable-stream";
                    break;
                default:
                    throw new Error(`Not found ${mod}`);
            }
        }),
    ]
};
