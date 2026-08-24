'use strict';

var jQuery = require('jquery');

/**
 * Initializing Lengow Drop Down Events
 */
function initializeDropDownEvents() {
    var $dropdown = jQuery('.selected-locale-dropdown, .locale-selection-items');
    if (!$dropdown || !$dropdown.length) {
        return;
    }

    // mouseenter/mouseleave rather than .hover(): .hover() was removed in jQuery 4,
    // and this bundle should survive a future jQuery bump.
    $dropdown.on('mouseenter', function () {
        var localeSelection = jQuery('.locale-selection-items');
        if (!localeSelection.hasClass('visible')) {
            localeSelection.addClass('visible');
        }
    });
    $dropdown.on('mouseleave', function () {
        var localeSelection = jQuery('.locale-selection-items');
        if (localeSelection.hasClass('visible')) {
            localeSelection.removeClass('visible');
        }
    });

    jQuery('.locale-selection-items li').on('click', function (e) {
        e.preventDefault();
        var ele = jQuery(this)[0];
        var $input = jQuery(this).find('input');
        if (!ele || !$input.length) return;
        var localeID = $input[0].value;
        var checked = !ele.classList.contains('selected');
        var localeSelection = document.getElementsByClassName('locale-selection-items')[0];
        if (!localeSelection) return;
        var url = localeSelection.dataset.url;
        var token = localeSelection.dataset.csrf || '';

        jQuery.ajax({
            type: 'POST',
            url: url,
            data: {
                localeID: localeID,
                checked: checked,
                csrf_token: token
            }
        })
        .done(function (response) {
            jQuery('.lengow-dropdown').html(response);
            jQuery('body').trigger('initialize:dropdown');
        });
    });
}

/**
 * Bind reinitialize event on body
 */
function reInitializeDropDownEvents() {
    jQuery('body').on('initialize:dropdown', function () {
        initializeDropDownEvents();
    });
}

module.exports = function init() {
    initializeDropDownEvents();
    reInitializeDropDownEvents();
};
