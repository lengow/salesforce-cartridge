'use strict';

var Logger = require('dw/system/Logger');
/**
 * Returns Lengow-e Logger
 * @param {string} category - The name of Lengow-e log category
 * @returns {Object} - Lengow-e Logger
 */
function getLogger(category) {
    if (!category) {
        category = 'LENGOW'; // eslint-disable-line no-param-reassign
    }

    var lengowLogger = Logger.getLogger('LENGOW', category);
    return {
        info: function () { lengowLogger.info.apply(lengowLogger, arguments); },
        debug: function () { lengowLogger.debug.apply(lengowLogger, arguments); },
        warn: function () { lengowLogger.warn.apply(lengowLogger, arguments); },
        error: function () { lengowLogger.error.apply(lengowLogger, arguments); },
        fatal: function () { lengowLogger.fatal.apply(lengowLogger, arguments); },
        message: function (error) {
            return Object.keys(error).map(function (el) {
                return el + ': ' + error[el];
            }).join('\n');
        }
    };
}

module.exports = {
    getLogger: getLogger
};
