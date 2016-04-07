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

(function (exports) {

  /* PRIVATE STATIC MEMBERS */

  var MARKER = {
    /* DOM element attributes */
    repeat: "itemscope",
    source: "itemref",
    property: "itemprop",
    binder: "itemid",
    schema: "itemtype",
    hidden: "hidden"
  };

  var TOKEN = {
    /* reserved proxy values for use within a template */
    index: "INDEX",
    key: "KEY",
    value: "VALUE"
  };

  var PATTERN = {
    proxy: /({{)(.*)(}})/,
    notation: /[\.\[\]]+/,
    expression: /(.*)(:)(.*)/,
    orsplit: /\|/
  };

  var TRANSFORMER = {
    /* NOTE: with "{{ html:value }}" html is a reserved expression that will parse with innerHTML rather than insert as nodeValue */
    /* NOTE: with "{{ concaat:value }}" concat is a reserved expression that will pattern-match and replace proxy token with value */
    join: function (value) {
      return value.join(", ");
    },
    toLocaleString: function (num) {
      /* inserts commas into large numbers (e.g. 1234567.890 becomes 1,234,567.89) */
      return isNaN(num) ? num : Number(num).toLocaleString();
    },
    parseDateToTimeValue: function (value) {
      var time = Date.parse(value);
      return isNaN(time) ? isNaN(value) ? 0 : value : time;
    },
    toMebibytes: function (bytes) {
      return (Math.round(bytes / 10485.76) / 100).toFixed(2).toLocaleString();
    },
    exists: function (value) {
      return !!value ? "true" : "false";
    },
    absent: function (value) {
      return !value ? "true" : "false";
    }
  };

  /* PRIVATE UTILITIES */

  var traverse = function (node, func) {
    func(node);
    node = node.firstChild;
    while (node) {
      traverse(node, func);
      node = node.nextSibling;
    }
  };

  var parseDotNotation = function (obj, notation) {
    /* TODO: return [obj].concat(notation.split(".")).reduce(function(parent, child){ return !!parent && child in parent ? parent[child] : null; }); */
    var address = notation.split(PATTERN.notation);
    while (address.length > 0 && !!obj) {
      var index, property = address.shift();
      if (Array.isArray(obj)) {
        index = parseInt(property);
        if (index == property && index < obj.length) {
          /* this is NOT a strict equality of index === property, because property could be a string-numeric */
          obj = obj[index];
        } else {
          obj = undefined;
        }
      } else {
        obj = obj[property];
      }
    }
    return obj === undefined ? "" : obj;
  };


  /* PRIVATE METHODS */

  var clear = function (template, callback) {

    /* TODO: consider as smarter, universal utility. */

    var parent = template.parentNode;
    while (!!parent && !!parent.lastChild && parent.lastChild !== template) {
      parent.removeChild(parent.lastChild);
    }

    if (!!callback && callback instanceof Function) {
      callback();
    }
  };

  var renderObject = function (template, obj, withHeritage) {

    /* TODO: qualify arguments as valid entities or throw exception */
    /* TODO: manage any previously handled events before clearing node */

    var parent = template.parentNode;
    while (!!parent && !!parent.lastChild && parent.lastChild !== template) {
      parent.removeChild(parent.lastChild);
    }
    var i = -1;
    for (var key in obj) {
      if (obj.hasOwnProperty(key) || !!withHeritage) {

        var clone = parent ? template.cloneNode(true) : template;
        ++i;

        traverse(clone, function (node) {
          var proxy, value, attrs, alternates, notation, formatter;
          if (node.nodeType === 3) {
            proxy = node.nodeValue.match(PATTERN.proxy);
            if (!!proxy) {
              proxy = proxy[2].trim();
              alternates = proxy.split(PATTERN.orsplit);
              notation = PATTERN.notation.test(proxy);
              formatter = proxy.match(PATTERN.expression);
              if (!!formatter) {
                proxy = formatter[3].trim();
                alternates = proxy.split(PATTERN.orsplit);
                notation = PATTERN.notation.test(proxy);
                formatter = formatter[1].trim();
              }
              if (!!proxy) {
                if (alternates.length > 1) {
                  proxy = alternates.filter(function (alt) {
                    return alt in model;
                  })[0];
                }
                if (notation) {
                  value = parseDotNotation(obj, proxy);
                } else {
                  value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? obj[key] : obj.hasOwnProperty(proxy) ? obj[proxy] : "";
                }
                if (!!formatter && !!TRANSFORMER[formatter]) {
                  node.nodeValue = TRANSFORMER[formatter](proxy === TOKEN.key ? key : value);
                } else {
                  node.nodeValue = proxy === TOKEN.key ? key : value;
                }
              }
            }
          } else if (node.hasAttributes()) {
            attrs = node.attributes;
            for (var j = attrs.length - 1; j >= 0; j--) {
              if (!!attrs[j].value) {
                proxy = attrs[j].value.match(PATTERN.proxy);
                if (!!proxy) {
                  proxy = proxy[2].trim();
                  alternates = proxy.split(PATTERN.orsplit);
                  if (!!proxy) {
                    if (alternates.length > 1) {
                      proxy = alternates.filter(function (alt) {
                        return alt in model;
                      })[0];
                    }
                    value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? obj[key] : obj.hasOwnProperty(proxy) ? obj[proxy] : "";
                    attrs[j].value = proxy === TOKEN.key ? key : value;
                  }
                }
              }
            }
          }
        });

        if (!!parent) {
          clone.removeAttribute(MARKER.repeat);
          clone.removeAttribute(MARKER.source);
          clone.removeAttribute(MARKER.hidden);
          parent.appendChild(clone);
        }
      }
    }
  };

  var renderArray = function (template, arr, withHeritage) {

    /* TODO: qualify arguments as valid entities or throw exception */
    /* TODO: manage any previously handled events before clearing node */

    var parent = template.parentNode;
    while (!!parent && !!parent.lastChild && parent.lastChild !== template) {
      parent.removeChild(parent.lastChild);
    }

    for (var i = 0; i < arr.length; i++) {

      var clone = template.cloneNode(true);
      clone.removeAttribute(MARKER.repeat);
      clone.removeAttribute(MARKER.source);
      clone.removeAttribute(MARKER.hidden);

      traverse(clone, function (node) {
        var proxy, value, attrs, alternates, notation, formatter;
        if (node.nodeType === 3) {
          proxy = node.nodeValue.match(PATTERN.proxy);
          if (!!proxy) {
            proxy = proxy[2].trim();
            alternates = proxy.split(PATTERN.orsplit);
            formatter = proxy.match(PATTERN.expression);
            if (!!formatter) {
              proxy = formatter[3].trim();
              alternates = proxy.split(PATTERN.orsplit);
              formatter = formatter[1].trim();
            }
            if (!!proxy) {
              if (alternates.length > 1) {
                proxy = alternates.filter(function (alt) {
                  return alt in model;
                })[0];
              }
              value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? arr[i] : "";
              if (!!formatter && !!TRANSFORMER[formatter]) {
                node.nodeValue = TRANSFORMER[formatter](value);
              } else {
                node.nodeValue = value;
              }
            }
          }
        } else if (node.hasAttributes()) {
          attrs = node.attributes;
          for (var j = attrs.length - 1; j >= 0; j--) {
            if (!!attrs[j].value) {
              proxy = attrs[j].value.match(PATTERN.proxy);
              if (!!proxy) {
                proxy = proxy[2].trim();
                alternates = proxy.split(PATTERN.orsplit);
                if (!!proxy) {
                  if (alternates.length > 1) {
                    proxy = alternates.filter(function (alt) {
                      return alt in model;
                    })[0];
                  }
                  value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? arr[i] : "";
                  attrs[j].value = value;
                }
              }
            }
          }
        }
      });

      parent.appendChild(clone);
    }
  };

  var renderCollection = function (template, collection, withHeritage) {

    /* TODO: qualify arguments as valid entities or throw exception */
    /* TODO: manage any previously handled events before clearing parentNode */

    var parent = template.parentNode;
    while (!!parent && !!parent.lastChild && parent.lastChild !== template) {
      parent.removeChild(parent.lastChild);
    }

    for (var i = 0; i < collection.length; i++) {

      var model = collection[i];
      var clone = template.cloneNode(true);

      clone.removeAttribute(MARKER.repeat);
      clone.removeAttribute(MARKER.source);
      clone.removeAttribute(MARKER.hidden);

      traverse(clone, function (node) {
        var proxy, value, attrs, alternates, notation, formatter, deepdata;
        if (node.nodeType === 3) {
          proxy = node.nodeValue.match(PATTERN.proxy);
          if (!!proxy) {
            proxy = proxy[2].trim();
            alternates = proxy.split(PATTERN.orsplit);
            notation = PATTERN.notation.test(proxy);
            formatter = proxy.match(PATTERN.expression);
            if (!!formatter) {
              proxy = formatter[3].trim();
              alternates = proxy.split(PATTERN.orsplit);
              notation = PATTERN.notation.test(proxy);
              formatter = formatter[1].trim();
            }
            if (!!proxy) {
              if (alternates.length > 1) {
                proxy = alternates.filter(function(alt) {
                  return alt in model;
                })[0];
              }
              if (notation) {
                value = parseDotNotation(model, proxy);
              } else {
                value = proxy === TOKEN.index ? i : model.hasOwnProperty(proxy) ? model[proxy] : "";
              }
              if (!!formatter) {
                if (formatter === "html") {
                  node.parentNode.innerHTML = value;
                } else if (formatter === "concat") {
                  node.nodeValue = node.nodeValue.replace(PATTERN.proxy, value);
                } else if (!!TRANSFORMER[formatter]) {
                  node.nodeValue = TRANSFORMER[formatter](value);
                }
              } else {
                node.nodeValue = value;
              }
            }
          }
        } else if (node.hasAttributes()) {
          attrs = node.attributes;
          if (node.hasAttribute(MARKER.repeat) && node.hasAttribute(MARKER.source)) {
            /* a nested template */
            deepdata = model[node.getAttribute(MARKER.source)];
            if (!!deepdata) {
              if (deepdata === Object(deepdata)) {
                renderObject(node, deepdata, withHeritage);
              } else if (Array.isArray(deepdata)) {
                renderCollection(node, deepdata, withHeritage);
              }
            }
          } else {
            for (var j = attrs.length - 1; j >= 0; j--) {
              if (!!attrs[j].value) {
                proxy = attrs[j].value.match(PATTERN.proxy);
                if (!!proxy) {
                  proxy = proxy[2].trim();
                  alternates = proxy.split(PATTERN.orsplit);
                  notation = PATTERN.notation.test(proxy);
                  formatter = proxy.match(PATTERN.expression);
                  if (!!formatter) {
                    proxy = formatter[3].trim();
                    alternates = proxy.split(PATTERN.orsplit);
                    notation = PATTERN.notation.test(proxy);
                    formatter = formatter[1].trim();
                  }
                  if (!!proxy) {
                    if (alternates.length > 1) {
                      proxy = alternates.filter(function (alt) {
                        return alt in model;
                      })[0];
                    }
                    if (notation) {
                      value = parseDotNotation(model, proxy);
                    } else {
                      value = proxy === TOKEN.index ? i : model.hasOwnProperty(proxy) ? model[proxy] : "";
                    }
                    if (!!formatter) {
                      if (formatter === "concat") {
                        attrs[j].value = attrs[j].value.replace(PATTERN.proxy, value);
                      } else if (!!TRANSFORMER[formatter]) {
                        attrs[j].value = TRANSFORMER[formatter](value);
                      }
                    } else {
                      attrs[j].value = value;
                    }
                  }
                }
              }
            }
          }
        }
      });

      parent.appendChild(clone);
    }
  };

  exports.MicrodataTemplate = function (options) {
    "use strict";

    // private instance properties

    var config = options || { info: 0 };
    var property = config.info; // example
    var element, source;

    // public instance properties

    var api = {};

    /**
     * Adds a run-time tranformer to prototype's collection.
     *
     * @public
     * @param {String} name The expression referenced in token.
     * @param {Function} func The transformation to execute on `value`.
     * @returns {Boolean} Returns `true` if stored or `false` if name pre-exists.
     * @example
     * <span>{{ wrapInQuotes:VALUE }}</span>
     * setTransformer("wrapInQuotes", function(value){ return '"'+value+'"'; });
     */
    api.setTransformer = function (name, func) {
      if (name in TRANSFORMER) {
        return false;
      } else {
        TRANSFORMER[name] = func;
        return true;
      }
    };

    /**
     * Render a template according to a data set.
     *
     * @public
     * @param {Object} ele The outermost DOM Element to consider for template.
     * @param {Array|Object} data The data to be consumed for populating template.
     * @param {Boolean} withHeritage To show all properties or filter with hasOwnProperty.
     */
    api.render = function (ele, data, withHeritage) {

      element = ele;
      source = data;

      if (Array.isArray(data)) {
        if (typeof data[0] === "object") {
          renderCollection(ele, data, withHeritage);
        } else {
          renderArray(ele, data, withHeritage);
        }
      } else if (typeof data === "object") {
        renderObject(ele, data, withHeritage);
      }
    };

    /**
     * Remove the populated elements of a rendered template.
     *
     * @public
     * @param {Object} ele The outermost DOM Element to consider for template.
     * @param {Function} callback The code to exectute after removing elements.
     */
    api.clear = function (ele, callback) {

      var template = ele; // TODO: qualify the template

      clear(template, callback);
    };

    api.refresh = function (ele, data, withHeritage) {


    };

    api.getElement = function () {

      return element;
    };

    api.getSetProperty = function (num) {

      if (arguments.length > 0) {
        property = num;
      }

      return property;
    };

    api.getSetSource = function (obj) {

      if (arguments.length > 0) {
        source = obj;
      }

      return source;
    };

    return api;
  };

}(typeof exports === "object" && exports || this));