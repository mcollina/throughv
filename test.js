'use strict'

var Readable = require('readable-stream').Readable
var Writable = require('readable-stream').Writable
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

test('piping still works', function (t) {
  var readable = new Readable({ objectMode: true })
  var throughv = new Throughv({
    objectMode: true,
    highWaterMark: 4
  })
  var writable = new Writable({ objectMode: true })
  var total = 0
  var transformed = 0

  readable._read = function (n) {
    for (var i = 0; i < n; i++) {
      this.push(i)
    }

    // ends at first run
    this.push(null)
  }

  throughv._transform = function (chunk, enc, cb) {
    // the first element come single
    if (transformed === 1) {
      t.ok((transformed - 1) % 4 === 0, 'transformed in batch of 4')
    }

    setImmediate(function () {
      transformed++
      cb(null, chunk * 2)
    })
  }

  writable._write = function (chunk, enc, cb) {
    t.equal(chunk, (total++) * 2, 'chunk arrived in order')
    setImmediate(cb)
  }

  writable.on('finish', t.end.bind(t))

  readable.pipe(throughv).pipe(writable)
})
