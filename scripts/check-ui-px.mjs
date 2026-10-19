import assert from 'node:assert/strict'
import postcss from 'postcss'
import pxtorem from 'postcss-pxtorem'
import config from '../postcss.config.js'

const source = `
:root { --app-table-font-size: 14px; }
.sample { font: 14px/20px Arial; font-size: 14px; line-height: 20px; letter-spacing: 1px; width: 160px; }
@media (max-width: 1440px) { .sample { width: 80px; } }
@container (max-width: 900px) { .sample { width: 40px; } }
`
const { root } = await postcss([pxtorem(config.plugins['postcss-pxtorem'])])
  .process(source, { from: 'src/styles/px-check.css' })
const declarations = new Map()
root.walkDecls(declaration => {
  if (!declarations.has(declaration.prop)) declarations.set(declaration.prop, declaration.value)
})
assert.equal(declarations.get('--app-table-font-size'), '14px')
assert.equal(declarations.get('font'), '14px/20px Arial')
assert.equal(declarations.get('font-size'), '14px')
assert.equal(declarations.get('line-height'), '20px')
assert.equal(declarations.get('letter-spacing'), '1px')
assert.equal(declarations.get('width'), '10rem')
assert.deepEqual(root.nodes.filter(node => node.type === 'atrule').map(node => node.params), [
  '(max-width: 1440px)', '(max-width: 900px)',
])
console.log('PASS: fixed px typography, preserved layout conversion and px breakpoints')
