const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const batchHbs = require('./webpack.batch-hbs');

module.exports = function(env = {}) {
    console.log('common config: env =', env);

    // generated array of html-webpack-plugin to be concat with rest of plugins
    var pageHtml = batchHbs({
        path: '/src/pages/',                        // glob of files to return as plugins
        manifest: 'manifest.json',                  // array of json files to use for template context
        templateData: 'page-template-data.json',    // template data to be applied to all pages in this batch
        destination: '.'                            // output location
    });

    var plugins = [
        new HTMLWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html'
        })
    ];

    plugins = plugins.concat(pageHtml);

    return {
        entry: './src/js/index.js',
        output: {
            path: path.join(__dirname, 'dist')
        },
        plugins: plugins,
        // stats options: https://webpack.js.org/configuration/stats/
        stats: 'verbose',
        profile: false, // set to true to see process timing
        module: {
            rules: [
                {
                    test: /\.(hbs|handlebars|html?)$/,
                    use: [
                        {
                            loader: 'handlebars-loader',
                            options: {
                                // helperDirs: [
                                //     path.join(__dirname, 'src', 'helpers')
                                // ],
                                partialDirs: [
                                    // path.join(__dirname, 'src', 'elements'),
                                    // path.join(__dirname, 'src', 'molecules'),
                                    path.join(__dirname, 'src', 'components'),
                                    path.join(__dirname, 'src', 'layouts')
                                ]
                            }
                        }
                    ],
                    exclude: '/node_modules/'
                }
            ]
        }
    }
}
