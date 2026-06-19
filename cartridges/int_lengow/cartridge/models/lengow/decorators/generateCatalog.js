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
    // Try Collection.toArray() + manual copy to JS Array
    // In CM 22.7, toArray() returns Java Object[] which lacks JS Array methods like .indexOf/.filter,
    // so we manually copy into a JS Array to ensure full compatibility.
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
