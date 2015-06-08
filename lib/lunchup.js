/**
 * TODO: Description.
 */
var debug = require('debug')('lunchup')
var weighted = require('weighted')

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
  var numGroups = Math.ceil(Object.keys(self.valueToCohorts).length / size)
  var groups = new Array(numGroups)
  var netScore = 0
  var i

  debug('Records:\n', self.valueToCohorts)

  for (i = 0; i < groups.length; i++) {
    groups[i] = []
  }

  Object.keys(self.valueToCohorts)
    // Shuffle
    .sort(function (a, b) {
      return Math.random() * 2 - 1
    })
    // Choose
    .forEach(function (value) {
      var siblings = []
      var preferences = []
      var availableGroups

      self.valueToCohorts[value].forEach(function (cohort, index) {
        self.cohortToValues[cohort].forEach(function (siblingValue) {
          siblings.push(siblingValue)
        })
      })

      availableGroups = groups
        .map(function (group, index) {
          var score = group.length * 2

          group.forEach(function (groupValue) {
            if (siblings.indexOf(groupValue) !== -1) {
              score += 1
            }
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

  debug('Net Score: %s', netScore)

  return groups
}

/*!
 * Export `LunchUp`.
 */
module.exports = LunchUp
