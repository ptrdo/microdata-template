/**
 * JavaScript Microdata Template
 * An implementation of HTML template by way of the microdata mechanism.
 *
 * @author Peter Sylwester
 * @copyright (c) 2016 Peter Sylwester
 * @license MIT
 * @version 1.00, 2016/01/04
 * @requires HTML5, ECMA-262 Edition 5.1 JavaScript
 *
 */

(function(exports) {

  // utilities here

  exports.microdataTemplate = function(element, data) {

    // Object to be returned. The public API.
    var self = {};

    self.something = function() { console.log("something"); };

    return self;
  };

}(typeof exports === "object" && exports || this));