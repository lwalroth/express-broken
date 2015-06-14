Shortly.MyLinksView = Backbone.View.extend({
  className: 'myLinks',

  initialize: function(){
    this.collection.on('sync', this.addAll, this);
    this.collection.fetch();
  },

  render: function() {
    this.$el.empty();
    return this;
  },

  addAll: function(){
    this.collection.forEach(this.addOne, this);
  },

  addOne: function(item){
    var view = new Shortly.LinkView({ model: item });
    // if(view.model.get('user_id')){
      this.$el.append(view.render().el);
    // }
  }
});