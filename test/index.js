var exec = require('child_process').exec
var fs = require('fs')
var path = require('path')
var csv = require('csv')
var debug = require('debug')('lunchup:Test')
var through = require('through')

function run(tee, callback) {
  var results = []
  var extra = tee ? ' | tee previous.csv' : ' previous.csv'
  var execString = 'node ../bin/lunchup 3 company.csv' + extra
  var child = exec(execString, {
    cwd: __dirname,
    env: process.env
  })

  child.stderr.pipe(process.stderr)

  child
    .stdout
    .pipe(csv.parse())
    .pipe(through(function (record) {
      results.push(record)
    }, function () {
      callback(null, results)
    }))
}

function getDuplicates(firstResults, secondResults) {
  var namesById = {}
  var siblingsByName = {}
  var duplicates = {}

  firstResults
    .forEach(function (pair) {
      namesById[pair[1]] = namesById[pair[1]] || []
      siblingsByName[pair[0]] = siblingsByName[pair[0]] || []

      siblingsByName[pair[0]] = siblingsByName[pair[0]].concat(namesById[pair[1]])
      namesById[pair[1]].forEach(function (name) {
        siblingsByName[name].push(pair[0])
      })
      namesById[pair[1]].push(pair[0])
    })

  namesById = {}

  secondResults
    .forEach(function (pair) {
      namesById[pair[1]] = namesById[pair[1]] || []
      siblingsByName[pair[0]] = siblingsByName[pair[0]] || []

      siblingsByName[pair[0]] = siblingsByName[pair[0]].concat(namesById[pair[1]])
      namesById[pair[1]].forEach(function (name) {
        siblingsByName[name].push(pair[0])
      })
      namesById[pair[1]].push(pair[0])
    })

  Object
    .keys(siblingsByName)
    .forEach(function (name) {
      var seen = {}

      siblingsByName[name].forEach(function (sibling) {
        if (seen[sibling] && !duplicates[name] && !duplicates[sibling]) {
          duplicates[name] = sibling
        }

        seen[sibling] = true
      })
    })

  return Object.keys(duplicates)
    .map(function (name) {
      return [name, duplicates[name]]
    })
}

function runAndCheck(callback) {
  debug('--- New run')

  run(true, function (err, firstResults) {
    run(false, function (err, secondResults) {
      var duplicates = getDuplicates(firstResults, secondResults)

      if (duplicates.length) {
        duplicates
          .forEach(function (pair) {
            console.error('Duplicate: %s', pair.join(', '))
          })

        process.exit(1)
      }

      callback()
    })
  })
}

function runMultiple(count) {
  if (count === 0) {
    return
  }

  runAndCheck(function () {
    runMultiple(count - 1)
  })
}

runMultiple(process.argv[2] || 10)
