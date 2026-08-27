'use strict';

var Transaction = require('dw/system/Transaction');
var Locale = require('dw/util/Locale');
var currency = require('dw/util/Currency');

/**
 * Sets the session currency for the locale being exported.
 *
 * Note on what "failure" means here: the `currencyCode` column of the CSV is filled from
 * `session.currency.currencyCode`, so the file always stays internally consistent — prices
 * and currency code match. The real hazard is silence: when this function gives up, the
 * session keeps the PREVIOUS locale's currency and the file for locale X quietly ships
 * with currency Y. Nothing in the Business Manager says so.
 *
 * Behaviour is deliberately unchanged (the locale is still exported, as in every prior
 * version of the cartridge) — the failure is now logged instead of swallowed.
 *
 * @param {string} localeID - locale ID
 * @returns {boolean} true if the session currency now matches the locale, false otherwise
 */
function setCurrencyCode(localeID) {
    var logger = this && this.logger;
    var countries = require('*/cartridge/config/countries');
    var currentLocale = Locale.getLocale(localeID);

    var currentCountry = !currentLocale
        ? countries[0]
        : countries.filter(function (country) {
            return country.id === currentLocale.ID;
        })[0];

    if (!currentCountry) {
        if (logger) {
            logger.warn('---Locale {0} has no currency mapping in config/countries.json. '
                + 'The export continues with the currency currently on the session, which may belong '
                + 'to another locale. Add an entry {"id":"{0}","currencyCode":"XXX"} to fix this.---', localeID);
        }
        return false;
    }

    try {
        Transaction.wrap(function () {
            session.setCurrency(currency.getCurrency(currentCountry.currencyCode)); // eslint-disable-line
        });
        return true;
    } catch (e) {
        if (logger) {
            logger.warn('---Cannot set currency {0} for locale {1}: {2}. Most likely that currency is not '
                + 'in the site Allowed Currencies. The export continues with the currency currently on the '
                + 'session, which may belong to another locale.---',
                currentCountry.currencyCode, localeID, (e.message || e.toString()));
        }
        return false;
    }
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
