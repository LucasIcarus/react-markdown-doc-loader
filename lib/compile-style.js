var postcss = require('postcss');
var precss = require('precss');
var autoprefixer = require('autoprefixer');

module.exports = function compileStyle(content, context) {
  return postcss([precss, autoprefixer])
    .process(content)
    .then(function (result) {
      return result.css;
    });
}
