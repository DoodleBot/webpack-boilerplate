const fs = require('fs');
const glob = require('glob');
const merge = require('merge');
const HTMLWebpackPlugin = require('html-webpack-plugin');

/**
 * Batch HBS module.
 * @module ./webpack.batch-hbs
 * @param {Object} settings - should include a path, destination, and optionally a manifest
 * @return {Array}
 */
module.exports = function(settings) {
    if (!settings.path || !settings.destination) {
        return [];
    }

    var realContentFolderPath = fs.realpathSync(process.cwd() + settings.path);
    var pages = glob.sync(realContentFolderPath + '/**/*.hbs', {
        ignore: ['!' + realContentFolderPath + '/**/index.hbs']
    });
    console.log('hbs files:', pages);

    return pages.map(function(page) {
        var hbsFilepath = page.replace('.hbs', '.html');
        console.log('filepath:', hbsFilepath);

        var directory = page.substring(0, page.lastIndexOf('/'));
        console.log('directory', directory);

        var title = directory.substring(0, directory.lastIndexOf('/'));
        var jsonFilepath = glob.sync(directory + '/*.json')[0];
        console.log('json file path:', jsonFilepath);

        var json = jsonFilepath ? fs.readFileSync(jsonFilepath, {encoding: 'utf-8'})
            : '{"error":"data file could not be found"}';
        var inject = true;

        console.log('json:', json);
        var data = JSON.parse(json);
        var templateData = settings.templateData;

        // if template data was passed, merge it into the context data.
        if (templateData) {
            var templateJson = fs.readFileSync(templateData, {encoding: 'utf-8'});
            templateJson ? templateJson : '{}';
            templateData = JSON.parse(templateJson);
            data = merge(templateData, data);
        }
        // var template = data.partial ? settings.wrapper : page;

        console.log('title', title);
        console.log('template', page);
        console.log('data', data);
        console.log('filename', hbsFilepath.replace(realContentFolderPath, settings.destination));

        // html-webpack-plugin options: https://github.com/jantimon/html-webpack-plugin#configuration
        return new HTMLWebpackPlugin({
            title: title,
            template: page,
            data: data,
            inject: inject,
            minify: {
                collapseWhitespace: true,
                // conservativeCollapse: true,
                removeComments: true
            },
            // component: fs.readFileSync(page, {encoding: 'utf-8'}),
            filename: hbsFilepath.replace(realContentFolderPath, settings.destination)
        });
    });
}
