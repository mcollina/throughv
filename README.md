# throughv

**stream.Transform with parallel chunk processing**

Same as [Rod Vagg](https://github.com/rvagg)'s
[through2](https://github.com/rvagg/through2)
but with parallel chunk processing. `throughv` is useful to
augment/process data
coming from a stream in a fast parallel fashion, e.g. fetching some
relevant data from a database.

```js
fs.createReadStream('ex.txt')
  .pipe(throughv(function (chunk, enc, callback) {
    // this happen in parallel for all chunks
    // in the stream's buffer, the parallelism
    // is determined by highWaterMark

    for (var i = 0; i < chunk.length; i++)
      if (chunk[i] == 97)
        chunk[i] = 122 // swap 'a' for 'z'

    setImmediate(callback, null, chunk)
   }))
  .pipe(fs.createWriteStream('out.txt'))
```

Or object streams:

```js
var all = []

fs.createReadStream('data.csv')
  .pipe(csv2())
  .pipe(throughv.obj(function (chunk, enc, callback) {
    // this happen in parallel for all chunks
    // in the stream's buffer, the parallelism
    // is determined by highWaterMark

    var data = {
        name    : chunk[0]
      , address : chunk[3]
      , phone   : chunk[10]
    }

    setImmediate(callback, null, data)
  }))
  .on('data', function (data) {
    all.push(data)
  })
  .on('end', function () {
    doSomethingSpecial(all)
  })
```

Note that `throughv.obj(fn)` is a convenience wrapper around `throughv({
objectMode: true }, fn)`.

## Install

`npm i throughv --save`

## API

<b><code>throughv([ options, ] [ transformFunction ] [, flushFunction
])</code></b>

Consult the
**[stream.Transform](http://nodejs.org/docs/latest/api/stream.html#stream_class_stream_transform)**
documentation for the exact rules of the `transformFunction` (i.e.
`this._transform`) and the optional `flushFunction` (i.e.
`this._flush`).

### options

The options argument is optional and is passed straight through to
`stream.Transform`. So you can use `objectMode:true` if you are
processing non-binary streams (or just use `throughv.obj()`).

In order to set the maximum parallelism at which the instance will
process chunks, __set highWaterMark__. It is defaulted at 16KB for
binary streams, and at 16 for object streams.

The `options` argument is first, unlike standard convention, because if
I'm passing in an anonymous function then I'd prefer for the options
argument to not get lost at the end of the call:

```js
fs.createReadStream('/tmp/important.dat')
  .pipe(throughv({ objectMode: true, allowHalfOpen: false },
    function (chunk, enc, cb) {
      cb(null, 'wut?')
    }
  )
  .pipe(fs.createWriteStream('/tmp/wut.txt'))
```

### transformFunction

The `transformFunction` must have the following signature: `function
(chunk, encoding, callback) {}`. A minimal implementation should call
the `callback` function to indicate that the transformation is done,
even if that transformation means discarding the chunk.

To queue a new chunk, call `callback(err, data) `&mdash;this **must be called
only once for each chunk**.

If you **do not provide a `transformFunction`** then you will get a
simple pass-through stream.

### flushFunction

The optional `flushFunction` is provided as the last argument (2nd or
3rd, depending on whether you've supplied options) is called just prior
to the stream ending. Can be used to finish up any processing that may
be in progress.

```js
fs.createReadStream('/tmp/important.dat')
  .pipe(throughv(
    function (chunk, enc, cb) { cb(null, chunk) }, // transform is a
noop
    function (cb) { // flush function
      this.push('tacking on an extra buffer to the end');
      cb();
    }
  ))
  .pipe(fs.createWriteStream('/tmp/wut.txt'));
```

<b><code>new Throughv(options)</code></b>

This has the same api of
[Transform](https://nodejs.org/api/stream.html#stream_class_stream_transform),
so you can subclass it if you want

## Acknowledgements

throughv is sponsored by [nearForm](http://nearform.com).

Code was taken and adapted from
[node.js](http://nodejs.org), [readable-stream](http://npm.im/readable-stream), and [through2](http://npm.im/through2).

## License

MIT
