let data = require('./api_info')
let result = {}
data.symbols.forEach(e => {
  result[e.symbol] = e.filters[1]
})
console.log(JSON.stringify(result))
