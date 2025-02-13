define(function(require) {
    'use strict';

    const $ = require('jquery');
    const _ = require('underscore');
    const BaseComponent = require('oroui/js/app/components/base/component');
    const CheckSmtpConnectionView = require('../views/check-smtp-connection-view');
    const CheckSmtpConnectionModel = require('../models/check-smtp-connection-model');

    const CheckSmtpConnectionComponent = BaseComponent.extend({
        /**
         * @inheritDoc
         */
        constructor: function CheckSmtpConnectionComponent(options) {
            CheckSmtpConnectionComponent.__super__.constructor.call(this, options);
        },

        /**
         * Initialize component
         *
         * @param {Object} options
         * @param {string} options.elementNamePrototype
         */
        initialize: function(options) {
            if (options.elementNamePrototype) {
                const viewOptions = _.extend({
                    model: new CheckSmtpConnectionModel({}),
                    el: $(options._sourceElement).closest(options.parentElementSelector),
                    entity: options.forEntity || 'user',
                    entityId: options.id,
                    organization: options.organization || ''
                }, options.viewOptions || {});
                this.view = new CheckSmtpConnectionView(viewOptions);
            } else {
                // unable to initialize
                $(options._sourceElement).remove();
            }
        }
    });
    return CheckSmtpConnectionComponent;
});
