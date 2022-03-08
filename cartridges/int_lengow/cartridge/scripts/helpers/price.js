'use strict';

/**
 * Get price of currenct API Product
 * @param {dw.catalog.Product} product - sfcc api product
 * @returns {number} price of product
 */
function getPrice(product) {
    var priceModel = product.getPriceModel();
    var price = priceModel.getPrice().valueOrNull;

    return price;
}

module.exports = {
    getPrice: getPrice
};
