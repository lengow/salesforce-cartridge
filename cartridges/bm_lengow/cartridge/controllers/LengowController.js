'use strict';

var ISML = require('dw/template/ISML');
var Site = require('dw/system/Site');
var currentSite = Site.getCurrent();
var URLUtils = require('dw/web/URLUtils');
var StringUtils = require('dw/util/StringUtils');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var valueTypeNameMapping = {
    string: 'String',
    text: 'Text',
    html: 'HTML',
    int: 'Integer',
    double: 'Number',
    boolean: 'Boolean',
    date: 'Date',
    datetime: 'Date+Time',
    image: 'Image',
    email: 'Email',
    password: 'Password',
    set_of_string: 'Set of Strings',
    set_of_int: 'Set of Integers',
    set_of_double: 'Set of Numbers',
    enum_of_string: 'Enum of Strings',
    enum_of_int: 'Enum of Integers',
    quantity: 'Quantity'
};

/**
 * @description parse json object without throwing error. In case invalid JSON String returns null
 * @param {string} str JSON string
 * @returns {(Object|Null)} Parsed JSON object or null in case of the exception during parsing
 */
function parseJSON(str) {
    var response;
    try {
        if (!empty(str)) { // eslint-disable-line no-undef
            response = JSON.parse(str);
        } else {
            response = {
                system: [],
                custom: []
            };
        }
    } catch (e) {
        response = null;
    }
    return response;
}

/**
 * @description Converts a Collection, Set, Java array or other iterable to a plain Array.
 * Compatible with Compatibility Mode 21.7 and 22.7+ (GraalJS).
 * IMPORTANT: In CM 22.7, Java Collection.toArray() returns a Java Object[] which does NOT
 * have JS Array methods (.filter, .indexOf, .push etc). We must ensure we always return
 * a proper JavaScript Array.
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
    // Try Collection.toArray() + manual conversion to JS Array
    // Must come before Array.from() — Array.from({toArray:fn}) returns [] without error,
    // swallowing the result. In CM 22.7, toArray() returns Java Object[], so we manually
    // copy into a JS Array to ensure .filter/.indexOf etc. are available.
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
 * In 21.7: getAllowedLocales() returns a Collection with toArray() method
 * In 22.7+: getAllowedLocales() returns a native JavaScript Set
 * @returns {Array} Array of locale strings
 */
function getAllowedLocalesArray() {
    return toArray(Site.getCurrent().getAllowedLocales());
}

/**
 * @description This function get the attribute ids present in the site preference passed
 * @param {string} attributeName Attribute Name
 * @returns {Array} array of attributes present in the site preference
 */
function getAttributes(attributeName) {
    var attributeJson = parseJSON(currentSite.getCustomPreferenceValue(attributeName));
    var attributeArray = [];

    if (attributeJson) {
        attributeJson.system.forEach(function (element) {
            attributeArray.push(element.id);
        });
        attributeJson.custom.forEach(function (element) {
            attributeArray.push(element.id);
        });
    }
    return attributeArray;
}

/**
 * @description Get a site preference value, trying the standard name first, then falling back to the prefixed name.
 * This handles the discrepancy between metadata naming conventions (e.g. 'ocapiClientId' vs 'lengowOcapiClientId').
 * @param {string} name The standard attribute name (without 'lengow' prefix)
 * @returns {string|null} The preference value
 */
function getOcapiPreference(name) {
    var value;
    try {
        value = currentSite.getCustomPreferenceValue(name);
    } catch (e) {
        value = null;
    }
    if (empty(value)) { // eslint-disable-line no-undef
        // Fallback: try with 'lengow' prefix (capitalize first letter of name)
        var prefixedName = 'lengow' + name.charAt(0).toUpperCase() + name.slice(1);
        try {
            value = currentSite.getCustomPreferenceValue(prefixedName);
        } catch (e2) {
            value = null;
        }
    }
    return value;
}

/**
 * @description Get the OAuth token for Client Credentials Grant
 * @returns {(Object|string)} Auth Token or object based on service response
 */
function getOCAPIOAuth2Token() {
    var tokenResponse;
    var ocapiClientId = getOcapiPreference('ocapiClientId');
    var ocapiClientPassword = getOcapiPreference('ocapiClientPassword');
    if (empty(ocapiClientId) || empty(ocapiClientPassword)) { // eslint-disable-line no-undef
        return {
            error: true,
            message: Resource.msg('lengow.ocapi.params.missing', 'lengow', null)
        };
    }
    var createRequest = function (ocapiService, _args) { // eslint-disable-line no-unused-vars
        var base64Credentials = StringUtils.encodeBase64(ocapiClientId + ':' + ocapiClientPassword);
        var url = StringUtils.format(ocapiService.URL, ocapiClientId);
        ocapiService.URL = url;
        ocapiService.addHeader('Content-Type', 'application/x-www-form-urlencoded');
        ocapiService.addHeader('Authorization', 'Basic ' + base64Credentials);
        ocapiService.setRequestMethod('POST');

        return ocapiService;
    };

    var parseResponse = function (_service, args) {
        return args.text;
    };

    var filterLogMessage = function (message) {
        return message;
    };

    var serviceCallback = {
        createRequest: createRequest,
        parseResponse: parseResponse,
        filterLogMessage: filterLogMessage
    };

    var service = LocalServiceRegistry.createService('LengowOAuthService', serviceCallback);
    var response = service.call();
    var responseObj = JSON.parse(response.object);
    if (responseObj) {
        tokenResponse = responseObj.access_token;
    } else {
        tokenResponse = {
            error: true,
            message: JSON.parse(response.errorMessage).error_description
        };
    }
    return tokenResponse;
}

