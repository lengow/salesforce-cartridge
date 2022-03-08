'use strict';

/**
 * Get Inventory Status of currenct API Product
 * @param {dw.catalog.Product} product - sfcc api product
 * @returns {string} inventory status
 */
function getInventoryStatus(product) {
    var status = 'NOT_AVAILABLE';
    if (product.availabilityModel) {
        status = product.availabilityModel.availabilityStatus;
    }

    return status;
}

/**
 * Get Inventory Level of currenct API Product
 * @param {dw.catalog.Product} product - sfcc api product
 * @returns {number} inventory level
 */
function getInventoryLevel(product) {
    var availabilityModel = product.availabilityModel;
    if (availabilityModel && availabilityModel.getInventoryRecord()) {
        return availabilityModel.getInventoryRecord().ATS.value;
    }

    return 0;
}

module.exports = {
    getInventoryStatus: getInventoryStatus,
    getInventoryLevel: getInventoryLevel
};
