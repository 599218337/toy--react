var path = require('path');

module.exports = {
    mode: 'development',
    entry: './main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js'
    },
    module: {
        rules: [
            {
                test:/\.js$/,
                exclude: /(node_modules|bower_components)/,
                use:{
                    loader: "babel-loader",
                    options: {
                        presets:["@babel/preset-env"],
                        plugins:[['@babel/plugin-transform-react-jsx',{pragma:'createElement'}]]
                    }
                }
            }
        ]
    }
};