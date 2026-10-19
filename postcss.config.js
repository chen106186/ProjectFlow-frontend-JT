export default {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 16,
      propList: ['*', '!font*', '!line-height', '!letter-spacing', '!--*'],
      exclude: /node_modules/i,
      unitPrecision: 5,
      replace: true,
      mediaQuery: false,
      minPixelValue: 1
    }
  }
}
