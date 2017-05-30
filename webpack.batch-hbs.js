const fs = require('fs');
const glob = require('glob');
const merge = require('merge');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const RESET_COLOR = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const WARNING = 'WARNING:';
const ERROR = 'ERROR:';

function mergeReadData(data, file, logType, message) {
    try {
        var fileJson = fs.readFileSync(file, {encoding: 'utf-8'}),
            parsedData = JSON.parse(fileJson);

        data = merge(parsedData, data);
    }
    catch (e) {
        var color;

        if (logType == WARNING) {
            color = YELLOW;
        } else if (logType == ERROR) {
            color = RED;
        }

        console.log(color + logType + RESET_COLOR, message);
    }

    return data;
}

/**
 * Batch HBS module. Takes a directory and outputs html pages for each index.hbs file found.
 * @module ./webpack.batch-hbs
 * @param {Object} settings - should include a path, destination, and optionally manifest, templateData, and inject
 * @return {Array}
 */
module.exports = function(settings) {
    if (!settings.path || !settings.destination) {
        return [];
    }

    var srcPath = fs.realpathSync(process.cwd() + settings.path); // get directory
    // glob all the template index files for the specified directory.
    // glob.sync options: https://github.com/isaacs/node-glob#globsyncpattern-options
    var pages = glob.sync(srcPath + '/**/index.hbs');
    // console colors: http://jafrog.com/2013/11/23/colors-in-terminal.html
    console.log('\nbatch hbs files:', GREEN, srcPath, RESET_COLOR);
    console.log('settings:', settings, '\n');

    return pages.map(function(template) {
        console.log(GREEN + template + RESET_COLOR);
        // output destination path
        var outputPath = template.replace('.hbs', '.html').replace(srcPath, settings.destination);
        // directory the index.hbs file is in
        var directory = template.substring(0, template.lastIndexOf('/'));
        // html page title. This should be overwritten with title value in manifest file.
        var title = 'Page Title';
        // path to the default json file. use if no manifest available.
        var defaultJsonPath = glob.sync(directory + '/*.json')[0];
        // inject defines where script tags are injected into the page. default is at the bottom of the page
        var inject = settings.inject || true;
        var manifestPath = directory + '/' + settings.manifest;
        var json;
        var data = {};

        // attempt to load the manifest file, if it exists
        if (manifestPath) {
            console.log('manifest:', manifestPath);
            var manifestData = mergeReadData(data, manifestPath, ERROR, 'manifest file could not be found.');

            title = manifestData.title || title;

            // attempt to loop through the manifest data sources and merge them into the data object
            if (manifestData.data) {
                manifestData.data.forEach(function(path, index) {
                    data = mergeReadData(data, path, ERROR, 'manifest data source ' + path + 'could not be found.');
                });
            } else {
                console.log(RED + ERROR + RESET_COLOR, 'manifest file is missing data paths.');
            }
        }

        // attempt to load the default data file, if it exists
        data = mergeReadData(data, defaultJsonPath, WARNING, 'default data could not be found.');

        // attempt to load the template data from settings if it was provided.
        if (settings.templateData) {
            data = mergeReadData(data, settings.templateData, ERROR, 'template data could not be found.')
        } else {
            console.log('Optional template data not provided.');
        }

        // console.log('directory:', directory);
        // console.log('json filepath:', defaultJsonPath);
        // console.log('json:', json);
        console.log('title:', title);
        // console.log('template:', template);
        console.log('data:', data);
        console.log('output filepath:', outputPath, '\n');

        // html-webpack-plugin options: https://github.com/jantimon/html-webpack-plugin#configuration
        return new HTMLWebpackPlugin({
            title: title,
            template: template,
            data: data,
            inject: inject,
            minify: {
                collapseWhitespace: true,
                // conservativeCollapse: true,
                removeComments: true
            },
            filename: outputPath.replace(srcPath, settings.destination)
        });
    });
}
