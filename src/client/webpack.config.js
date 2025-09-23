const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ProgressPlugin = require('progress-webpack-plugin');
const config_server = require('../config/server.json');


module.exports = {
    watchOptions: {
        aggregateTimeout: 200,
        poll: 1000,
    },
    entry: "./src/index.js",
    output: {
        publicPath: (config_server.basepath? config_server.basepath : '/') + 'assets/',  
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, 'build/assets'),
        clean: true
    },
    plugins: [
        new HtmlPlugin({
            title: 'Production',
            inject: true,
            template: "./view/index.html", 
            filename: "../index.html"
        }),
        new MiniCssExtractPlugin({
            filename: "[name].css",
            chunkFilename: "[id].css",
        }),
        new CopyPlugin({
            patterns: [
                { from: "./view/css", to: "../css" },
                { from: "./view/fonts", to: "../fonts" },
                { from: "./view/img", to: "../img" },
                { from: "./view/js", to: "../js" },
                { from: "./view/svg", to: "../svg" }                
            ],
        }),
        new ProgressPlugin(true)
    ],
    optimization: {
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
        splitChunks: {
            chunks: "initial",
            minSize: 0,
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendors",
                    minSize: 30000,
                    maxSize: 200000,
                },
                asyncVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "asyncVendors",
                    chunks: "async",
                    minSize: 30000,
                    maxSize: 200000,
                },
                asyncCommon: {
                    name: "asyncCommon",
                    chunks: "async",
                    maxSize: 900,
                },
            }
        }
    },
    performance: {
        hints: false
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: { 
                        presets: ['@babel/env','@babel/preset-react'] 
                    }
                }
            },
            {
                test: /\.html$/,
                loader: 'html-loader'
            },
            {
                test: /\.(scss)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader',
                    {
                        loader: "sass-loader",
                        options: {
                            api: "legacy" // legacy | modern
                        },
                    },
                ]
            },
            {
                test: /\.css$/,
                use: [ 
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf|png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            }
        ]
    }
};