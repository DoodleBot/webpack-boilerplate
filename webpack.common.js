const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');

module.exports = function(env = {}) {
    console.log('common config: env =', env);

    return {
        entry: './src/js/index.js',
        output: {
            path: path.join(__dirname, 'dist')
        },
        plugins: [
            new HTMLWebpackPlugin({
                template: './src/index.html',
                filename: 'index.html'
            })
        ],
        // stats options: https://webpack.js.org/configuration/stats/
        stats: 'verbose',
        profile: false // set to true to see process timing
    }
}