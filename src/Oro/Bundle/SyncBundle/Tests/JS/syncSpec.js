define(function(require) {
    'use strict';

    const sync = require('orosync/js/sync');
    const jsmoduleExposure = require('jsmodule-exposure');
    const exposure = jsmoduleExposure.disclose('orosync/js/sync');

    xdescribe('orosync/js/sync', function() {
        let service;
        let messenger;

        beforeEach(function() {
            service = jasmine.createSpyObj('service', ['subscribe', 'unsubscribe', 'connect']);
            service.on = jasmine.createSpy('service.on').and.returnValue(service);
            service.once = jasmine.createSpy('service.once').and.returnValue(service);
            service.off = jasmine.createSpy('service.off').and.returnValue(service);

            messenger = jasmine.createSpyObj('messenger', ['notificationMessage', 'notificationFlashMessage']);

            exposure.substitute('__').by(jasmine.createSpy('__'));
            exposure.substitute('messenger').by(messenger);
        });

        afterEach(function() {
            exposure.recover('__');
            exposure.recover('messenger');
            exposure.recover('service');
        });

        it('setup service', function() {
            expect(function() {
                sync({});
            }).toThrow();
            expect(exposure.retrieve('service')).toBeUndefined();
            expect(function() {
                sync(service);
            }).not.toThrow();
            expect(exposure.retrieve('service')).toBe(service);
        });

        describe('model changes subscription', function() {
            let model;
            let subscribeModel;
            let unsubscribeModel;

            beforeEach(function() {
                subscribeModel = exposure.retrieve('subscribeModel');
                unsubscribeModel = exposure.retrieve('unsubscribeModel');
                exposure.substitute('service').by(service);
                model = jasmine.createSpyObj('model', ['set']);
                model.on = jasmine.createSpy('model.on').and.returnValue(model);
                model.url = jasmine.createSpy('model.url').and.returnValue('some/model/1');
            });

            it('subscribe new model', function() {
                subscribeModel(model);
                expect(service.subscribe).not.toHaveBeenCalled();
            });

            it('subscribe existing model', function() {
                model.id = 1;
                subscribeModel(model);
                expect(service.subscribe).toHaveBeenCalledWith(model.url(), jasmine.any(Function));
                expect(model.on).toHaveBeenCalledWith('remove', unsubscribeModel);
                // same callback function event
                const setModelAttrsCallback = service.subscribe.calls.mostRecent().args[1];
                subscribeModel(model);
                expect(service.subscribe.calls.mostRecent().args[1]).toBe(setModelAttrsCallback);
            });

            it('unsubscribe new model', function() {
                subscribeModel(model);
                unsubscribeModel(model);
                expect(service.unsubscribe).not.toHaveBeenCalled();
            });

            it('unsubscribe existing model', function() {
                model.id = 1;
                subscribeModel(model);
                const setModelAttrsCallback = service.subscribe.calls.mostRecent().args[1];
                unsubscribeModel(model);
                expect(service.unsubscribe).toHaveBeenCalledWith(model.url(), setModelAttrsCallback);
            });
        });

        describe('check sync\'s methods', function() {
            beforeEach(function() {
                exposure.substitute('service').by(service);
            });

            describe('tracking changes', function() {
                let subscribeModel;
                let unsubscribeModel;
                const Backbone = {
                    Model: function() {},
                    Collection: function() {
                        this.on = jasmine.createSpy('collection.on');
                        this.off = jasmine.createSpy('collection.off');
                    }
                };
                beforeEach(function() {
                    exposure.substitute('subscribeModel')
                        .by(subscribeModel = jasmine.createSpy('subscribeModel'));
                    exposure.substitute('unsubscribeModel')
                        .by(unsubscribeModel = jasmine.createSpy('subscribeModel'));
                    exposure.substitute('Backbone').by(Backbone);
                });
                afterEach(function() {
                    exposure.recover('subscribeModel');
                    exposure.recover('unsubscribeModel');
                    exposure.recover('Backbone');
                });

                it('of any object', function() {
                    const obj = {};
                    sync.keepRelevant(obj);
                    expect(subscribeModel).not.toHaveBeenCalled();
                    sync.stopTracking(obj);
                    expect(unsubscribeModel).not.toHaveBeenCalled();
                });

                it('of Backbone.Model', function() {
                    const model = new Backbone.Model();
                    sync.keepRelevant(model);
                    expect(subscribeModel.calls.count()).toEqual(1);
                    sync.stopTracking(model);
                    expect(unsubscribeModel.calls.count()).toEqual(1);
                });

                describe('of Backbone.Collection', function() {
                    let collection;
                    beforeEach(function() {
                        collection = new Backbone.Collection();
                        collection.url = 'some/model';
                        collection.models = [new Backbone.Model(), new Backbone.Model(), new Backbone.Model()];
                    });

                    it('tracking collection changes', function() {
                        sync.keepRelevant(collection);
                        expect(subscribeModel.calls.count()).toEqual(collection.models.length);
                        expect(collection.on).toHaveBeenCalled();
                        sync.stopTracking(collection);
                        expect(unsubscribeModel.calls.count()).toEqual(collection.models.length);
                        expect(collection.off).toHaveBeenCalledWith(collection.on.calls.mostRecent().args[0]);
                    });

                    describe('consistency of handling events', function() {
                        let events;
                        beforeEach(function() {
                            sync.keepRelevant(collection);
                            events = collection.on.calls.mostRecent().args[0];
                        });

                        it('collection "add" event', function() {
                            expect(events.add).toEqual(exposure.original('subscribeModel'));
                        });

                        it('collection "error" event', function() {
                            expect(events.error).toEqual(jasmine.any(Function));
                            events.error(collection);
                            // remove subscription for each models
                            expect(unsubscribeModel.calls.count()).toEqual(collection.models.length);
                        });

                        it('collection "reset" event', function() {
                            const options = {previousModels: collection.models};
                            collection.models = [new Backbone.Model(), new Backbone.Model()];
                            subscribeModel.calls.reset();
                            expect(events.reset).toEqual(jasmine.any(Function));
                            events.reset(collection, options);
                            // remove subscription for each previous models
                            expect(unsubscribeModel.calls.count()).toEqual(options.previousModels.length);
                            // add subscription for each new models
                            expect(subscribeModel.calls.count()).toEqual(collection.models.length);
                        });
                    });
                });
            });

            it('sync.reconnect', function() {
                sync.reconnect();
                expect(service.connect).toHaveBeenCalled();
            });
        });
    });
});
