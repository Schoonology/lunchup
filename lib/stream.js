/**
 * TODO: Description.
 */
var assert = require('assert')
var util = require('util')
var debug = require('debug')('lunchup:Stream')
var stream = require('readable-stream')
var LunchUp = require('./engine')

/**
 * Creates a new instance of LunchUpStream with the provided `options`.
 *
 * @param {Object} options
 */
function LunchUpStream(options) {
  if (!(this instanceof LunchUpStream)) {
    return new LunchUpStream(options)
  }

  options = options || {}
  options.objectMode = true

  this.size = options.groupSize

  assert(this.size, 'LunchUpStream.size is required')

  stream.Duplex.call(this, options)

  this._engine = new LunchUp()
  this._pendingStreams = []
  this._shouldFinish = false
  this._data = null
  this._initEvents()
}
util.inherits(LunchUpStream, stream.Duplex)

/**
 * A more flexible version of `end` that allows all existing pipes to complete
 * first.
 */
LunchUpStream.prototype.endSoon = function endSoon() {
  this._shouldFinish = true

  debug('Should end soon.')

  return this
}

/**
 * Reads a single [value, groupId] record from the stream.
 */
LunchUpStream.prototype._read = function _read(n) {
  if (this._data) {
    if (!this._data.length) {
      this.push(null)
      return
    }

    this.push(this._data.shift())
  }

  return this
}

/**
 * Writes a single [value, cohortId, ...] record to the stream.
 */
LunchUpStream.prototype._write = function _write(record, encoding, callback) {
  this._engine.write(record)

  callback()
}

/**
 * Finishes the stream, flushing all remaining group data.
 */
LunchUpStream.prototype._finish = function _finish() {
  var groups = this._engine.generateOptimalGroups(this.size)

  debug('Finishing...')

  this._data = []

  this._data = groups.reduce(function (arr, group, index) {
    return arr.concat(group.map(function (value) {
      return [value, index]
    }))
  }, [])

  this._read()

  return this
}

/**
 * Helper to initialize internal event listeners.
 */
LunchUpStream.prototype._initEvents = function _initEvents() {
  var self = this

  self.on('pipe', function (src) {
    debug('New input stream: %s', src.constructor.name)

    self._pendingStreams.push(src)

    src.on('end', function () {
      self._pendingStreams.splice(self._pendingStreams.indexOf(src), 1)

      debug('Finished: %s', src.constructor.name)

      if (self._pendingStreams.length === 0 && self._shouldFinish) {
        self._finish()
      }
    })
  })

  self.on('finish', function () {
    self._shouldFinish = true

    if (self._pendingStreams.length === 0) {
      self._finish()
    }
  })

  return self
}

/*!
 * Export `LunchUpStream`.
 */
module.exports = LunchUpStream