/**
 * @description This function get the system object definitions for the OCAPI service passed
 * @param {string} serviceName Service Name
 * @returns {(Object|Null)} returns the response of OCAPI service called
 */
function callSystemObjectDefinitions(serviceName) {
    var authToken = getOCAPIOAuth2Token();
    var response;
    var createRequest = function (ocapiService, _args) { // eslint-disable-line no-unused-vars
        var host = currentSite.httpsHostName;
        var url = StringUtils.format(ocapiService.URL, host, 'Product');
        ocapiService.URL = url;
        ocapiService.addHeader('Content-Type', 'application/json');
        ocapiService.addHeader('Authorization', 'Bearer ' + authToken);
        ocapiService.setRequestMethod('GET');
        return ocapiService;
    };

    var parseResponse = function (_service, args) {
        return args.text;
    };

    var filterLogMessage = function (message) {
        return message;
    };

    var serviceCallback = {
        createRequest: createRequest,
        parseResponse: parseResponse,
        filterLogMessage: filterLogMessage
    };

    if (authToken && !authToken.error) {
        var service = LocalServiceRegistry.createService(serviceName, serviceCallback);
        response = service.call();
    } else {
        response = {
            error: true,
            message: authToken.message
        };
    }
    return response;
}

/**
 * @description This function get the system object definitions for the Product table with certain useful attributes
 * Uses the native SFCC SystemObjectMgr API — no OCAPI or OAuth required.
 * @returns {(Object|Null)} returns the attributes of product table in the required format
 */
function getProductSystemObjectDefinitions() {
    var cache = require('dw/system/CacheMgr').getCache('SystemObjectDefinitions');
    var pSystemObjectDefinitions = cache.get('productSystemObjectDefinitions', function loadProductSystemObjectDefinitions() {
        var SystemObjectMgr = require('dw/object/SystemObjectMgr');
        var ObjectAttributeDefinition = require('dw/object/ObjectAttributeDefinition');

        var valueTypeCodeMapping = {};
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_INT] = 'int';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_NUMBER] = 'double';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_STRING] = 'string';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_TEXT] = 'text';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_HTML] = 'html';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_DATE] = 'date';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_IMAGE] = 'image';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_BOOLEAN] = 'boolean';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_QUANTITY] = 'quantity';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_DATETIME] = 'datetime';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_EMAIL] = 'email';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_PASSWORD] = 'password';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_SET_OF_INT] = 'set_of_int';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_SET_OF_NUMBER] = 'set_of_double';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_SET_OF_STRING] = 'set_of_string';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_INT] = 'enum_of_int';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_STRING] = 'enum_of_string';

        try {
            var typeDefinition = SystemObjectMgr.describe('Product');
            var attributeDefs = toArray(typeDefinition.getAttributeDefinitions());
            var output = [];
            attributeDefs.forEach(function (attrDef) {
                var attrId = attrDef.getID();
                if (attrId !== 'image' && attrId !== 'thumbnail') {
                    var valueType = valueTypeCodeMapping[attrDef.getValueTypeCode()] || 'string';
                    output.push({
                        id: attrId,
                        display_name: attrDef.getDisplayName(),
                        system: attrDef.isSystem(),
                        value_type: valueType,
                        valueTypeName: valueTypeNameMapping[valueType] || valueType
                    });
                }
            });
            return {
                success: true,
                attributes: output
            };
        } catch (e) {
            return {
                success: false,
                message: e.message || e.toString()
            };
        }
    });
    if (!pSystemObjectDefinitions.success) {
        cache.invalidate('productSystemObjectDefinitions');
    }
    return pSystemObjectDefinitions;
}

/**
 * @description This Endpoint renders the main dasboard page where the merchant can choose mandatory and additional attributes
 */
