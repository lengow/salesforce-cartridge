'use strict';

var Site = require('dw/system/Site');

/**
 * @description Converts a Collection, Set, Java array or other iterable to a plain Array.
 * Compatible with Compatibility Mode 21.7 (Collection with toArray()), 22.7+ (native Set or Java arrays).
 * In CM 22.7, some APIs like getAllowedLocales() return Java String arrays ([Ljava.lang.String;).
 * Accessing non-existent properties on Java objects in GraalJS throws errors instead of returning undefined,
 * so all property accesses are wrapped in try-catch.
 * @param {(Set|Collection|Array|Object)} value The value to convert
 * @returns {Array} Plain JavaScript Array
 */
function toArray(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    // Compatibility Mode 21.7 - Collection with toArray()
    try {
        if (typeof value.toArray === 'function') {
            return value.toArray();
        }
    } catch (e) {
        // Accessing .toArray on Java objects might throw
    }
    // Compatibility Mode 22.7+ - native Set, Java arrays, or other iterables
    try {
        if (typeof Array.from === 'function') {
            return Array.from(value);
        }
    } catch (e) {
        // fallthrough
    }
    // Fallback: manual iteration for array-like objects with .length
    try {
        var len = value.length;
        if (typeof len === 'number') {
            var result = [];
            for (var i = 0; i < len; i++) {
                result.push(value[i]);
            }
            return result;
        }
    } catch (e) {
        // fallthrough
    }
    return [];
}

/**
 * @description Converts allowed locales to an array, compatible with both Compatibility Mode 21.7 and 22.7+
 * @returns {Array} Array of locale strings
 */
function getAllowedLocalesArray() {
    return toArray(Site.getCurrent().getAllowedLocales());
}

/**
 * Generates CSV Catalog Feed according to the configuration in geCatalogFeedConfig Site Preference
 */
function generateCatalog() {
    var _this = this; // eslint-disable-line no-underscore-dangle
    var logger = _this.logger;
    var allowedLocales = getAllowedLocalesArray();
    var lengowSeletedLocales = toArray(Site.getCurrent().getCustomPreferenceValue('lengowSeletedLocales'));

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
