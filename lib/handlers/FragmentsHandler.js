/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A FragmentsHandler responds to requests for fragments */

var url = require('url'),
    negotiate = require('negotiate'),
    _ = require('lodash'),
    N3Util = require('n3').Util,
    Util = require('../Util');

// Creates a new FragmentsHandler
function FragmentsHandler(options) {
  options = options || {};
  this._routers = options.routers || [];
  this._prefixes = options.prefixes || {};
  this._datasources = options.datasources || {};

  // Prepare writers and their MIME types
  var writers = this._writers = [];
  for (var mimeTypes in options.writers) {
    // The object value is a writer, the key is a list of MIME types
    var writer = options.writers[mimeTypes];
    mimeTypes = mimeTypes.split(/[,;]/);
    // Create a settings object for each writer
    mimeTypes.forEach(function (mimeType, index) {
      var isUniversalType = mimeType === '*/*',
          specificType = isUniversalType ? (mimeTypes[index ? 0 : 1] || 'text/plain') : mimeType,
          isTextualType = /^text\/|\/(?:json|xml)$/.test(specificType);
      writers.push({
        writer: writer,
        type: mimeType, // for content negotiation
        mimeType: isTextualType ? specificType + ';charset=utf-8' : specificType, // for response
        quality: isUniversalType ? 1.0 : 0.8,
      });
    });
  }
}

// Try to serve the requested fragment
FragmentsHandler.prototype.handleRequest = function (request, response) {
  // Create the query from the request by calling the fragment routers
  var requestParams = { url: request.parsedUrl },
      query = this._routers.reduce(function (query, router) {
    try { router.extractQueryParams(requestParams, query); }
    catch (e) { /* ignore routing errors */ }
    return query;
  }, { features: [] });

  // Execute the query on the data source
  var datasourceSettings = query.features.datasource && this._datasources[query.datasource];
  delete query.features.datasource;
  if (!datasourceSettings || !datasourceSettings.datasource.supportsQuery(query))
    return false;

  // Set up content negotiation
  response.setHeader('Vary', 'Accept');
  var writerSettings = negotiate.choose(this._writers, request)[0];
  if (!writerSettings) {
    response.writeHead(406, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('No suitable content type found.');
    return true;
  }

  // Write the query result
  var self = this, queryResult = datasourceSettings.datasource.select(query, onError),
      metadata = this._createFragmentMetadata(request, query, datasourceSettings);
  response.on('error', onError);
  response.setHeader('Content-Type', writerSettings.mimeType);
  writerSettings.writer.writeFragment(response, queryResult, metadata);
  function onError(error) {
    self && self._sendError(request, response, error, 500, writerSettings.writer), self = null;
  }
  return true;
};

// Creates metadata about the requested fragment
FragmentsHandler.prototype._createFragmentMetadata = function (request, query, datasourceSettings) {
  // TODO: these URLs should be generated by the routers
  var requestUrl = request.parsedUrl,
      paramsNoPage = _.omit(requestUrl.query, 'page'),
      currentPage = parseInt(requestUrl.query.page, 10) || 1,
      datasourceUrl = url.format(_.omit(requestUrl, 'search', 'query')),
      fragmentUrl = url.format(_.defaults({ search: '', query: paramsNoPage }, requestUrl)),
      fragmentPageUrlBase = fragmentUrl + (/\?/.test(fragmentUrl) ? '&' : '?') + 'page=',
      indexUrl = url.format(_.omit(requestUrl, 'search', 'query', 'pathname')) + '/';

  // Generate a textual representation of the pattern
  query.patternString = '{ ' +
    (query.subject              ? '<' + query.subject   + '> ' : '?s ') +
    (query.predicate            ? '<' + query.predicate + '> ' : '?p ') +
    (N3Util.isIRI(query.object) ? '<' + query.object    + '> ' : (query.object || '?o')) + ' }';

  return {
    datasource: _.assign(_.omit(datasourceSettings, 'datasource'), {
      index: indexUrl + '#dataset',
      url: datasourceUrl + '#dataset',
      templateUrl: datasourceUrl + '{?subject,predicate,object}',
    }),
    fragment: {
      url: fragmentUrl,
      pageUrl: url.format(requestUrl),
      firstPageUrl: fragmentPageUrlBase + '1',
      nextPageUrl: fragmentPageUrlBase + (currentPage + 1),
      previousPageUrl: currentPage > 1 ? fragmentPageUrlBase + (currentPage - 1) : null,
    },
    query: query,
    prefixes: this._prefixes,
    datasources: this._datasources,
  };
};

module.exports = FragmentsHandler;