function manage() {
    try {
        var productSystemObjectDefinitions = getProductSystemObjectDefinitions();
        var lengowMandatoryAttributesArray = getAttributes('lengowMandatoryAttributes');
        var lengowAdditionalAttributesArray = getAttributes('lengowAdditionalAttributes');
        var allowedLocales = getAllowedLocalesArray();
        var selectedLocales = toArray(currentSite.getCustomPreferenceValue('lengowSeletedLocales'));
        // Should Be Valid Locales
        selectedLocales = selectedLocales.filter(function (localeID) {
            return allowedLocales.indexOf(localeID) >= 0;
        });

        var impexUrl = StringUtils.format('https://{0}/on/demandware.servlet/webdav/Sites/Impex', currentSite.httpsHostName);
        var jobURL = URLUtils.url('ViewApplication-BM', 'SelectedMenuItem', 'operations', 'CurrentMenuItemId', 'operations', 'screen', 'job', 'menuactionid', 'jobschedules').toString();

        ISML.renderTemplate('lengow/lengowMainDashboard', {
            success: productSystemObjectDefinitions.success,
            errorMessage: productSystemObjectDefinitions.success ? '' : productSystemObjectDefinitions.message,
            productSystemObjectDefinitions: productSystemObjectDefinitions,
            lengowMandatoryAttributesArray: lengowMandatoryAttributesArray,
            lengowAdditionalAttributesArray: lengowAdditionalAttributesArray,
            allowedLocales: allowedLocales,
            selectedLocales: selectedLocales,
            impexUrl: impexUrl,
            jobURL: jobURL
        });
    } catch (e) {
        ISML.renderTemplate('lengow/lengowMainDashboard', {
            success: false,
            errorMessage: Resource.msg('api.error.occured', 'lengow', null) + ' (' + (e.message || e.toString()) + ')',
            productSystemObjectDefinitions: { success: false, attributes: [] },
            lengowMandatoryAttributesArray: [],
            lengowAdditionalAttributesArray: [],
            allowedLocales: [],
            selectedLocales: [],
            impexUrl: '',
            jobURL: ''
        });
    }
}

/**
 * @description This Endpoint saves the selected attributes and renders the inner section of main dasboard page
 */
function submit() {
    var params = request.httpParameterMap;// eslint-disable-line no-undef
    if (params.type.stringValue !== 'reset') {
        Transaction.wrap(function () {
            if (params.type.stringValue === 'mandatory') {
                currentSite.preferences.custom.lengowMandatoryAttributes = params.attributesJSON.stringValue;
            } else {
                currentSite.preferences.custom.lengowAdditionalAttributes = params.attributesJSON.stringValue;
            }
        });
    }

    var productSystemObjectDefinitions = getProductSystemObjectDefinitions();
    var lengowMandatoryAttributesArray = getAttributes('lengowMandatoryAttributes');
    var lengowAdditionalAttributesArray = getAttributes('lengowAdditionalAttributes');
    var allowedLocales = getAllowedLocalesArray();
    var selectedLocales = toArray(currentSite.getCustomPreferenceValue('lengowSeletedLocales'));
    // Should Be Valid Locales
    selectedLocales = selectedLocales.filter(function (localeID) {
        return allowedLocales.indexOf(localeID) >= 0;
    });

    var impexUrl = StringUtils.format('https://{0}/on/demandware.servlet/webdav/Sites/Impex', currentSite.httpsHostName);
    var jobURL = URLUtils.url('ViewApplication-BM', 'SelectedMenuItem', 'operations', 'CurrentMenuItemId', 'operations', 'screen', 'job', 'menuactionid', 'jobschedules').toString();

    ISML.renderTemplate('lengow/lengowContent', {
        success: productSystemObjectDefinitions.success,
        errorMessage: productSystemObjectDefinitions.success ? '' : productSystemObjectDefinitions.message,
        productSystemObjectDefinitions: productSystemObjectDefinitions,
        lengowMandatoryAttributesArray: lengowMandatoryAttributesArray,
        lengowAdditionalAttributesArray: lengowAdditionalAttributesArray,
        allowedLocales: allowedLocales,
        selectedLocales: selectedLocales,
        impexUrl: impexUrl,
        jobURL: jobURL
    });
}

/**
 * @description This Endpoint add or remove locale
 */
function updateLocale() {
    var params = request.httpParameterMap; // eslint-disable-line no-undef
    var localeID = params.localeID.value;
    var checked = params.checked.value === 'true';
    var allowedLocales = getAllowedLocalesArray();
    var selectedLocales = toArray(currentSite.getCustomPreferenceValue('lengowSeletedLocales'));

    selectedLocales = selectedLocales.filter(function (item) {
        return allowedLocales.indexOf(item) >= 0;
    });

    if (allowedLocales.indexOf(localeID) >= 0) {
        if (checked && selectedLocales.indexOf(localeID) === -1) {
            selectedLocales.push(localeID);
        } else if (!checked && selectedLocales.indexOf(localeID) >= 0) {
            selectedLocales = selectedLocales.filter(function (item) {
                return item !== localeID;
            });
        }
    }

    Transaction.wrap(function () {
        currentSite.preferences.custom.lengowSeletedLocales = selectedLocales;
    });

    ISML.renderTemplate('lengow/tabs/localedropdown', {
        allowedLocales: allowedLocales,
        selectedLocales: selectedLocales,
        isAjax: true
    });
}

module.exports.Manage = manage;
module.exports.Manage.public = true;

module.exports.Submit = submit;
module.exports.Submit.public = true;

module.exports.UpdateLocale = updateLocale;
module.exports.UpdateLocale.public = true;
