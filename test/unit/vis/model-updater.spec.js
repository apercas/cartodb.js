var CartoDBLayer = require('../../../src/geo/map/cartodb-layer');
var TorqueLayer = require('../../../src/geo/map/torque-layer');
var LayersCollection = require('../../../src/geo/map/layers');
var Backbone = require('backbone');
var ModelUpdater = require('../../../src/vis/model-updater');
var WindshaftError = require('../../../src/windshaft/error');
var CartoDBLayerGroup = require('../../../src/geo/cartodb-layer-group');
var WindshaftMap = require('../../../src/windshaft/map-base.js');

var MyWindshaftMap = WindshaftMap.extend({
});

describe('src/vis/model-updater', function () {
  beforeEach(function () {
    this.fakeVis = jasmine.createSpyObj('vis', ['reload']);

    this.windshaftMap = new MyWindshaftMap({
      urlTemplate: 'http://{user}.carto.com:80',
      userName: 'documentation'
    }, {
      client: {},
      layersCollection: {},
      dataviewsCollection: {},
      analysisCollection: {},
      modelUpdater: {}
    });

    spyOn(this.windshaftMap, 'getBaseURL').and.callFake(function (subdomain) {
      return 'http://' + (subdomain ? subdomain + '.' : '') + 'documentation.carto.com';
    });
    spyOn(this.windshaftMap, 'getLayerMetadata').and.returnValue('metadata');
    spyOn(this.windshaftMap, 'getLayerIndexesByType').and.returnValue([0]);
    spyOn(this.windshaftMap, 'getSupportedSubdomains').and.returnValue(['']);
    spyOn(this.windshaftMap, 'getBubbleLegendMetadata').and.returnValue({});
    spyOn(this.windshaftMap, 'getCategoryLegendMetadata').and.returnValue(['']);
    spyOn(this.windshaftMap, 'getChoroplethLegendMetadata').and.returnValue(['']);

    this.visModel = new Backbone.Model();
    this.visModel.setOk = jasmine.createSpy('setOk');
    this.visModel.setError = jasmine.createSpy('setError');
    this.layersCollection = new LayersCollection();
    this.layerGroupModel = new CartoDBLayerGroup({}, {
      layersCollection: this.layersCollection
    });
    this.analysisCollection = new Backbone.Collection();
    this.dataviewsCollection = new Backbone.Collection();

    this.modelUpdater = new ModelUpdater({
      visModel: this.visModel,
      layerGroupModel: this.layerGroupModel,
      layersCollection: this.layersCollection,
      dataviewsCollection: this.dataviewsCollection,
      analysisCollection: this.analysisCollection
    });

    // _getProtocol uses window.location.protocol internally, and that returns "file:"
    // when running the test suite using the jasmine test runner, so we need to fake it
    spyOn(this.modelUpdater, '_getProtocol').and.returnValue('http');
  });

  describe('.updateModels', function () {
    beforeEach(function () {
      this.windshaftMap.getBaseURL.and.callFake(function (subdomain) {
        return 'http://' + (subdomain ? subdomain + '.' : '') + 'documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0';
      });
    });

    it('should set vis state to ok', function () {
      this.modelUpdater.updateModels(this.windshaftMap);

      expect(this.visModel.setOk).toHaveBeenCalled();
    });

    describe('layerGroupModel', function () {
      it('should set indexOfLayersInWindshaft', function () {
        this.windshaftMap.getLayerIndexesByType.and.callFake(function (layerType) {
          if (layerType === 'mapnik') {
            return ([1, 2]);
          }
        });

        this.modelUpdater.updateModels(this.windshaftMap);

        expect(this.layerGroupModel.get('indexOfLayersInWindshaft')).toEqual([1, 2]);
      });

      describe('tile urls', function () {
        it('should generate tile URLs', function () {
          var layer1 = new CartoDBLayer({}, { vis: this.visModel });
          var layer2 = new CartoDBLayer({}, { vis: this.visModel });

          this.layersCollection.reset([ layer1, layer2 ]);

          // For Windshaft, layers are in positions 0 and 1
          this.windshaftMap.getLayerIndexesByType.and.returnValue([0, 1]);

          this.modelUpdater.updateModels(this.windshaftMap);

          // Tile URL template will fetch tiles for layers #0 and #1
          expect(this.layerGroupModel.getTileURLTemplates()).toEqual([
            'http://documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/0,1/{z}/{x}/{y}.png'
          ]);
        });

        it('should include subdomains if map supports it', function () {
          this.windshaftMap.getSupportedSubdomains.and.returnValue(['0', '1', '2', '3']);

          var layer1 = new CartoDBLayer({}, { vis: this.visModel });

          this.layersCollection.reset([ layer1 ]);

          // For Windshaft, layers are in positions 1 and 2
          this.windshaftMap.getLayerIndexesByType.and.returnValue([1]);

          this.modelUpdater.updateModels(this.windshaftMap);

          // No URLs have been generated (no tiles should be fetched)
          expect(this.layerGroupModel.getTileURLTemplates()).toEqual([
            'http://0.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.png',
            'http://1.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.png',
            'http://2.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.png',
            'http://3.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.png'
          ]);
        });
      });

      describe('grid urls', function () {
        it('should generate grid URLs', function () {
          var layer1 = new CartoDBLayer({}, { vis: this.visModel });
          var layer2 = new CartoDBLayer({}, { vis: this.visModel });

          this.layersCollection.reset([ layer1, layer2 ]);

          // For Windshaft, layers are in positions 0 and 1
          this.windshaftMap.getLayerIndexesByType.and.returnValue([0, 1]);

          this.modelUpdater.updateModels(this.windshaftMap);

          // Tile URL template will fetch tiles for layers #0 and #1
          expect(this.layerGroupModel.getGridURLTemplates(0)).toEqual([
            'http://documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/0/{z}/{x}/{y}.grid.json'
          ]);
          expect(this.layerGroupModel.getGridURLTemplates(1)).toEqual([
            'http://documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.grid.json'
          ]);
        });

        it('should generate grid URLs with subdomains', function () {
          this.windshaftMap.getSupportedSubdomains.and.returnValue(['0', '1', '2', '3']);

          var layer1 = new CartoDBLayer({}, { vis: this.visModel });
          var layer2 = new CartoDBLayer({}, { vis: this.visModel });

          this.layersCollection.reset([ layer1, layer2 ]);

          // For Windshaft, layers are in positions 0 and 1
          this.windshaftMap.getLayerIndexesByType.and.returnValue([1, 2]);

          this.modelUpdater.updateModels(this.windshaftMap);

          // Tile URL template will fetch tiles for layers #0 and #1
          expect(this.layerGroupModel.getGridURLTemplates(0)).toEqual([
            'http://0.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.grid.json',
            'http://1.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.grid.json',
            'http://2.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.grid.json',
            'http://3.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/{z}/{x}/{y}.grid.json'
          ]);
          expect(this.layerGroupModel.getGridURLTemplates(1)).toEqual([
            'http://0.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/2/{z}/{x}/{y}.grid.json',
            'http://1.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/2/{z}/{x}/{y}.grid.json',
            'http://2.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/2/{z}/{x}/{y}.grid.json',
            'http://3.documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/2/{z}/{x}/{y}.grid.json'
          ]);
        });
      });

      describe('attribute urls', function () {
        it('should generate attribute URLs', function () {
          var layer1 = new CartoDBLayer({}, { vis: this.visModel });
          var layer2 = new CartoDBLayer({}, { vis: this.visModel });

          this.layersCollection.reset([ layer1, layer2 ]);

          // For Windshaft, layers are in positions 0 and 1
          this.windshaftMap.getLayerIndexesByType.and.returnValue([1, 2]);

          this.modelUpdater.updateModels(this.windshaftMap);

          // Tile URL template will fetch tiles for layers #0 and #1
          expect(this.layerGroupModel.getAttributesBaseURL(0)).toEqual(
            'http://documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/1/attributes'
          );
          expect(this.layerGroupModel.getAttributesBaseURL(1)).toEqual(
            'http://documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/2/attributes'
          );
        });
      });
    });

    describe('layer models', function () {
      it('should mark CartoDB and torque layer models as ok', function () {
        var layer0 = new Backbone.Model({ type: 'Tiled' });
        var layer1 = new CartoDBLayer({}, { vis: this.visModel });
        spyOn(layer1, 'setOk');
        var layer2 = new TorqueLayer({}, { vis: this.visModel });
        spyOn(layer2, 'setOk');
        this.layersCollection.reset([ layer0, layer1, layer2 ]);

        this.modelUpdater.updateModels(this.windshaftMap);

        expect(layer1.setOk).toHaveBeenCalled();
        expect(layer2.setOk).toHaveBeenCalled();
      });

      it('should set tileURLTemplates attribute of torque layer models', function () {
        var layer0 = new Backbone.Model({ type: 'Tiled' });
        var layer1 = new CartoDBLayer({}, { vis: this.visModel });
        var layer2 = new TorqueLayer({}, { vis: this.visModel });
        this.layersCollection.reset([ layer0, layer1, layer2 ]);

        this.modelUpdater.updateModels(this.windshaftMap);

        expect(layer2.get('tileURLTemplates')).toEqual([
          'http://documentation.carto.com/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/0/{z}/{x}/{y}.json.torque'
        ]);
      });

      it('should update legend models of CartoDB and torque layer models', function () {
        var layer0 = new Backbone.Model({ type: 'Tiled' });
        var layer1 = new CartoDBLayer({}, { vis: this.visModel });
        var layer2 = new CartoDBLayer({}, { vis: this.visModel });
        var layer3 = new TorqueLayer({}, { vis: this.visModel });
        this.layersCollection.reset([ layer0, layer1, layer2, layer3 ]);

        this.windshaftMap.getLayerIndexesByType.and.callFake(function (layerType) {
          if (layerType === 'mapnik') {
            return [0, 1];
          }
          if (layerType === 'torque') {
            return [2];
          }
        });

        this.windshaftMap.getBubbleLegendMetadata.and.callFake(function (layerIndex) {
          if (layerIndex === 0) {
            return {
              bubbles: 'bubbles_layer_0',
              avg: 'avg_layer_0'
            };
          }
          if (layerIndex === 2) {
            return {
              bubbles: 'bubbles_layer_2',
              avg: 'avg_layer_2'
            };
          }
        });

        this.windshaftMap.getCategoryLegendMetadata.and.callFake(function (layerIndex) {
          if (layerIndex === 0) {
            return {
              categories: 'categories_layer_0'
            };
          }
          if (layerIndex === 2) {
            return {
              categories: 'categories_layer_2'
            };
          }
        });

        this.windshaftMap.getChoroplethLegendMetadata.and.callFake(function (layerIndex) {
          if (layerIndex === 0) {
            return {
              colors: 'colors_layer_0'
            };
          }
          if (layerIndex === 2) {
            return {
              colors: 'colors_layer_2'
            };
          }
        });

        this.modelUpdater.updateModels(this.windshaftMap);

        expect(layer1.legends.bubble.get('bubbles')).toEqual('bubbles_layer_0');
        expect(layer1.legends.bubble.get('avg')).toEqual('avg_layer_0');
        expect(layer1.legends.category.get('categories')).toEqual('categories_layer_0');
        expect(layer1.legends.choropleth.get('colors')).toEqual('colors_layer_0');

        expect(layer2.legends.bubble.get('bubbles')).toBeUndefined();
        expect(layer2.legends.bubble.get('avg')).toBeUndefined();
        expect(layer2.legends.category.get('categories')).toBeUndefined();
        expect(layer2.legends.choropleth.get('colors')).toBeUndefined();

        expect(layer3.legends.bubble.get('bubbles')).toEqual('bubbles_layer_2');
        expect(layer3.legends.bubble.get('avg')).toEqual('avg_layer_2');
        expect(layer3.legends.category.get('categories')).toEqual('categories_layer_2');
        expect(layer3.legends.choropleth.get('colors')).toEqual('colors_layer_2');
      });
    });

    describe('dataview models', function () {
      it('should update dataview models', function () {
        var dataview1 = new Backbone.Model({ id: 'a1' });
        var dataview2 = new Backbone.Model({ id: 'a2' });
        this.dataviewsCollection.reset([ dataview1, dataview2 ]);

        this.windshaftMap.getDataviewMetadata = function (dataviewId) {
          if (dataviewId === 'a1') {
            return {
              url: {
                http: 'http://example1.com',
                https: 'https://example1.com'
              }
            };
          }
          if (dataviewId === 'a2') {
            return {
              url: {
                http: 'http://example2.com',
                https: 'https://example2.com'
              }
            };
          }
        };

        spyOn(dataview1, 'set').and.callThrough();

        this.modelUpdater.updateModels(this.windshaftMap, 'sourceId', 'forceFetch');

        expect(dataview1.set).toHaveBeenCalledWith({
          url: 'http://example1.com'
        }, {
          sourceId: 'sourceId',
          forceFetch: 'forceFetch'
        });

        expect(dataview1.get('url')).toEqual('http://example1.com');
        expect(dataview2.get('url')).toEqual('http://example2.com');
      });
    });

    describe('analysis models', function () {
      it('should update analysis models and "mark" them as ok', function () {
        var getParamNames = function () { return []; };
        var analysis1 = new Backbone.Model({ id: 'a1' });
        analysis1.setOk = jasmine.createSpy('setOk');
        var analysis2 = new Backbone.Model({ id: 'a2' });
        analysis2.setOk = jasmine.createSpy('setOk');
        this.analysisCollection.reset([ analysis1, analysis2 ]);
        analysis1.getParamNames = analysis2.getParamNames = getParamNames;

        this.windshaftMap.getAnalysisNodeMetadata = function (analysisId) {
          if (analysisId === 'a1') {
            return {
              status: 'status_a1',
              query: 'query_a1',
              url: {
                http: 'url_a1'
              }
            };
          }
          if (analysisId === 'a2') {
            return {
              status: 'status_a2',
              query: 'query_a2',
              url: {
                http: 'url_a2'
              }
            };
          }
        };

        this.modelUpdater.updateModels(this.windshaftMap);

        expect(analysis1.get('status')).toEqual('status_a1');
        expect(analysis1.get('query')).toEqual('query_a1');
        expect(analysis1.get('url')).toEqual('url_a1');
        expect(analysis1.setOk).toHaveBeenCalled();
        expect(analysis2.get('status')).toEqual('status_a2');
        expect(analysis2.get('query')).toEqual('query_a2');
        expect(analysis2.get('url')).toEqual('url_a2');
        expect(analysis2.setOk).toHaveBeenCalled();
      });

      it('should update analysis models and "mark" them as failed', function () {
        var getParamNames = function () { return []; };
        var analysis1 = new Backbone.Model({ id: 'a1' });
        this.analysisCollection.reset([ analysis1 ]);
        analysis1.getParamNames = getParamNames;

        this.windshaftMap.getAnalysisNodeMetadata = function (analysisId) {
          if (analysisId === 'a1') {
            return {
              error_message: 'wadus',
              status: 'failed',
              query: 'query_a1',
              url: {
                http: 'url_a1'
              }
            };
          }
        };

        this.modelUpdater.updateModels(this.windshaftMap);

        expect(analysis1.get('status')).toEqual('failed');
        expect(analysis1.get('error')).toEqual({message: 'wadus'});
      });

      it('should not update attributes that are original params (eg: query)', function () {
        var analysis1 = new Backbone.Model({ id: 'a1', query: 'original_query' });
        analysis1.getParamNames = function () { return ['query']; };
        analysis1.setOk = jasmine.createSpy('setOk');
        this.analysisCollection.reset([ analysis1 ]);

        this.windshaftMap.getAnalysisNodeMetadata = function (analysisId) {
          if (analysisId === 'a1') {
            return {
              status: 'new_status',
              query: 'new_query',
              url: {
                http: 'new_url'
              }
            };
          }
        };

        this.modelUpdater.updateModels(this.windshaftMap);

        expect(analysis1.get('status')).toEqual('new_status');
        expect(analysis1.get('query')).toEqual('original_query');
        expect(analysis1.get('url')).toEqual('new_url');
      });
    });
  });

  describe('.setErrors', function () {
    it('should set vis state to error', function () {
      this.modelUpdater.setErrors([
        new WindshaftError({
          type: 'unknown',
          message: 'something went wrong!'
        })
      ]);

      expect(this.visModel.setError).toHaveBeenCalled();
      var error = this.visModel.setError.calls.argsFor(0)[0];

      expect(error.type).toBeUndefined();
      expect(error.message).toEqual('something went wrong!');
      expect(error.context).toBeUndefined();
    });

    it('should "mark" analysis as erroneous', function () {
      var analysis = new Backbone.Model({
        id: 'ANALYSIS_NODE_ID'
      });
      analysis.setError = jasmine.createSpy('setError');

      this.analysisCollection.reset([ analysis ]);

      this.modelUpdater.setErrors([
        new WindshaftError({
          type: 'analysis',
          message: 'Missing required param "radius"',
          analysis: {
            id: 'ANALYSIS_ID',
            node_id: 'ANALYSIS_NODE_ID',
            context: {
              something: 'else'
            }
          }
        })
      ]);

      expect(analysis.setError).toHaveBeenCalled();
      var error = analysis.setError.calls.argsFor(0)[0];

      expect(error.type).toBeUndefined();
      expect(error.analysisId).toEqual('ANALYSIS_NODE_ID');
      expect(error.message).toEqual('Missing required param "radius"');
      expect(error.context).toEqual({
        something: 'else'
      });
    });

    it('should "mark" layer as erroroneus', function () {
      var layer = new Backbone.Model({
        id: 'LAYER_ID'
      });
      layer.setError = jasmine.createSpy('setError');

      this.layersCollection.reset([ layer ]);

      this.modelUpdater.setErrors([
        new WindshaftError({
          type: 'layer',
          subtype: 'turbo-carto',
          message: 'turbo-carto: something went wrong',
          layer: {
            index: 0,
            id: 'LAYER_ID',
            type: 'cartodb',
            context: {
              selector: '#layer',
              source: {
                start: {
                  line: 1,
                  column: 10
                },
                end: {
                  line: 1,
                  column: 61
                }
              }
            }
          }
        })
      ]);

      expect(layer.setError).toHaveBeenCalled();
      var error = layer.setError.calls.argsFor(0)[0];

      expect(error.type).toEqual('turbo-carto');
      expect(error.layerId).toEqual('LAYER_ID');
      expect(error.message).toEqual('turbo-carto: something went wrong');
      expect(error.context).toEqual({
        selector: '#layer',
        source: {
          start: {
            line: 1,
            column: 10
          },
          end: {
            line: 1,
            column: 61
          }
        }
      });
    });

    it('should "mark" legend models as erroroneus', function () {
      var layer1 = new CartoDBLayer({}, { vis: this.visModel });
      var layer2 = new CartoDBLayer({}, { vis: this.visModel });

      expect(layer1.legends.bubble.isError()).toBeFalsy();
      expect(layer1.legends.category.isError()).toBeFalsy();
      expect(layer1.legends.choropleth.isError()).toBeFalsy();

      expect(layer2.legends.bubble.isError()).toBeFalsy();
      expect(layer2.legends.category.isError()).toBeFalsy();
      expect(layer2.legends.choropleth.isError()).toBeFalsy();

      this.layersCollection.reset([ layer1, layer2 ]);

      this.modelUpdater.setErrors();

      expect(layer1.legends.bubble.isError()).toBeTruthy();
      expect(layer1.legends.category.isError()).toBeTruthy();
      expect(layer1.legends.choropleth.isError()).toBeTruthy();

      expect(layer2.legends.bubble.isError()).toBeTruthy();
      expect(layer2.legends.category.isError()).toBeTruthy();
      expect(layer2.legends.choropleth.isError()).toBeTruthy();
    });
  });
});
