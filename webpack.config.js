var webpack = require('webpack');

module.exports = function(env) {
    console.log('main config: env =', env);
    var filename = (env.production) ? 'production' : 'development';
    return require(`./webpack.${filename}.js`)(env);
}