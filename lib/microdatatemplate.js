/**
 * JavaScript Microdata Template
 * An implementation of HTML template by way of the microdata mechanism.
 *
 * @author Peter Sylwester
 * @copyright (c) 2016 Peter Sylwester
 * @license MIT
 * @version 1.00, 2016/01/05
 * @requires "HTML5", "ECMA-262 Edition 5.1"
 *
 */

(function(exports) {

  // private interface properties

  var static = 0;
  var processor = function(ele, data) {

    console.log("processor", ele, data);

  };

  exports.microdataTemplate = function(options) {
    "use strict";

    // private instance properties

    var config = options || { info: 0 };
    var property = config.info;
    var element, source;

    // public instance properties

    var api = {};

    api.render = function(ele, data) {

      element = ele;
      source = data;

      processor(element, source);

    };

    api.clear = function() {

    };

    api.refresh = function(ele, data) {

      processor(element, source);

    };

    api.getSetProperty = function(num) {

      if (arguments.length > 0) {
        property = num;
      }

      return property;
    };

    api.getSetSource = function(obj) {

      if (arguments.length > 0) {
        source = obj;
      }

      return source;
    };

    return api;
  };

}(typeof exports === "object" && exports || this));