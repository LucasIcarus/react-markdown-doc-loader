var fs = require('fs');
var path = require('path');
var unified = require('unified');
var remarkHtml = require('remark-html');
var _ = require('lodash');
var utils = require('zandoc-loader-utils');

var compileStyle = require('./compile-style');
var compileCode = require('./compile-code');
var uniqImports = require('./uniq-imports');
var helper = require('./helper');
var highlightCode = require('./highlight-code');

var markdownToHtmlProcessor = unified()
  .use(remarkHtml)
  .freeze();

function gensym() {
  return 'ReactDemo__' + Date.now() + _.uniqueId('__');
}

module.exports = function (content) {
  var options = loaderUtils.getOptions(this);
  var componentTemplate = _.template(fs.readFileSync(path.resolve(__dirname, options.jsTemplate)));

  var callback = this.async();
  if (!callback) {
    return this.emitError('zandoc-react-loader must run asynchronously');
  }

  Promise.all(utils.map(content, {
    style: function (node) {
      return compileStyle(node.value).then(function (css) {
        return {
          type: 'style',
          value: css
        };
      });
    },

    demo: function(node){
      var compiled = compileCode(node.value);
      return Promise.resolve(Object.assign(compiled, {
        type: 'demo',
        title: node.title
      }));
    },

    markdown: function(node){
      return Promise.resolve({
        type: 'markdown',
        value: markdownToHtmlProcessor.stringify(node)
      });
    }
  })).then(function (sections) {
    var demos = sections.filter(function(s) {
      return s.type === 'demo';
    });
    var imports = uniqImports(
      demos.reduce(function(acc, d) {
        return acc.concat(d.imports)
      }, [])
    );

    var comp = componentTemplate({
      imports: [].concat(imports.imports, imports.fixes).map(helper.generateCode).join('\n'),
      sections: sections.map(function (sec) {
        if (sec.type === 'demo') {
          return Object.assign({}, sec, {
            id: gensym(),
            src: highlightCode(sec.src)
          });
        }

        return sec;
      })
    });

    callback(null, comp);
  }).catch(function (error) {
    callback(error);
  });
};
