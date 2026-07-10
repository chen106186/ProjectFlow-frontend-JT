const BASE_FONT_SIZE = 16
const DESIGN_WIDTH = 1920

function setRem() {
  const width = document.documentElement.clientWidth || DESIGN_WIDTH
  const ratio = width / DESIGN_WIDTH
  document.documentElement.style.fontSize = `${BASE_FONT_SIZE * ratio}px`
}

setRem()
window.addEventListener('resize', setRem)
