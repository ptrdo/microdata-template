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

  /**
   * Markers are the HTML node element attributes used to designate components of the templated markup.
   * Any HTML node with both "itemscope" and "hidden" as attributes is recognized as templated markup.
   *
   * @private static
   * @attribute itemscope (+hidden) designates a repeating element (the root of markup to clone).
   * @attribute itemref (optional) can provide a value identifying a nested template's data source.
   * @attribute itemprop (optional) can identify the property name according to microdata standard.
   * @attribute itemid (optional) can identify a discrete data record according to microdata standard.
   * @attribute hidden (+itemscope) designates the templated markup to be cloned.
   */
  var MARKER = {
    repeat: "itemscope",
    source: "itemref",
    property: "itemprop",
    binder: "itemid",
    schema: "itemtype",
    hidden: "hidden"
  };

  /**
   * Tokens are reserved terms embedded into markup to reference relative values.
   *
   * @private static
   * @property INDEX will insert the iterant of the current loop (e.g. <option value={{ INDEX }}>{{ VALUE }}</option>).
   * @property KEY will insert the name of the current property (e.g. <dl><dt>{{ KEY }}</dt><dd>{{ VALUE }}</dd></dl>).
   * @property VALUE will insert the value of the current property (e.g. <input name="{{ KEY }}" value="{{ VALUE }}"/>).
   */
  var TOKEN = {
    index: "INDEX",
    key: "KEY",
    value: "VALUE"
  };

  /**
   * Modifiers are reserved expressions which denote special-case exceptions.
   * TODO: Evaluate if "concat" should be the default procedure.
   *
   * @private static
   * "{{ html:value }}" will insert value with innerHTML rather than nodeValue (e.g. escaped content).
   * "{{ concat:value }} will concatenate value in-context to any adjacent content within the target attribute/node.
   * "{{ forin:value }} will iterate over every property found in the assumed object, data[value].
   */
  var MODIFIER = {
    html: "html",
    concat: "concat",
    forin: "forin"
  };

  /**
   * Patterns are employed to identify tokens embedded within markup, and then parse any discrete components.
   * TODO: Provide for nested expressions (the pattern already captures all, so split(':') and apply).
   *
   * @private static
   * @property proxy will match the token-identifying wrapper (e.g. the "{{ info }}" of <span>{{ info }}</span>).
   * @property notation will match any string that appears to be dot syntax (e.g. "{{ someObject.someProperty }}").
   * @property expression will match any prefix to the token value (e.g. "{{ parseDateToTimeValue:someDateString }}").
   * @property orsplit will progressively look for an existing value (e.g. "{{ perhaps|maybe|probably|definitely }}").
   */
  var PATTERN = {
    proxy: /{{\s*\b(.*)\b\s*}}/,
    notation: /[\.\[\]]+/,
    expression: /^(.*)\:(?=[^:]*$)(.*)/,
    orsplit: /\|/
  };

  /**
   * Transformers allow for modification of a value prior to insertion into the DOM.
   * In addition to these, a transformer can be added runtime to the templater instance via api.setTransformer();
   * NOTE: "html", "concat", and "forin" are reserved terms that cannot be employed as a Transformer.
   *
   * Transformers receive two arguments: the value and the index of the current iteration.
   *
   * @private extendable
   * "{{ join:value }} inserts a comma-delineated string concatenating an assumed array of values.
   * "{{ toLocaleString:value }}" inserts commas into large numbers (e.g. 1234567.890 becomes 1,234,567.89).
   * "{{ parseDateToTimeValue:value }}" inserts the time value parsed from a standard date string.
   * "{{ toMebibytes:value }}" converts bytes to mebibytes. (e.g. 1048576 becomes "1.00").
   * "{{ exists:value }}" inserts "true" or "false" if value exists (e.g. as a CSS class name to denote visibility).
   * "{{ absent:value }}" inserts "true" or "false" if value does not exist (e.g. as a CSS class name to denote visibility).
   */
  var TRANSFORMER = {
    join: function (value, index) {
      return value.join(", ");
    },
    toLocaleString: function (num, index) {
      return isNaN(num) ? num : Number(num).toLocaleString();
    },
    parseDateToTimeValue: function (value, index) {
      var time = Date.parse(value);
      return isNaN(time) ? isNaN(value) ? 0 : value : time;
    },
    toMebibytes: function (bytes, index) {
      return (Math.round(bytes / 10485.76) / 100).toFixed(2).toLocaleString();
    },
    exists: function (value, index) {
      return !!value ? "true" : "false";
    },
    absent: function (value, index) {
      return !value ? "true" : "false";
    }
  };

  /**
   * TODO: Determine if this is only a dubious feature.
   * @type {Boolean} When true bypasses obj.hasOwnProperty() filtering.
   */
  var showHeritage = false;


  /* PRIVATE UTILITIES */

  var traverse = function (node, func) {
    func(node);
    node = node.firstChild;
    while (node) {
      if (!!node && !!node.parentNode && isTemplate(node.parentNode)) {
        /* this is a nested template, so pass it bye */
      } else {
        traverse(node, func);
      }
      node = node.nextSibling;
    }
  };

  var isTemplate = function (node) {
    return !!node && !!node.hasAttribute
        && node.hasAttribute(MARKER.repeat)
        && node.hasAttribute(MARKER.source)
        && node.hasAttribute(MARKER.hidden);
  };

  var denude = function(clone) {
    clone.removeAttribute(MARKER.repeat);
    clone.removeAttribute(MARKER.source);
    clone.removeAttribute(MARKER.hidden);
    return clone;
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

  var parse = function (input, data, index) {
    var proxy, expression, option, token, value = null;
    if (!PATTERN.proxy.test(input)) {
      // no proxy syntax found, so abort
      return input;
    } else {
      proxy = input.match(PATTERN.proxy)[1];
      expression = proxy.match(PATTERN.expression);
      if (!!expression) {
        proxy = expression[2];
        expression = expression[1].split(/:/).reverse();
      }
      option = proxy.split(PATTERN.orsplit);
      for (var i = 0; i < option.length; i++) {
        if (option[i] === TOKEN.index) {
          value = index;
        } else if (Array.isArray(data)) {
          if (typeof data[0] === "object") {
            // value = data[token];
          } else {
            // value = data[index]
          }
        } else if (typeof data === "object") {
          if (option[i] === TOKEN.value) {
            // value = data.hasOwnProperty(option[i]) ? data[option[i]] : null;
          } else if (option[i] === TOKEN.key) {
            // value = option[i];
          } else if (option[i] in data) {
            // value = data[option[i]];
          }
        }
        if (value !== null) {
          break;
        }
      }

      // console.log(expression, token, value);


      // filter MODIFIERS from TRANSFORMERS
      // apply any transformer(s) right to left
      // return the value

      // potentially a number
      // /^-?\d+\.?\d*$/.test(val)

      // what to do with modifiers?
      // concat: && html: by default?
      // or swift-pattern to capture mid-logic?

    }
  };

  /* PRIVATE METHODS */

  var clear = function (template, callback) {

    /* TODO: Consider as smarter utility that preserves non-template content. */

    var parent = template.parentNode;
    if (!!parent) {
      while (!!parent.lastChild && parent.lastChild !== template) {
        parent.removeChild(parent.lastChild);
      }
    }

    if (!!callback && callback instanceof Function) {
      callback();
    }
  };

  var renderNestedTemplate = function (node, data) {

    /* TODO: Match the MODIFIER.forin at every itemscope (not just here). */
    /* TODO: Implement nesting less obtrusively, and wherever it may occur. */

    var itemref = node.getAttribute(MARKER.source);
    var proxy = !!itemref ? itemref.match(PATTERN.proxy) : null;
    var modifier, alternates, deepdata;
    if (!!proxy) {
      proxy = proxy[1];
      modifier = proxy.match(PATTERN.expression);
      if (!!modifier) {
        proxy = modifier[2];
        modifier = modifier[1];
      }
      alternates = proxy.split(PATTERN.orsplit);
      if (alternates.length > 1) {
        proxy = alternates.filter(function (alt) {
          return alt in data;
        })[0];
      }
      if (!!proxy && proxy in data) {
        deepdata = data[proxy];
      }
    } else {
      deepdata = data[itemref];
    }
    if (!!deepdata) {
      if (deepdata === Object(deepdata)) {
        if (!!modifier && modifier === MODIFIER.forin) {
          renderObject(node, deepdata, true);
        } else {
          renderObject(node, deepdata);
        }
      } else if (Array.isArray(deepdata)) {
        renderCollection(node, deepdata);
      }
    }
  };

  /**
   * Traverses templated markup and replaces embedded tokens with a corresponding Object of data.
   * NOTE: The "template" can already be a clone that is subsequently appended via code external to this.
   *
   * @private
   * @param {HTMLElement} template (required) the node to traverse.
   * @param {Object} obj (required) the information that should correspond with embedded tokens.
   * @param {Boolean} forin (optional) whether to iterate over every property (true) else once per object.
   * @returns {null}
   */
  var renderObject = function (template, obj, forin) {

    /* TODO: Coalesce with renderArray and renderCollection. */
    /* TODO: Qualify arguments as valid entities or throw exception. */
    /* TODO: Manage any previously handled events before clearing node? */

    var fragment = document.createDocumentFragment();
    var parent = template.parentNode; // null if template is a clone!
    if (!!parent) {
      while (!!parent.lastChild && parent.lastChild !== template) {
        parent.removeChild(parent.lastChild);
      }
    }
    var i = -1;
    var clone = !!parent ? denude(template.cloneNode(true)) : template;
    for (var key in obj) {
      if (!!forin) {
        clone = !!parent ? denude(template.cloneNode(true)) : template;
      }
      if (obj.hasOwnProperty(key) || showHeritage) {
        ++i;
        traverse(clone, function (node) {
          var proxy, value, attrs, alternates, notation, formatter;
          if (node.nodeType === 3) {
            proxy = node.nodeValue.match(PATTERN.proxy);
            if (!!proxy) {
              proxy = proxy[1];
              alternates = proxy.split(PATTERN.orsplit);
              notation = PATTERN.notation.test(proxy);
              formatter = proxy.match(PATTERN.expression);
              if (!!formatter) {
                proxy = formatter[2];
                alternates = proxy.split(PATTERN.orsplit);
                notation = PATTERN.notation.test(proxy);
                formatter = formatter[1];
              }
              if (!!proxy) {
                if (alternates.length > 1) {
                  proxy = alternates.filter(function (alt) {
                    return alt in obj;
                  })[0];
                }
                if (notation) {
                  value = parseDotNotation(obj, proxy);
                } else {
                  value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? obj[key] : obj.hasOwnProperty(proxy) ? obj[proxy] : "";
                }
                if (!!formatter) {
                  if (formatter === MODIFIER.html) {
                    node.parentNode.innerHTML = proxy === TOKEN.key ? key : value;
                  } else if (formatter === MODIFIER.concat) {
                    node.nodeValue = node.nodeValue.replace(PATTERN.proxy, proxy === TOKEN.key ? key : value);
                  } else if (!!TRANSFORMER[formatter]) {
                    node.nodeValue = TRANSFORMER[formatter](proxy === TOKEN.key ? key : value, i);
                  }
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
                  proxy = proxy[1];
                  alternates = proxy.split(PATTERN.orsplit);
                  notation = PATTERN.notation.test(proxy);
                  formatter = proxy.match(PATTERN.expression);
                  if (!!formatter) {
                    proxy = formatter[2];
                    alternates = proxy.split(PATTERN.orsplit);
                    notation = PATTERN.notation.test(proxy);
                    formatter = formatter[1];
                  }
                  if (!!proxy) {
                    if (alternates.length > 1) {
                      proxy = alternates.filter(function (alt) {
                        return alt in obj;
                      })[0];
                    }
                    if (notation) {
                      value = parseDotNotation(obj, proxy);
                    } else {
                      value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? obj[key] : obj.hasOwnProperty(proxy) ? obj[proxy] : "";
                    }
                    if (!!formatter) {
                      if (formatter === MODIFIER.concat) {
                        attrs[j].value = attrs[j].value.replace(PATTERN.proxy, value);
                      } else if (!!TRANSFORMER[formatter]) {
                        attrs[j].value = TRANSFORMER[formatter](value, i);
                      }
                    } else {
                      attrs[j].value = value;
                    }
                  }
                }
              }
            }
          }
        });
      }
      if (!!parent) {
        fragment.appendChild(clone);
        /* else the template itself is the clone */
      }
    }
    if (!!parent) {
      parent.appendChild(fragment);
      /* else the template itself is the clone */
    }
  };

  /**
   * Traverses templated markup and replaces embedded tokens with a corresponding Array of data.
   * NOTE: The "template" can already be a clone that is subsequently appended via code external to this.
   *
   * @private
   * @param {HTMLElement} template (required) the node to traverse.
   * @param {Object} arr (required) the information that should correspond with embedded tokens.
   * @returns {null}
   */
  var renderArray = function (template, arr) {

    /* TODO: Coalesce with renderObject and renderCollection. */
    /* TODO: Qualify arguments as valid entities or throw exception. */
    /* TODO: Manage any previously handled events before clearing node? */

    var fragment = document.createDocumentFragment();
    var parent = template.parentNode; // null if template is a clone!
    if (!!parent) {
      while (!!parent.lastChild && parent.lastChild !== template) {
        parent.removeChild(parent.lastChild);
      }
    }

    for (var i = 0; i < arr.length; i++) {

      var datum = arr[i];
      var clone = !!parent ? denude(template.cloneNode(true)) : template;

      traverse(clone, function (node) {
        var proxy, value, attrs, alternates, notation, formatter;
        if (node.nodeType === 3) {
          proxy = node.nodeValue.match(PATTERN.proxy);
          if (!!proxy) {
            proxy = proxy[1];
            alternates = proxy.split(PATTERN.orsplit);
            formatter = proxy.match(PATTERN.expression);
            if (!!formatter) {
              proxy = formatter[2];
              alternates = proxy.split(PATTERN.orsplit);
              formatter = formatter[1];
            }
            if (!!proxy) {
              if (alternates.length > 1) {
                proxy = alternates.filter(function (alt) {
                  return alt in datum;
                })[0];
              }
              value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? arr[i] : "";
              if (!!formatter) {
                if (formatter === MODIFIER.html) {
                  node.parentNode.innerHTML = value;
                } else if (formatter === MODIFIER.concat) {
                  node.nodeValue = node.nodeValue.replace(PATTERN.proxy, value);
                } else if (!!TRANSFORMER[formatter]) {
                  node.nodeValue = TRANSFORMER[formatter](value, i);
                }
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
                proxy = proxy[1];
                alternates = proxy.split(PATTERN.orsplit);
                notation = PATTERN.notation.test(proxy);
                formatter = proxy.match(PATTERN.expression);
                if (!!formatter) {
                  proxy = formatter[2];
                  alternates = proxy.split(PATTERN.orsplit);
                  notation = PATTERN.notation.test(proxy);
                  formatter = formatter[1];
                }
                if (!!proxy) {
                  if (alternates.length > 1) {
                    proxy = alternates.filter(function (alt) {
                      return alt in datum;
                    })[0];
                  }
                  if (notation) {
                    value = parseDotNotation(datum, proxy);
                  } else {
                    value = proxy === TOKEN.index ? i : proxy === TOKEN.value ? arr[i] : "";
                  }
                  if (!!formatter) {
                    if (formatter === MODIFIER.concat) {
                      attrs[j].value = attrs[j].value.replace(PATTERN.proxy, value);
                    } else if (!!TRANSFORMER[formatter]) {
                      attrs[j].value = TRANSFORMER[formatter](value, i);
                    }
                  } else {
                    attrs[j].value = value;
                  }
                }
              }
            }
          }
        }
      });
      if (!!parent) {
        fragment.appendChild(clone);
        /* else the template itself is the clone */
      }
    }
    if (!!parent) {
      parent.appendChild(fragment);
      /* else the template itself is the clone */
    }
  };

  /**
   * Traverses templated markup and replaces embedded tokens with a corresponding Collection of data.
   * NOTE: The "template" can already be a clone that is subsequently appended via code external to this.
   *
   * @private
   * @param {HTMLElement} template (required) the node to traverse.
   * @param {Object} collection (required) the information that should correspond with embedded tokens.
   * @returns {null}
   */
  var renderCollection = function (template, collection) {

    /* TODO: Coalesce with renderObject and renderArray. */
    /* TODO: Qualify arguments as valid entities or throw exception. */
    /* TODO: Manage any previously handled events before clearing node? */

    var fragment = document.createDocumentFragment();
    var parent = template.parentNode; // null if template is a clone!
    if (!!parent) {
      while (!!parent.lastChild && parent.lastChild !== template) {
        parent.removeChild(parent.lastChild);
      }
    }

    for (var i = 0; i < collection.length; i++) {

      var datum = collection[i];
      var clone = !!parent ? denude(template.cloneNode(true)) : template;

      traverse(clone, function (node) {
        var proxy, value, attrs, alternates, notation, formatter;
        if (isTemplate(node)) {
          renderNestedTemplate(node, datum);
        } else if (node.nodeType === 3) {
          proxy = node.nodeValue.match(PATTERN.proxy);
          if (!!proxy) {
            proxy = proxy[1];
            alternates = proxy.split(PATTERN.orsplit);
            notation = PATTERN.notation.test(proxy);
            formatter = proxy.match(PATTERN.expression);
            if (!!formatter) {
              proxy = formatter[2];
              alternates = proxy.split(PATTERN.orsplit);
              notation = PATTERN.notation.test(proxy);
              formatter = formatter[1];
            }
            if (!!proxy) {
              if (alternates.length > 1) {
                proxy = alternates.filter(function(alt) {
                  return alt in datum;
                })[0];
              }
              if (notation) {
                value = parseDotNotation(datum, proxy);
              } else {
                value = proxy === TOKEN.index ? i : datum.hasOwnProperty(proxy) ? datum[proxy] : "";
              }
              if (!!formatter) {
                if (formatter === MODIFIER.html) {
                  node.parentNode.innerHTML = value;
                } else if (formatter === MODIFIER.concat) {
                  node.nodeValue = node.nodeValue.replace(PATTERN.proxy, value);
                } else if (!!TRANSFORMER[formatter]) {
                  node.nodeValue = TRANSFORMER[formatter](value, i);
                }
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
                proxy = proxy[1];
                alternates = proxy.split(PATTERN.orsplit);
                notation = PATTERN.notation.test(proxy);
                formatter = proxy.match(PATTERN.expression);
                if (!!formatter) {
                  proxy = formatter[2];
                  alternates = proxy.split(PATTERN.orsplit);
                  notation = PATTERN.notation.test(proxy);
                  formatter = formatter[1];
                }
                if (!!proxy) {
                  if (alternates.length > 1) {
                    proxy = alternates.filter(function (alt) {
                      return alt in datum;
                    })[0];
                  }
                  if (notation) {
                    value = parseDotNotation(datum, proxy);
                  } else {
                    value = proxy === TOKEN.index ? i : datum.hasOwnProperty(proxy) ? datum[proxy] : "";
                  }
                  if (!!formatter) {
                    if (formatter === MODIFIER.concat) {
                      attrs[j].value = attrs[j].value.replace(PATTERN.proxy, value);
                    } else if (!!TRANSFORMER[formatter]) {
                      attrs[j].value = TRANSFORMER[formatter](value, i);
                    }
                  } else {
                    attrs[j].value = value;
                  }
                }
              }
            }
          }
        }
      });
      if (!!parent) {
        fragment.appendChild(clone);
        /* else the template itself is the clone */
      }
    }
    if (!!parent) {
      parent.appendChild(fragment);
      /* else the template itself is the clone */
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
     *
     * @example
     * <span>{{ wrapInQuotes:VALUE }}</span>
     * setTransformer("wrapInQuotes", function(value){ return '"'+value+'"'; });
     */
    api.setTransformer = function (name, func) {
      if (name in TRANSFORMER) {
        return false;
      } else if (!(func instanceof Function)) {
        return false;
      } else {
        TRANSFORMER[name] = func;
        return true;
      }
    };

    /**
     * Render templated markup (embedded or cloned) according to a data set.
     *
     * @public
     * @param {HTMLElement} ele The outermost DOM Element to consider for template.
     * @param {Array|Object} data The data to be consumed for populating template.
     */
    api.render = function (ele, data) {

      element = ele;
      source = data;

      if (Array.isArray(data)) {
        if (typeof data[0] === "object") {
          renderCollection(ele, data);
        } else {
          renderArray(ele, data);
        }
      } else if (typeof data === "object") {
        renderObject(ele, data);
      }
    };

    /**
     * Refresh previously templated markup (embedded or cloned) without deep traversal.
     * TODO: Coalesce with normal render.
     *
     * @public
     * @param {HTMLElement} ele The outermost DOM Element to consider for template.
     * @param {Array|Object} data The data to be consumed for populating template.
     */
    api.refresh = function (ele, data) {
      renderNestedTemplate(ele, data);
    };

    /**
     * Remove the populated elements of a rendered template.
     *
     * @public
     * @param {HTMLElement} ele (optional) The Element to clear (or instance's reserved "element").
     * @param {Function} callback (optional) The code to execute following this process.
     * @returns {Function|null} Will execute callback or null if template not valid.
     */
    api.clear = function (ele, callback) {

      var target = ele||element;

      if (isTemplate(target)) {
        clear(target, callback);
      } else if (!!callback && callback instanceof Function) {
        callback(null);
      } else {
        return null;
      }
    };

    api.getElement = function () {

      return element;
    };

    /**
     * @param boo {Boolean} When true the obj.hasOwnProperty() is not enforced.
     * @returns {Boolean} The current setting.
     */
    api.getSetShowHeritage = function (boo) {

      if (arguments.length > 0) {
        showHeritage = !!boo;
      }

      return showHeritage;
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