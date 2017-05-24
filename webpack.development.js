const Merge = require('webpack-merge');
const webpack = require('webpack');
const commonConfig = './webpack.common.js';

module.exports = function(env = {}) {
    console.log('dev config: env =', env);

    return Merge(require(commonConfig)(env), {
        output: {
            publicPath: '/',
            filename: 'js/[name].js'
        },
        plugins: [
            new webpack.EnvironmentPlugin({
                NODE_ENV: 'development',
                DEBUG: 'false'
            })
        ],
        // devServer options: https://webpack.js.org/configuration/dev-server/
        devServer: {
            hot: true,
            // stats: 'verbose',
            port: 8000
        },
    });
}