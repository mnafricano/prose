Liquid.readTemplateFile = function(path) {
    var repo = window.app.models.getRepo(app.state.user, app.state.repo);
    return repo.contentsSync(app.state.branch, '_includes/' + path);
}


Liquid.Template.registerTag( 'include', Liquid.Tag.extend({

  tagSyntax: /((?:"[^"]+"|'[^']+'|[^\s,|]+)+)(\s+(?:with|for)\s+((?:"[^"]+"|'[^']+'|[^\s,|]+)+))?/,

  init: function(tag, markup, tokens) {
    var matches = (markup || '').match(this.tagSyntax);
    if(matches) {
      this.templateName = matches[1];
      this.templateNameVar = this.templateName.substring(1, this.templateName.length - 1);
      this.variableName = matches[3];
      this.attributes = {};

      var attMatchs = markup.match(/(\w*?)\s*\:\s*("[^"]+"|'[^']+'|[^\s,|]+)/g);
      if(attMatchs) {
        attMatchs.each(function(pair){
          pair = pair.split(":");
          this.attributes[pair[0].strip()] = pair[1].strip();
        }, this);
      }
    } else {
      throw ("Error in tag 'include' - Valid syntax: include '[template]' (with|for) [object|collection]");
    }
    this._super(tag, markup, tokens);
  },

  render: function(context) {
    var self     = this,
        source   = Liquid.readTemplateFile( this.templateName ),
        partial  = Liquid.parse(source),
        variable = context.get((this.variableName || this.templateNameVar)),
        output   = '';
    context.stack(function(){
      self.attributes.each = hackObjectEach;
      self.attributes.each(function(pair){
        context.set(pair.key, context.get(pair.value));
      })

      if(variable instanceof Array) {
        output = variable.map(function(variable){
          context.set( self.templateNameVar, variable );
          return partial.render(context);
        });
      } else {
        context.set(self.templateNameVar, variable);
        output = partial.render(context);
      }
    });
    output = [output].flatten().join('');
    return output
  }
}));


Liquid.Block.prototype.renderAll = function(list, context) {
  return (list || []).map(function(token, i){
    var output = '';
    try { // hmmm... feels a little heavy
      output = ( token['render'] ) ? token.render(context) : token;
    } catch(e) {
      
      console.log(context.handleError(e));
    }
    return output;
  });
};

Liquid.Template.registerTag( 'highlight', Liquid.Block.extend({
  tagSyntax: /(\w+)/,

  init: function(tagName, markup, tokens) {
    var parts = markup.match(this.tagSyntax);
    if( parts ) {
      this.to = parts[1];
    } else {
      throw ("Syntax error in 'highlight' - Valid syntax: hightlight [language]");
    }
    this._super(tagName, markup, tokens);
  },
  render: function(context) {
    var output = this._super(context);
    return '<pre>' + output[0] + '</pre>';
  }
}));

Liquid.Block.prototype.unknownTag = function(tag, params, tokens) {
  switch(tag) {
    case 'else': console.log(this.blockName +" tag does not expect else tag"); break;
    case 'end':  console.log("'end' is not a valid delimiter for "+ this.blockName +" tags. use "+ this.blockDelimiter); break;
    default:     console.log("Unknown tag: "+ tag);
  }
};
