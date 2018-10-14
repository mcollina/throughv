'use strict'

var Buffer = require('safe-buffer').Buffer
var Readable = require('readable-stream').Readable
var Writable = require('readable-stream').Writable
var callbackStream = require('callback-stream')
var test = require('tape')
var Throughv = require('./')

function itWorksInObjectMode (t, getInstance) {
  t.plan(6)

  var list = ['a', 'b', 'c']
  var transformed = 0
  var throughv = getInstance(function (chunk, enc, cb) {
    t.equal(transformed, 0, 'chunk processed in parallel')
    setImmediate(function () {
      transformed++
      cb(null, chunk)
    })
  })

  throughv.cork()
  list.forEach(throughv.write.bind(throughv))
  throughv.uncork()

  throughv.on('data', function (chunk) {
    t.equal(chunk, list.shift())
  })
}

function itWorksWithBuffers (t, getInstance) {
  t.plan(2)

  var list = []
  for (var i = 0; i < 2 * 16 * 1024; i++) {
    list.push(Buffer.alloc(1024))
  }
  var transformed = 0
  var throughv = getInstance(function (chunk, enc, cb) {
    if (transformed % (16 * 1024 * 1024)) {
      t.fail('chunks not processed in parallel')
    }
    setImmediate(function () {
      transformed++
      cb(null, chunk)
    })
  })

  throughv.cork()
  list.forEach(throughv.write.bind(throughv))
  throughv.uncork()
  throughv.end()

  throughv.pipe(callbackStream(function (err, list) {
    t.error(err)
    t.equal(list.length, 2 * 16 * 1024)
  }))
}

test('process things in parallel in object mode', function (t) {
  itWorksInObjectMode(t, function (transform) {
    var throughv = new Throughv({ objectMode: true })
    throughv._transform = transform
    return throughv
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

test('throughv.obj', function (t) {
  itWorksInObjectMode(t, function (transform) {
    return Throughv.obj(transform)
  })
})

test('process things in parallel with buffers', function (t) {
  itWorksWithBuffers(t, function (transform) {
    var throughv = new Throughv()
    throughv._transform = transform
    return throughv
  })
})

test('throughv', function (t) {
  itWorksWithBuffers(t, Throughv)
})

test('no transform function required', function (t) {
  t.plan(3)

  var list = ['a', 'b', 'c']
  var throughv = Throughv.obj()

  list.forEach(throughv.write.bind(throughv))

  throughv.on('data', function (chunk) {
    t.equal(chunk, list.shift())
  })
})

test('flush with throughv.obj', function (t) {
  t.plan(2)

  var list = ['a', 'b', 'c']
  var throughv = Throughv.obj(transform, flush)

  list.forEach(throughv.write.bind(throughv))

  throughv.on('end', function () {
    t.pass('end  emitted')
  })

  throughv.end()
  throughv.resume()

  function transform (chunk, enc, cb) {
    cb(null, chunk)
  }

  function flush (cb) {
    t.pass('flush called')
    cb()
  }
})

test('flush throughv', function (t) {
  t.plan(2)

  var list = ['a', 'b', 'c']
  var throughv = Throughv(transform, flush)

  list.forEach(throughv.write.bind(throughv))

  throughv.on('end', function () {
    t.pass('end  emitted')
  })

  throughv.end()
  throughv.resume()

  function transform (chunk, enc, cb) {
    cb(null, chunk)
  }

  function flush (cb) {
    t.pass('flush called')
    cb()
  }
})

test('destroy', function (t) {
  t.plan(1)

  var throughv = Throughv()
  throughv.destroy()

  throughv.on('close', function () {
    t.pass('close emitted')
  })
})

test('guard against push', function (t) {
  t.plan(1)

  Throughv(function (chunk, enc, cb) {
    t.equal(this, undefined, 'this should not be set')
    cb()
  }).write('hello')
})
