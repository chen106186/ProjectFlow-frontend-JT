export default {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 16,
      propList: ['*'],
      exclude: /node_modules/i,
      unitPrecision: 5,
      replace: true,
      mediaQuery: true,
      minPixelValue: 1
    }
  }
}
