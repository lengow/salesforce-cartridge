'use strict';

var Site = require('dw/system/Site');

/**
 * @description Converts locales from Site API to array format - compatible with both Compatibility Mode 21.7 and 22.7+
 * In 21.7: getAllowedLocales() returns Collection with toArray() method
 * In 22.7+: getAllowedLocales() returns native JavaScript Set
 * @param {(Object|Set)} locales - Collection or Set of locales
 * @returns {Array} Array of locale strings
 */
function convertLocalesToArray(locales) {
    // For Compatibility Mode 21.7: Collection with toArray() method
    if (locales && typeof locales.toArray === 'function') {
        return locales.toArray();
    }
    // For Compatibility Mode 22.7+: Native JavaScript Set
    // Use forEach to manually build array (works in ES5)
    if (locales && typeof locales.forEach === 'function') {
        var result = [];
        locales.forEach(function (locale) {
            result.push(locale);
        });
        return result;
    }
    // Fallback: if already an array or array-like
    if (locales && locales.length !== undefined) {
        var arr = [];
        for (var i = 0; i < locales.length; i++) {
            arr.push(locales[i]);
        }
        return arr;
    }
    return [];
}

/**
 * Generates CSV Catalog Feed according to the configuration in geCatalogFeedConfig Site Preference
 */
function generateCatalog() {
    var _this = this; // eslint-disable-line no-underscore-dangle
    var logger = _this.logger;
    var allowedLocales = convertLocalesToArray(Site.getCurrent().getAllowedLocales());
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
