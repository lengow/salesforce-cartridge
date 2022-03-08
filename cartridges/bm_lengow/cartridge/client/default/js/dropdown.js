'use strict';

/**
 * Initializing Lengow Drop Down Events
 */
function initializeDropDownEvents() {
    $('.selected-locale-dropdown, .locale-selection-items').hover(function () {
        var localeSelection = $('.locale-selection-items');
        if (!localeSelection.hasClass('visible')) {
            localeSelection.addClass('visible');
        }
    }, function () {
        var localeSelection = $('.locale-selection-items');
        if (localeSelection.hasClass('visible')) {
            localeSelection.removeClass('visible');
        }
    });

    jQuery('.locale-selection-items li').on('click', function (e) {
        e.preventDefault();
        var ele = jQuery(this)[0];
        var localeID = jQuery(this).find('input')[0].value;
        var checked = !ele.classList.contains('selected');
        var localeSelection = document.getElementsByClassName('locale-selection-items')[0];
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
            $('body').trigger('initialize:dropdown');
        });
    });
}

/**
 * Bind reinitialize event on body
 */
function reInitializeDropDownEvents() {
    $('body').on('initialize:dropdown', function () {
        initializeDropDownEvents();
    });
}

jQuery(document).ready(function () {
    initializeDropDownEvents();
    reInitializeDropDownEvents();
});
