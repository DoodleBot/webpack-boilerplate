const fs = require('fs');
const glob = require('glob');
const merge = require('merge');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const RESET_COLOR = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const WARNING = YELLOW + 'WARNING:' + RESET_COLOR;
const ERROR = RED + 'ERROR:' + RESET_COLOR;

/*
 * Merges provided data object with provided json file. If error occurs during file read, callback function is called.
 * @param {object} data - the object to be merged into
 * @param {string} path - json file path
 * @param {function} onFail - callback function for failure
 * @return {object} the merged data object or if nothing was merged the original data object.
 */
function mergeReadData(data, path, onFail) {
    parseDataFile(path, function(parsedData) {
        data = merge(parsedData, data);
    }, onFail);

    return data;
}

/*
 * Reads a file then parses it as json into an object. calls a success callback with data object or fail callback with error.
 * @param {string} path - The file's location
 * @param {function} onSuccess - Success callback function. Called with parsed data on success.
 * @param {function} onFail - Fail callback function. Called if the file wasn't able to be read.
 * @return {null}
 */
function parseDataFile(path, onSuccess, onFail) {
    try {
        var fileJson = fs.readFileSync(path, {encoding: 'utf-8'}),
            parsedData = JSON.parse(fileJson);

        onSuccess(parsedData);
    }
    catch (e) {
        onFail(e);
    }
}

/*
 * Iterates through an object's property tree and applying a callback function to each
 * @param {object} node - object to iterate through
 * @param {function} callback - callback function to pass object and property name to
 * @return {null}
 */
function searchNode(node, callback) {
    Object.keys(node).forEach(function(name) {

        callback(node, name);

        if (typeof node[name] === 'object' && Object.keys(node[name]).length > 0) {
            searchNode(node[name], callback);
        }
    });
}

/*
 * Takes an object and iterates through it replacing import properties with the referenced file data.
 * If an import is found, it runs again to capture any imports in the imported file(s).
 * @param {object} target - the object to search for imports
 * @return {object} returns the target, altered or not
 */
function findReplaceImport(target) {
    var importFound = false;

    // parse through target looking for 'import' and array names that include the substring 'imports'. then importing the paths within them.
    searchNode(target, function(node, name) {
        if (name === 'import') {
            parseDataFile(node[name], function(parsedData) {
                importData(node, parsedData);
                importFound = true;
            }, function(e) {
                console.log(ERROR, 'import file at "' + node[name] + '" could not be found');
            });

            // remove property 'import' from node
            delete node.import;
        } else if (name.includes('imports') && Array.isArray(node[name])) {
            node[name].forEach(function(path) {
                parseDataFile(path, function(parsedData) {
                    importData(node, parsedData);
                    importFound = true;
                }, function(e) {
                    console.log(ERROR, 'import file at "' + path + '" could not be found');
                });
            });

            // remove array 'imports' from node
            delete node[name];
        }
    });

    // if an import is found, rerun the function in case an imported file contained another import
    if (importFound) {
        return findReplaceImport(target);
    }

    return target;
}

/*
 * Takes an object with an import property and replaces it with the provided data
 * @param {object} target - the object that has the import property
 * @param {object} data - the object that contains properties to replace the import property in the target object
 * @return {object} returns the altered target object
 */
function importData(target, data) {
    // loop over data keys() and check if each property matches an already existing property in target
    Object.keys(data).forEach(function(name, index) {
        // if the property already exists in target
        if (target[name]) {
            // console log a warning that the property was overwritten
            console.log(WARNING, '"' + name + '" has been overwritten during a data import.');
        }

        // copy the property to the target object
        var desc = Object.getOwnPropertyDescriptor(data, name);
        Object.defineProperty(target, name, desc);
    });

    return target;
}

/**
 * Batch HBS module. Takes a directory and outputs html pages for each index.hbs file found.
 * @module ./webpack.batch-hbs
 * @param {Object} settings - config properties:
        path - required. location of the page(s) to process
        globPattern - optional. has a default value of '/**\/index.hbs'. Defines what handlebars templates to process into pages.
        globOptions - optional. default is empty object
        destination - has a default value of '.'. The location where the resulting files will be saved to.
        pageData - optional. has a default value of 'data.json'. Page specific data.
        templateData - optional. json data for any template elements like header and footer
        manifest - optional. has default value of 'manifest.json'. Provides array of data files to load as well as page specific meta data
        inject - has default value of true. defines where the scripts are injected.
 * @return {Array}
 */
module.exports = function(settings) {
    if (!settings.path) {
        return [];
    }

    if (!settings.globPattern) {
        settings.globPattern = '/**/index.hbs';
    }

    if (!settings.globOptions) {
        settings.globOptions = {};
    }

    if (!settings.destination) {
        settings.destination = '.';
    }

    if (!settings.pageData) {
        settings.pageData = 'data.json';
    }

    if (!settings.manifest) {
        settings.manifest = 'manifest.json';
    }

    var srcPath = fs.realpathSync(process.cwd() + settings.path); // get directory
    // glob all the template index files for the specified directory.
    // glob.sync options: https://github.com/isaacs/node-glob#globsyncpattern-options
    var pages = glob.sync(srcPath + settings.globPattern, settings.globOptions);
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
        // path to the default json file. can be used instead of, or in combination with, the manifest file.
        var defaultJsonPath = glob.sync(directory + '/' + settings.pageData)[0];
        // inject defines where script tags are injected into the page. default is at the bottom of the page
        var inject = settings.inject || true;
        var manifestPath = directory + '/' + settings.manifest;
        var json;
        var data = {};

        // attempt to load the manifest file, if it exists
        if (manifestPath) {
            var manifestFound = true;
            var manifestData = mergeReadData(data, manifestPath, function(e) {
                console.log(WARNING, 'manifest file could not be found at "' + manifestPath + '".');
                manifestFound = false;
            });

            if (manifestFound) {
                title = manifestData.title || title;

                // attempt to loop through the manifest data sources and merge them into the data object
                if (manifestData.data) {
                    manifestData.data.forEach(function(path, index) {
                        data = mergeReadData(data, path, function(e) {
                            console.log(ERROR, 'manifest data source ' + path + 'could not be found.');
                        });
                    });
                } else {
                    console.log(WARNING, 'manifest file is missing data paths.');
                }
            }
        }

        // attempt to load the default data file, if it exists
        if (defaultJsonPath) {
            data = mergeReadData(data, defaultJsonPath, function(e) {
                console.log(WARNING, 'page specific data could not be found at "' + defaultJsonPath + '".');
            })
        }

        // attempt to load the template data from settings if it was provided.
        if (settings.templateData) {
            data = mergeReadData(data, settings.templateData, function(e) {
                console.log(ERROR, 'template data could not be found at "' + settings.templateData + '".');
            });
        } else {
            console.log('Optional template data not provided.');
        }

        // iterate through data for import properties and load json files in there place
        data = findReplaceImport(data);

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
