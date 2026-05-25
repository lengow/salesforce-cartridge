'use strict';

var Site = require('dw/system/Site');

/**
 * @description Converts a Collection, Set, Java array or other iterable to a plain Array.
 * Compatible with Compatibility Mode 21.7 and 22.7+ (GraalJS).
 * IMPORTANT: In CM 22.7, Java Collection.toArray() returns a Java Object[] which does NOT
 * have JS Array methods (.filter, .indexOf, .push etc). We must ensure we always return
 * a proper JavaScript Array.
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
    // Try Java Iterator FIRST - works for all Java Collections in both CM 21.7 and 22.7
    // and always produces a proper JS Array
    try {
        if (typeof value.iterator === 'function') {
            var iter = value.iterator();
            var items = [];
            while (iter.hasNext()) {
                items.push(iter.next());
            }
            return items;
        }
    } catch (e) {
        // fallthrough
    }
    // Try Collection.toArray() + manual conversion to JS Array
    // Must come before Array.from() — Array.from({toArray:fn}) returns [] without error,
    // swallowing the result. In CM 22.7, toArray() returns Java Object[], so we manually
    // copy into a JS Array to ensure .filter/.indexOf etc. are available.
    try {
        if (typeof value.toArray === 'function') {
            var javaArr = value.toArray();
            var arr = [];
            for (var i = 0; i < javaArr.length; i++) {
                arr.push(javaArr[i]);
            }
            return arr;
        }
    } catch (e) {
        // fallthrough
    }
    // Try Array.from() - handles native JS Sets (CM 22.7+ getAllowedLocales) and Java arrays
    try {
        if (typeof Array.from === 'function') {
            return Array.from(value);
        }
    } catch (e) {
        // fallthrough
    }
    // Try forEach - handles JS Sets and some Java Collections
    try {
        if (typeof value.forEach === 'function') {
            var forEachResult = [];
            value.forEach(function (item) {
                forEachResult.push(item);
            });
            return forEachResult;
        }
    } catch (e) {
        // fallthrough
    }
    // Fallback: manual iteration for array-like objects with .length
    try {
        var len = value.length;
        if (typeof len === 'number') {
            var result = [];
            for (var j = 0; j < len; j++) {
                result.push(value[j]);
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
