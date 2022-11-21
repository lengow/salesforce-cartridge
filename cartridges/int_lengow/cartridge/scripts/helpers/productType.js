'use strict';

/**
 * Get product Type
 * @param {dw.catalog.Product} product - sfcc api product
 * @returns {string} product type
 */
function getProductType(product) {
    var productType;
    if (product.master) {
        productType = 'master';
    } else if (product.variant) {
        productType = 'variant';
    } else if (product.variationGroup) {
        productType = 'variationGroup';
    } else if (product.bundle) {
        productType = 'product bundle';
    } else if (product.productSet) {
        productType = 'product set';
    } else {
        productType = 'standard';
    }
    return productType;
}

module.exports = {
    getProductType: getProductType
};
