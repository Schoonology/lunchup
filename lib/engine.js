/**
 * TODO: Description.
 */
var debug = require('debug')('lunchup:Engine')
var weighted = require('weighted')
var SIZE_PTS = 2
var SIBLING_PTS = 1

/**
 * Creates a new instance of LunchUp with the provided `options`.
 *
 * @param {Object} options
 */
function LunchUp(options) {
  if (!(this instanceof LunchUp)) {
    return new LunchUp(options)
  }

  options = options || {}

  this.values = []
  this.valueToCohorts = {}
  this.cohortToValues = {}
}

/**
 * Writes a single record, represented as an Array of Strings, to internal
 * state. Can be used with an Object Mode stream.
 */
LunchUp.prototype.write = function write(record) {
  var self = this
  var value = record[0]
  var cohortIds = record.slice(1)

  self.valueToCohorts[value] = (self.valueToCohorts[value] || []).concat(cohortIds)

  cohortIds.forEach(function (cohortId, index) {
    self.cohortToValues[cohortId] = self.cohortToValues[cohortId] || []
    self.cohortToValues[cohortId].push(value)
  })
}

/**
 * Adds a single _value_, represented as a String, to internal state. Once
 * this method has been called, on values added this way will be grouped.
 */
LunchUp.prototype.writeValue = function writeValue(value) {
  this.values.push(value)
}

/**
 * Loads cohort data from `table`, where each row contains
 * [value, cohortId, ...].
 *
 * Returns the LunchUp instance for cascading.
 */
LunchUp.prototype.addData = function addData(table) {
  var self = this

  table.forEach(function (record) {
    self.write(record)
  })

  return self
}

/**
 * Returns an Array of Arrays containing groups of `size` values, spread as
 * desirable.
 */
LunchUp.prototype.generateGroups = function generateGroups(size) {
  var self = this
  var values = self.values.length ? self.values : Object.keys(self.valueToCohorts)
  var numGroups = Math.ceil(values.length / size)
  var groups = new Array(numGroups)
  var netScore = 0
  var i

  debug('Records:\n', self.valueToCohorts)

  for (i = 0; i < groups.length; i++) {
    groups[i] = []
  }

  values
    // Shuffle
    .sort(function (a, b) {
      return Math.random() * 2 - 1
    })
    // Choose
    .forEach(function (value) {
      var siblings = {}
      var preferences = []
      var availableGroups

      self.valueToCohorts[value].forEach(function (cohort, index) {
        self.cohortToValues[cohort].forEach(function (siblingValue) {
          if (siblingValue === value) {
            return
          }

          siblings[siblingValue] = (siblings[siblingValue] || 0) + SIBLING_PTS
        })
      })

      debug('---')
      debug('Value: %s', value)
      debug('Siblings: %j', siblings)

      availableGroups = groups
        .map(function (group, index) {
          var score = group.length * SIZE_PTS

          group.forEach(function (groupValue) {
            score += siblings[groupValue] || 0
          })

          debug('Value: %s - Group: %s - Score: %s - Members: %s', value, index, score, group)

          return {
            index: index,
            score: score
          }
        })
        .sort(function (a, b) {
          return a.score - b.score
        })

      availableGroups.every(function (group) {
        if (!preferences.length || preferences[0].score === group.score) {
          preferences.push(group)
          return true
        }

        return false
      })

      var choice = weighted.select(preferences)
      debug('Choice: %j', choice)

      groups[choice.index].push(value)

      netScore += choice.score
    })

  groups.score = netScore

  debug('---')
  debug('Net Score: %s', netScore)
  debug('Ideal Score: %s', self._calculateIdealScore(size))

  return groups
}

/**
 * Attempts to generate an optimal set of groups, given `size`. Runs
 * `generateGroups` multiple times.
 */
LunchUp.prototype.generateOptimalGroups = function generateOptimalGroups(size) {
  var idealScore = this._calculateIdealScore(size)
  var bestScore = Number.MAX_VALUE
  var best
  var groups
  var i

  for (i = 0; i < 100 || bestScore === idealScore; i++) {
    groups = this.generateGroups(size)

    if (groups.score < bestScore) {
      best = groups
      bestScore = groups.score
    }
  }

  debug('===')
  debug('Final score: %s', bestScore)
  debug('Runs required: %s', i)
  return best
}

/**
 * Calculates the "ideal score" for a lunch group, given the `size`.
 */
LunchUp.prototype._calculateIdealScore = function _calculateIdealScore(size) {
  var values = Object.keys(this.valueToCohorts).length
  var groups = Math.ceil(values / size)
  var minSize = Math.floor(values / groups)

  return (minSize - 1) / 2 * SIZE_PTS * minSize * groups + (values - groups * minSize) * minSize * SIZE_PTS
}

/*!
 * Export `LunchUp`.
 */
module.exports = LunchUp
