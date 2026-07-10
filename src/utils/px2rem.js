const DESIGN_WIDTH = 1920

export const px2rem = px => {
  const value = Number(px)
  if (Number.isNaN(value)) return px
  return `${value / 16}rem`
}

export const px2vw = px => {
  const value = Number(px)
  if (Number.isNaN(value)) return px
  return `${(value / DESIGN_WIDTH) * 100}vw`
}

export default {
  install(app) {
    app.config.globalProperties.$px2rem = px2rem
    app.config.globalProperties.$px2vw = px2vw
  },
}
