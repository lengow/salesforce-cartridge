'use strict';

var Transaction = require('dw/system/Transaction');
var Locale = require('dw/util/Locale');
var currency = require('dw/util/Currency');

/**
 * This Function is responsible for set currency Code
 * @param {string} localeID - locale ID
 */
function setCurrencyCode(localeID) {
    var countries = require('*/cartridge/config/countries');
    var currentLocale = Locale.getLocale(localeID);

    var currentCountry = !currentLocale
        ? countries[0]
        : countries.filter(function (country) {
            return country.id === currentLocale.ID;
        })[0];
    Transaction.wrap(function () {
        session.setCurrency(currency.getCurrency(currentCountry.currencyCode)); // eslint-disable-line
    });
}

module.exports = function (object) {
    Object.defineProperties(object, {
        setCurrencyCode: {
            enumerable: true,
            value: function () {
                return setCurrencyCode.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
};
