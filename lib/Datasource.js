/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A Datasource is a prototype for sources of Triple Pattern Fragments. */

var request = require('request'),
    fs = require('fs'),
    _ = require('lodash');

// Creates a new Datasource
function Datasource() {}

Datasource.prototype = {
  // Queries the datasource for the given triple pattern,
  // returning individual triples through addTriple(triple),
  // count metadata trough setCount(count),
  // and signaling the end of the triple stream through done(error)
  query: function (pattern, offset, limit, addTriple, setCount, done) {
    this._query(pattern || {},
                Math.max(isFinite(offset) ? ~~offset :   0, 0),
                Math.max(isFinite(limit)  ? ~~limit  : 100, 1),
                _.isFunction(addTriple)   ? addTriple        : null,
                _.isFunction(setCount)    ? _.once(setCount) : _.noop,
                _.isFunction(done)        ? _.once(done)     : _.noop);
  },

  // Internal `query`, guarantees callbacks are single-call functions.
  // `addTriple` is `null` if only the count is needed.
  // Returns filtered output from `_getAllTriples` by default.
  _query: function (pattern, offset, limit, addTriple, setCount, done) {
    var filter = this.tripleFilter(pattern), count = 0;
    this._getAllTriplesCached(function (triple) {
      if (filter(triple)) {
        count++;
        if (addTriple && count > offset && limit-- > 0)
          addTriple(triple);
      }
    },
    function (error) {
      error || setCount(count);
      done(error);
    });
  },

  // Gets all the triples in the dataset,
  // returning individual triples through addTriple
  // and signaling the end of the triple stream through done.
  _getAllTriples: function (addTriple, done) {
    done();
  },

  // Gets all the triples in the dataset, using caching when appropriate.
  _getAllTriplesCached: function (addTriple, done) {
    // If already cached, return from cache
    if (this._cachedTriples)
      return this._cachedTriples.forEach(addTriple), done();
    // Get the triples with `_getAllTriples` and cache them
    var triples = [], self = this;
    this._getAllTriples(function (triple) {
      addTriple(triple);
      triples.push(triple);
    },
    function (error) {
      // Cache the triples for a certain time
      if (!error) {
        self._cachedTriples = triples;
        setTimeout(function () { delete self._cachedTriples; }, 60 * 1000);
      }
      done(error);
    });
  },

  // Retrieves the (approximate) number of triples that match the pattern,
  // returning through callback(error, count)
  count: function (pattern, callback) {
    _.isFunction(callback) && this._count(pattern || {}, _.once(callback));
  },

  // Internal `_count`, guarantees the callback is a single-call function
  _count: function (pattern, callback) {
    this._query(pattern, null, callback.bind(null, null), callback);
  },

  // Closes the data source
  close: function () {},

  // Creates a filter for triples that match the given triple pattern
  tripleFilter: function (pattern) {
    return function (triple) {
      return ((!pattern.subject   || pattern.subject   === triple.subject) &&
              (!pattern.predicate || pattern.predicate === triple.predicate) &&
              (!pattern.object    || pattern.object    === triple.object));
    };
  },

  // Filters those elements of the array that match the given triple pattern
  filterTriples: function (array, pattern) {
    return array.filter(this.tripleFilter(pattern));
  },

  // Performs the specified HTTP or file request
  request: function (options, errorCallback) {
    var stream;
    // Fetch a representation through HTTP
    if (/^https?:\/\//.test(options.url)) {
      stream = request(options);
      stream.on('response', function (response) {
        if (response.statusCode >= 300)
          setImmediate(function () {
            stream.emit('error', new Error(response.request.href + ' returned ' + response.statusCode));
          });
      });
    }
    // Read a file from the local filesystem
    else {
      stream = fs.createReadStream(options.url.replace(/^file:\/\//, ''), { encoding: 'utf8' });
    }
    // Always attach _some_ error handler (errorCallback might be detached later)
    stream.once('error', _.noop);
    errorCallback && stream.once('error', errorCallback);
    return stream;
  },
};

// Makes Datasource the base class of the given class
Datasource.extend = function (ChildClass) {
  var origPrototype = ChildClass.prototype;
  ChildClass.prototype = new Datasource();
  _.extend(ChildClass.prototype, origPrototype);
};

module.exports = Datasource;