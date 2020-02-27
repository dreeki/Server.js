/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

module.exports = {
  datasources: {
    N3Datasource: require('./lib/datasources/N3Datasource'),
    NQuadsDatasource: require('./lib/datasources/NQuadsDatasource'),
    NTriplesDatasource: require('./lib/datasources/NTriplesDatasource'),
    TrigDatasource: require('./lib/datasources/TrigDatasource'),
    TurtleDatasource: require('./lib/datasources/TurtleDatasource'),
  },
};
