'use strict';

/**
 * Initializing Tab Events
 */
function initializeTabEvents() {
    jQuery('.tablinks').on('click', function (e) {
        e.preventDefault();
        // Declare all variables
        var i;
        var tabcontent;
        var tablinks;
        var tabName = jQuery(this).data('tabName');

        // Get all elements with class='tabcontent' and hide them
        tabcontent = document.getElementsByClassName('tabcontent');
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = 'none';
        }

        // Get all elements with class='tablinks' and remove the class 'active'
        tablinks = document.getElementsByClassName('tablinks');
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(' active', '');
        }

        jQuery('.reset-input-box').trigger('click');
        // Show the current tab, and add an 'active' class to the button that opened the tab
        document.getElementById(tabName).style.display = 'block';
        e.currentTarget.className += ' active';
    });

    jQuery('.submit-attributes').on('click', function (e) {
        $('body').addClass('loading');
        e.preventDefault();
        var url = jQuery(this).attr('data-link');
        var type = jQuery(this).attr('data-type');
        var finalJSON = {};
        var systemAttrs = [];
        var custonAttrs = [];

        var checkedBoxes = $(
            '#' + type + ' input[name="SelectedAttributeDefinitionID"]:checked'
        );
        for (var i = 0; i < checkedBoxes.length; i++) {
            var checkedBox = checkedBoxes[i];
            if (
                type === 'mandatory' ||
                (type === 'additional' && checkedBox.dataset.mandatory === 'false')
            ) {
                if (checkedBox.dataset.system === 'true') {
                    systemAttrs.push({
                        id: checkedBox.dataset.value,
                        value_type: checkedBox.dataset.valuetype
                    });
                } else {
                    custonAttrs.push({
                        id: checkedBox.dataset.value,
                        value_type: checkedBox.dataset.valuetype
                    });
                }
            }
        }
        finalJSON.system = systemAttrs;
        finalJSON.custom = custonAttrs;

        jQuery
            .ajax({
                type: 'POST',
                url: url,
                data: {
                    type: type,
                    attributesJSON: JSON.stringify(finalJSON)
                }
            })
            .done(function (response) {
                jQuery('#dashboard-container').html(response);
                initializeTabEvents();
                $('body').trigger('initialize:dropdown');
                jQuery('.tablinks.tab-' + type).click();
                $('body').removeClass('loading');
            });
    });

    jQuery('.reset-attributes').on('click', function (e) {
        $('body').addClass('loading');
        e.preventDefault();
        var url = jQuery(this).attr('data-link');
        var type = jQuery(this).attr('data-type');

        jQuery
            .ajax({
                type: 'POST',
                url: url,
                data: {
                    type: 'reset'
                }
            })
            .done(function (response) {
                jQuery('#dashboard-container').html(response);
                initializeTabEvents();
                $('body').trigger('initialize:dropdown');
                jQuery('.tablinks.tab-' + type).click();
                $('body').removeClass('loading');
            });
    });

    jQuery('.select-all').on('click', function (e) {
        e.preventDefault();
        var $parentTable = jQuery(this).parents('table.attribute_list_table');

        var checkBoxes = $parentTable.find(
            'input[name="SelectedAttributeDefinitionID"]'
        );
        for (var i = 0; i < checkBoxes.length; i++) {
            checkBoxes[i].checked = true;
        }
        $parentTable.find('.select-all').addClass('d-none');
        $parentTable.find('.clear-all').removeClass('d-none');
    });

    jQuery('.clear-all').on('click', function (e) {
        e.preventDefault();
        var $parentTable = jQuery(this).parents('table.attribute_list_table');

        var checkBoxes = $parentTable.find(
            'input[name="SelectedAttributeDefinitionID"]'
        );
        for (var i = 0; i < checkBoxes.length; i++) {
            var checkBox = checkBoxes[i];
            if (!checkBox.disabled) {
                checkBox.checked = false;
            }
        }
        $parentTable.find('.select-all').removeClass('d-none');
        $parentTable.find('.clear-all').addClass('d-none');
    });

    jQuery('.searchInput').on('keyup', function (e) {
        e.preventDefault();
        var filter;
        var $tableRows;
        var $searchTds;
        var i;
        var txtValue;

        filter = jQuery(this).val().toUpperCase();
        $tableRows = jQuery('.tabcontent').find('.attribute_list_table tr');
        $searchTds = jQuery('.tabcontent').find('.search-here');

        for (i = 1; i < $tableRows.length; i++) {
            $tableRows[i].style.display = 'none';
        }
        for (i = 0; i < $searchTds.length; i++) {
            txtValue = $searchTds[i].textContent || $searchTds[i].innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                $searchTds[i].parentElement.style.display = '';
            }
        }
    });
    jQuery('.reset-input-box').on('click', function (e) {
        e.preventDefault();
        var $tableRows;
        var i;

        $tableRows = jQuery('.tabcontent').find('tr');

        jQuery('.searchInput').val('');
        for (i = 1; i < $tableRows.length; i++) {
            $tableRows[i].style.display = '';
        }
    });
}

// Initialize
jQuery(document).ready(function () {
    initializeTabEvents();
    jQuery('.tablinks.defaultOpen').click();
});
