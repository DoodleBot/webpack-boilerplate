const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const batchHbs = require('./webpack.batch-hbs');

module.exports = function(env = {}) {
    console.log('common config: env =', env);

    // collecting all plugins in an array before adding to the config.
    var plugins = [
        new HTMLWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html'
        })
    ];

    // generated array of html-webpack-plugin to be concat with rest of plugins
    var pageHtml = batchHbs({
        path: '/src/pages/',                                    // path of files to return as plugins
        globPattern: '/**/index.hbs',                           // glob pattern that defines what files to capture in the path. using the default value.
        globOptions: {'ignore':['**/no-data/index.hbs']},       // glob options. default is empty object
        manifest: 'manifest.json',                              // array of json files to use for template context
        pageData: 'data.json',                                  // page specific data file. using the default value.
        templateData: './src/layouts/page-template-data.json',  // template data to be applied to all pages in this batch
        destination: '.',                                       // output location
        inject: true                                            // defines the location of script injection. using default value.
    });

    var componentHtml = batchHbs({
        path: '/src/components/'
    });

    var noDataTestHtml = batchHbs({
        path: '/src/pages/',
        globPattern: '/no-data/index.hbs',
        templateData: './bad-path/file-will-not-be-found.json'  // testing error response for missing template file
    });

    // add the generated html-webpack-plugins to the plugins array.
    plugins = plugins.concat(pageHtml, componentHtml, noDataTestHtml);

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
