/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let DatasourceRouter = require('../../lib/routers/DatasourceRouter');

describe('DatasourceRouter', function () {
  describe('The DatasourceRouter module', function () {
    it('should be a function', function () {
      DatasourceRouter.should.be.a('function');
    });

    it('should be a DatasourceRouter constructor', function () {
      new DatasourceRouter().should.be.an.instanceof(DatasourceRouter);
    });
  });

  describe('A DatasourceRouter instance', function () {
    let router = new DatasourceRouter();

    describe('extractUrlParams', function () {
      describe('with an existing query', function () {
        [
          [
            'a root URL without trailing slash or query parameters',
            'http://example.org',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a root URL without query parameters',
            'http://example.org/',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a root URL with query parameters',
            'http://example.org/?a=b&c=d',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a URL with word characters without query parameters',
            'http://example.org/mydatasource',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/mydatasource' },
          ],
          [
            'a URL with word characters with query parameters',
            'http://example.org/mydatasource?a=b&c=d',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/mydatasource' },
          ],
          [
            'a URL with word and non-word characters without query parameters',
            'http://example.org/my/data-source',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/my/data-source' },
          ],
          [
            'a URL with word and non-word characters with query parameters',
            'http://example.org/my/data-source?a=b&c=d',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/my/data-source' },
          ],
        ]
        .forEach(function (args) { test.extractQueryParams.apply(router, args); });
      });
    });
  });

  describe('A DatasourceRouter instance with a base URL', function () {
    let router = new DatasourceRouter({
      urlData: { baseURLPath: '/my/base/' },
    });

    describe('extractUrlParams', function () {
      describe('with an existing query', function () {
        [
          [
            'a root URL',
            'http://example.org/my/base/',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a non-root URL',
            'http://example.org/my/base/other/path',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/other/path' },
          ],
        ]
          .forEach(function (args) { test.extractQueryParams.apply(router, args); });
      });
    });
  });
});
