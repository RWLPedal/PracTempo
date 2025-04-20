const path = require('path');

module.exports = {
  entry: './main.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader', // Use ts-loader to compile TypeScript
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'bundle.js', // The output bundle file
    path: path.resolve(__dirname, '../js'), // Output directory (same as your tsconfig)
    publicPath: '/js/',
  },
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, '../'), //  Serve content from the root
    },
    compress: true,
    port: 4000, //  You can choose a different port
    hot: true, //  Enable Hot Module Replacement (HMR)
  },
};