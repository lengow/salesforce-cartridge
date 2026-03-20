'use strict';

/**
 * Initializing Lengow Drop Down Events
 */
function initializeDropDownEvents() {
    var $dropdown = jQuery('.selected-locale-dropdown, .locale-selection-items');
    if (!$dropdown || !$dropdown.length) {
        return;
    }

    $dropdown.hover(function () {
        var localeSelection = jQuery('.locale-selection-items');
        if (!localeSelection.hasClass('visible')) {
            localeSelection.addClass('visible');
        }
    }, function () {
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

        jQuery.ajax({
            type: 'POST',
            url: url,
            data: {
                localeID: localeID,
                checked: checked
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

jQuery(document).ready(function () {
    initializeDropDownEvents();
    reInitializeDropDownEvents();
});
