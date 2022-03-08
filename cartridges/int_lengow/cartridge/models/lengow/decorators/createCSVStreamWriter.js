'use strict';

/**
 * Creates CSV stream writer
 * @param {dw.io.FileWriter} fileWriter - file writer
 * @returns {dw.io.CSVStreamWriter} - CSV stream writer
 */
function createCSVStreamWriter(fileWriter) {
    var CSVStreamWriter = require('dw/io/CSVStreamWriter');
    var csvWriter = new CSVStreamWriter(fileWriter);

    return csvWriter;
}

module.exports = function (object) {
    Object.defineProperties(object, {
        createCSVStreamWriter: {
            enumerable: true,
            value: function () {
                return createCSVStreamWriter.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
};
