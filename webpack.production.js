const Merge = require('webpack-merge');
const webpack = require('webpack');
const commonConfig = './webpack.common.js';

module.exports = function(env = {}) {
    console.log('dev config: env =', env);

    return Merge(require(commonConfig)(env), {
        output: {
            publicPath: '../',
            filename: 'js/[name].[chunkhash:12].min.js'
        },
        plugins: [
            new webpack.EnvironmentPlugin({
                NODE_ENV: 'production',
                DEBUG: 'false'
            })
        ],
        externals: [function(context, request, callback) {
            if (/\.(woff2?|ttf|hbs|handlebars|html?)$/.test(request)) {
                return callback(null, 'commonjs ' + request);
            }
            callback();
        }]
    });
}
