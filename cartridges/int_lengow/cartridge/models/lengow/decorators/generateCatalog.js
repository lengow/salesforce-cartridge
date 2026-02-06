'use strict';

var Site = require('dw/system/Site');

/**
 * @description Converts allowed locales to an array, compatible with both Compatibility Mode 21.7 and 22.7+
 * In 21.7: getAllowedLocales() returns a Collection with toArray() method
 * In 22.7+: getAllowedLocales() returns a native JavaScript Set
 * @returns {Array} Array of locale strings
 */
function getAllowedLocalesArray() {
    var allowedLocales = Site.getCurrent().getAllowedLocales();
    
    // Check if it's a Set (22.7+) or Collection (21.7)
    if (allowedLocales instanceof Set || (typeof allowedLocales.size !== 'undefined' && typeof allowedLocales.toArray === 'undefined')) {
        // Compatibility Mode 22.7+ - it's a native Set
        return Array.from(allowedLocales);
    }
    
    // Compatibility Mode 21.7 - it's a Collection with toArray() method
    return allowedLocales.toArray();
}

/**
 * Generates CSV Catalog Feed according to the configuration in geCatalogFeedConfig Site Preference
 */
function generateCatalog() {
    var _this = this; // eslint-disable-line no-underscore-dangle
    var logger = _this.logger;
    var allowedLocales = getAllowedLocalesArray();
    var lengowSeletedLocales = Site.getCurrent().getCustomPreferenceValue('lengowSeletedLocales');

    lengowSeletedLocales.forEach(function (localeID) {
        if (allowedLocales.indexOf(localeID) < 0) {
            return;
        }

        _this.setCatalogFeedLocale(localeID);
        _this.setCurrencyCode(localeID);

        logger.info('### Catalog generate has been started ###');
        logger.info('---Given catalog ID which will be exported: {0}---', _this.config.catalogId);

        var csvFile = _this.createCSVFile(localeID);
        var fileWriter = _this.createFileWriter(csvFile);
        var csvStreamWriter = _this.createCSVStreamWriter(fileWriter);

        _this.setCatalogFeedLocale(localeID);
        _this.writeCSV(fileWriter, csvStreamWriter);

        csvStreamWriter.close();
        fileWriter.close();

        logger.info('### Catalog generate has been finished ###');
    });
}

module.exports = function (object) {
    Object.defineProperties(object, {
        generateCatalog: {
            enumerable: true,
            value: function () {
                return generateCatalog.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
    object.generateCatalog();
};
