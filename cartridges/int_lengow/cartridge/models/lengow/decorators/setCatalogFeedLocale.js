/* globals request */
'use strict';

/**
 * Sets Catalog Feed Config locale
 * @param {string} localeID - locale ID
 */
function setCatalogFeedLocale(localeID) {
    if (!empty(localeID)) { // eslint-disable-line no-undef
        request.setLocale(localeID);
    }
}

module.exports = function (object) {
    Object.defineProperties(object, {
        setCatalogFeedLocale: {
            enumerable: true,
            value: function () {
                return setCatalogFeedLocale.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
};
