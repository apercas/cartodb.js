/**
 * tabbed pane.
 * if contains n views inside it and shows only one at once
 *
 * usage:
 *
 * var pane = new cdb.ui.common.TabPane({
 *   el: $("#container")
 * });
 *
 * pane.addTab('tab1', new OtherView());
 * pane.addTab('tab2', new OtherView2());
 * pane.addTab('tab3', new OtherView3());
 *
 * pane.active('tab1');
 *
 * pane.bind('tabEnabled', function(tabName, tabView) {
 * pane.bind('tabDisabled', function(tabName, tabView) {
 * });
 */
cdb.ui.common.TabPane = cdb.core.View.extend({

  initialize: function() {
      this.tabs = {};
      this.activeTab  = null;
      this.activePane = null;
  },

  addTab: function(name, view) {
    if(this.tabs[name] !== undefined) {
      cdb.log.debug(name + "already added");
    } else {
      this.tabs[name] = view.cid;
      this.addView(view);
      this.$el.append(view.el);
      this.trigger('tabAdded', name, view);
      this.active(name);
    }
  },

  getPreviousPane: function() {
    var tabs  = _.toArray(this.tabs);
    var panes = _.toArray(this._subviews);

    var i = _.indexOf(tabs, this.activePane.cid) - 1;
    if (i < 0) i = panes.length - 1;

    return panes[i];
  },

  getNextPane: function() {
    var tabs  = _.toArray(this.tabs);
    var panes = _.toArray(this._subviews);

    var i = 1 + _.indexOf(tabs, this.activePane.cid);
    if (i > panes.length - 1) i = 0;

    return panes[i];
  },

  getPane: function(name) {
    var vid = this.tabs[name];
    return this._subviews[vid];
  },

  getActivePane: function() {
    return this.activePane;
  },

  removeTab: function(name) {
    if(this.tabs[name] === undefined) {
      cdb.log.debug("trying to remove non existing pane " + name);
    } else {
      var vid = this.tabs[name];
      this._subviews[vid].clean();
      delete this.tabs[name];

      if (this.activeTab == name) {
        this.activeTab = null;
      }

      if (_.size(this.tabs)) {
        this.active(_.keys(this.tabs)[0]);
      }
    }
  },

  active: function(name) {
    var
    self = this,
    vid  = this.tabs[name];

    if (vid === undefined) {
      cdb.log.debug("trying to switch to non existing pane " + name);
    } else {

      if (this.activeTab !== name) {

        var v = this._subviews[vid];

        if (this.activeTab) {
          var vid_old  = this._subviews[this.tabs[this.activeTab]];

          vid_old.hide();
          self.trigger('tabDisabled', this.activeTab , vid_old);
          self.trigger('tabDisabled:' + this.activeTab,  vid_old);
        }

        v.show();
        if(v.activated) {
          v.activated();
        }
        self.trigger('tabEnabled', name, v);
        self.trigger('tabEnabled:' + name,  v);

        this.activeTab = name;
        this.activePane = v;

      }

      return this.activePane;
    }
  },

  render: function() {
      return this;
  }

});
