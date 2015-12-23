'use strict'

var test = require('tape')
var Throughv = require('./')

test('process things in parallel', function (t) {
  t.plan(6)

  var throughv = new Throughv({ objectMode: true })
  var list = ['a', 'b', 'c']
  var transformed = 0

  throughv._transform = function (chunk, enc, cb) {
    t.equal(transformed, 0, 'chunk processed in parallel')
    setImmediate(function () {
      transformed++
      cb(null, chunk)
    })
  }

  throughv.cork()
  list.forEach(throughv.write.bind(throughv))
  throughv.uncork()

  throughv.on('data', function (chunk) {
    t.equal(chunk, list.shift())
  })
})
