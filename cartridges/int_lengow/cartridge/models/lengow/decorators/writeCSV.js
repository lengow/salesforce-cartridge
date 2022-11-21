'use strict';

var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
var inventory = require('*/cartridge/scripts/helpers/inventory');

/**
 * Writes products to CSV
 * @param {dw.io.FileWriter} fileWriter - file writer
 * @param {dw.io.CSVStreamWriter} csvStreamWriter - StreamWriter
 */
function writeCSV(fileWriter, csvStreamWriter) {
    if (this.config.header && this.config.header.length > 0) {
        csvStreamWriter.writeNext(this.config.header);
    } else {
        this.logger.error('>>>Cannot have header attrubutes {0}!<<<', this.config.catalogId);
        return;
    }
    fileWriter.flush();

    // write products
    var productsIterator;
    if (!this.config.catalogId) {
        productsIterator = ProductMgr.queryAllSiteProducts();
    } else {
        var catalog = CatalogMgr.getCatalog(this.config.catalogId);
        if (!catalog) {
            this.logger.error('>>>Cannot find catalog {0}!<<<', this.config.catalogId);
            return;
        }
        productsIterator = ProductMgr.queryProductsInCatalog(catalog);
    }

    if (!productsIterator || productsIterator.count === 0) {
        this.logger.info('---No products found in catalog {0}!---', this.config.catalogId);
        return;
    }
    if (!this.config.catalogId) {
        this.logger.info('---Found {0} total products in all catalogs of this site', productsIterator.count);
    } else {
        this.logger.info('---Found {0} total products in catalog {1}---', productsIterator.count, this.config.catalogId);
    }

    var product;
    var csvLine;
    var customField = require('*/cartridge/models/lengow/customField');
    while (productsIterator.hasNext()) {
        try {
            product = productsIterator.next();

            if ((this.config.onlineOnly && !product.isOnline()) || (this.config.skipMaster && product.isMaster()) || (this.config.availableOnly && inventory.getInventoryLevel(product) < 1)) {
                continue; // eslint-disable-line no-continue
            }

            // add product to CSV
            csvLine = [];
            this.config.headerObject.forEach(function (attrObject) { // eslint-disable-line no-loop-func
                csvLine.push(customField(product, attrObject));
            });

            csvStreamWriter.writeNext(csvLine);

            fileWriter.flush();
        } catch (e) {
            this.logger.error('>>>Cannot export product {0}. Error:\n{1}<<<', (product && product.ID), this.logger.message(e));
        }
    }

    fileWriter.flush();
    productsIterator.close();
}

module.exports = function (object) {
    Object.defineProperties(object, {
        writeCSV: {
            enumerable: true,
            value: function () {
                return writeCSV.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
};
