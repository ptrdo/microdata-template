;
(function (root, factory) {
  
  /**
   * JavaScript Microdata Template
   * An implementation of HTML template by way of the microdata mechanism.
   *
   * @author Peter Sylwester
   * @copyright (c)2022 Peter Sylwester
   * @license MIT
   * @version 2.3.0, 2022/05/03
   * @requires "HTML5", "ECMA-262 Edition 5.1"
   *
   *
   * ES6-COMPLIANT IMPLEMENTATION:
   *
   *   import templater from "./path/to/microdata-template.js";
   *
   *   $(function() {
   *     templater.render(someHTMLElement, someCorrespondingData);
   *   });
   *
   *
   * AMD IMPLEMENTATION (RequireJS):
   *
   *   require.config({
   *     paths: { templater: "./path/to/microdata-template"},
   *     shim: { templater: { exports: "templater" }}
   *   });
   *
   *   define(["templater"], function(templater) {
   *     templater.render(someHTMLElement, someCorrespondingData);
   *   });
   *
   *
   * ECMA-262 IMPLEMENTATION:
   *
   *   <script type="text/javascript" src="./path/to/microdata-template.js"></script>
   *
   *   window.addEventListener("load", function(event) {
   *     window.MicrodataTemplate.render(someHTMLElement, someData);
   *   }, true);
   *
   */

  var namespace = "MicrodataTemplate";
  typeof exports === "object" && typeof module !== "undefined"
    ? module.exports = factory()
    : typeof define === "function" && "amd" in define
        ? define([], factory)
        : ((root||window)[namespace] = factory());

}(this, (function () {
  "use strict";

  var element, source, version = "2.2.2";

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
   * "{{ concat:value }}" will concatenate value in-context to any adjacent content within the target attribute/node.
   * "{{ forin:value }}" will iterate over every property found in the assumed object, data[value].
   * "{{ boolean:value }}" will set boolean attribute per resolved truthiness of value (e.g. "checked", "selected", "disabled", "hidden")
   */
  var MODIFIER = {
    html: "html",
    concat: "concat",
    forin: "forin",
    boolean: "boolean"
  };

  /**
   * Patterns are employed to identify tokens embedded within markup, and then parse any discrete components.
   *
   * @private static
   * @property proxy will match the token-identifying wrapper (e.g. the "{{ info }}" of <span>{{ info }}</span>).
   * @property notation will match any string that appears to be dot syntax (e.g. "{{ someObject.someProperty }}").
   * @property address will match object address of dot or bracket syntax (e.g. foo.bar and foo[bar] and foo[bar][too]).
   * @property expression will match any prefix to the token value (e.g. "{{ parseDateToTimeValue:someDateString }}").
   * @property expressionsplit separates transforms applied progressively (e.g. "{{ thenDoThis:doThis:someValue }}").
   * @property expressioncombo separates expression(s) from a combineString list (e.g. "combineString:("foo",bar)").
   * @property orsplit separates tokens progressively considered for value (e.g. "{{ perhaps|maybe|probably|definitely }}").
   * @property falsey tests for boolean considerate of RESTful responses (e.g. falsey.test("False"); falsey.test(" "); // return true).
   * @property protocol disqualifies URL-like string from notation test (e.g. {{ combineString:("http://domain.com/", path) }}).
   * @property endquotes will match leading and ending quotes (e.g. to strip-off string values provided as tokens). 
   */
  var PATTERN = {
    proxy: /{{\s*\b(.*)\s* }}/,
    notation: /[\.\[\]]+/,
    address: /(\w+(\.\w+)+)|(\w+(\[\w+\])+)/,
    expression: /^(.*)\:(?=[^:]*$)(.*)/,
    expressionsplit: /\:/,
    expressioncombo: /^([^(]+)(\(.*\))/,
    orsplit: /\|/,
    falsey: /^(false|null|undefined|nan|0|\s*)$/i,
    protocol: /https?\:\/\//,
    endquotes: /^["']|['"]$/g
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
   * "{{ parseDateToTimeValue:value }}" inserts the time value parsed from an assumed standard date string.
   * "{{ toMebibytes:value }}" converts bytes to mebibytes. (e.g. 1048576 becomes "1.00").
   * "{{ exists:value }}" inserts "true" or "false" if value exists (e.g. as a CSS class name to denote visibility).
   * "{{ absent:value }}" inserts "true" or "false" if value does not exist (the obverse of exists).
   * "{{ combineString:('abc', token1, '123', token2...) }}" combines arbitrary strings and/or token values.
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
    },
    combineString: function (values, index) {
      return values === undefined ? "" : Array.isArray(values) ? values.join("") : values.toString();
    }
  };

  /**
   * TODO: Determine if this is only a dubious feature.
   * @type {Boolean} When true, bypasses obj.hasOwnProperty() filtering.
   */
  var showHeritage = false;

  /**
   * strictStandard determines Microdata compliance. 
   * 
   * @public via proxy
   * @type {Boolean} When true, requires Microdata attributes for template.
   */
  var strictStandard = false;
  
  /**
   * stripByteOrderMark removes the marking indicating UTF-8 encoding.
   * 
   * @public via proxy
   * @type {Boolean} When true, strips Byte Order Mark from incoming HTML snippets.
   */
  var stripByteOrderMark = true;

  /* PRIVATE UTILITIES */

  var traverse = function (node, func) {
    try {
      func(node);
    } catch (e) {
      console.warn(e);
    }
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
      && node.hasAttribute(MARKER.hidden)
      && (node.hasAttribute(MARKER.repeat) 
      || node.hasAttribute(MARKER.property) 
      || node.hasAttribute(MARKER.binder));
  };
  
  var isNestedTemplate = function (node) {
    return !!node && !!node.hasAttribute
      && node.hasAttribute(MARKER.hidden)
      && node.hasAttribute(MARKER.repeat)
      && node.hasAttribute(MARKER.source);
  };

  var denude = function (clone) {
    clone.removeAttribute(MARKER.hidden);
    clone.removeAttribute(MARKER.repeat);
    clone.removeAttribute(MARKER.source);
    return clone;
  };

  var findTemplate = function (source) {
    var node, candidate;
    if (stripByteOrderMark) {
      node = stripBOM(source);
    } else {
      node = source;
    }
    if (!strictStandard) {
      return node;
    } else if (isTemplate(node)) {
      return node;
    } else if (!!node && !!node.querySelector) {
      candidate = node.querySelector("["+MARKER.hidden+"]");
      if (isTemplate(candidate)) {
        return candidate;
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  var parseObjectNotation = function (obj, notation) {
    /* TODO: return [obj].concat(notation.split(".")).reduce(function(parent, child){ return !!parent && child in parent ? parent[child] : null; }); */
    var address = notation.split(/\.|\[|\]\[|\]/).filter(function(item){ return item.length > 0; });
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

  var stripBOM = function(buf) {
    var str = buf.toString("utf-8");
    if(str.charCodeAt(0) === 0xFEFF) {
      return str.slice(1);
    } else {
      return str;
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
      if (Array.isArray(deepdata)) {
        if (typeof deepdata[0] === "object") {
          renderCollection(node, deepdata);
        } else {
          renderArray(node, deepdata);
        }
      } else if (deepdata === Object(deepdata)) {
        if (!!modifier && modifier === MODIFIER.forin) {
          renderObject(node, deepdata, true);
        } else {
          renderObject(node, deepdata);
        }
      }
    }
  };

  var traverseImpl = function (datum, i, key) {
    return function (node) {
      var proxy, combo, value, attrs, alternates, transform, modify, booleans = [];
      if (isNestedTemplate(node)) {
        renderNestedTemplate(node, datum);
      } else if (node.nodeType === 3) {
        proxy = node.nodeValue.match(PATTERN.proxy);
        if (!!proxy) {
          proxy = proxy[1];
          if (PATTERN.expressioncombo.test(proxy)) {
            // this is a parenthetical, e/g combineString:(foo,bar) 
            combo = proxy.match(PATTERN.expressioncombo);
            transform = combo[1].match(PATTERN.expression);
            transform = transform[1].split(PATTERN.expressionsplit).filter(function(exp){ return !!exp; }).reverse()
            proxy = combo[2].replace(/[()]/g,"").split(/,\s*/);
            alternates = [];
          } else {
            alternates = proxy.split(PATTERN.orsplit);
            transform = proxy.match(PATTERN.expression);
            if (!!transform) {
              proxy = transform[2];
              alternates = proxy.split(PATTERN.orsplit);
              transform = transform[1].split(PATTERN.expressionsplit).reverse();
            }
          }
          if (!!proxy) {
            if (alternates.length > 1) {
              proxy = alternates.filter(function (alt, k, arr) {
                if (PATTERN.address.test(alt)) {
                  return alt;
                } else if (alt in datum) {
                  return alt;
                } else if (j == arr.length-1 && PATTERN.endquotes.test(alt)) {
                  return alt;
                } else if (new RegExp(alt).test(Object.values(TOKEN))) {
                  return alt;
                } else {
                  return false;
                }
              })[0];
            }
            if (!!combo && Array.isArray(proxy)) {
              // this is a parenthetical, e/g combineString:(foo,bar) 
              value = [];
              proxy.forEach(function (clause) {
                var v
                  = PATTERN.endquotes.test(clause) ? clause.replace(PATTERN.endquotes, "")
                  : clause === TOKEN.index ? i
                  : clause === TOKEN.key ? key
                  : clause === TOKEN.value ? (key !== void(0) ? datum[key] : datum)
                  : clause in datum ? datum[clause]
                  : PATTERN.address.test(clause) ? parseObjectNotation(datum, clause)
                  : "";
                value.push(v);
              });
            } else {
              value
                = PATTERN.endquotes.test(proxy) ? proxy.replace(PATTERN.endquotes, "")
                : proxy === TOKEN.index ? i
                : proxy === TOKEN.key ? key
                : proxy === TOKEN.value ? (key !== void(0) ? datum[key] : datum)
                : proxy in datum ? datum[proxy]
                : PATTERN.address.test(proxy) ? parseObjectNotation(datum, proxy)
                : "";
            }
            if (!!transform && transform.length > 0) {
              modify = transform.filter(function (exp) { return exp in MODIFIER; });
              transform = transform.filter(function (exp) { return exp in TRANSFORMER; });
              transform.forEach(function (exp) {
                value = TRANSFORMER[exp](value, i);
              });
              if (modify.indexOf(MODIFIER.concat) > -1) {
                value = node.nodeValue.replace(PATTERN.proxy, value);
              }
              if (modify.indexOf(MODIFIER.html) > -1) {
                node.parentNode.innerHTML = value;
              } else {
                node.nodeValue = value;
              }
            } else {
              node.nodeValue = value;
            }
          }
        }
      } else if (node.nodeType !== 8 && node.hasAttributes()) {
        attrs = node.attributes;
        for (var j = attrs.length - 1; j >= 0; j--) {
          if (!!attrs[j].value) {
            proxy = attrs[j].value.match(PATTERN.proxy);
            if (!!proxy) {
              proxy = proxy[1];
              if (PATTERN.expressioncombo.test(proxy)) {
                // this is a parenthetical, e/g combineString:(foo,bar)
                combo = proxy.match(PATTERN.expressioncombo);
                transform = combo[1].match(PATTERN.expression);
                transform = transform[1].split(PATTERN.expressionsplit).filter(function(exp){ return !!exp; }).reverse()
                proxy = combo[2].replace(/[()]/g,"").split(/,\s*/);
                alternates = [];
              } else {
                alternates = proxy.split(PATTERN.orsplit);
                transform = proxy.match(PATTERN.expression);
                if (!!transform) {
                  proxy = transform[2];
                  alternates = proxy.split(PATTERN.orsplit);
                  transform = transform[1].split(PATTERN.expressionsplit).reverse();
                }
              }
              if (!!proxy) {
                if (alternates.length > 1) {
                  proxy = alternates.filter(function (alt, k, arr) {
                    if (PATTERN.address.test(alt)) {
                      return alt;
                    } else if (alt in datum) {
                      return alt;
                    } else if (k == arr.length-1 && PATTERN.endquotes.test(alt)) {
                      return alt;
                    } else if (new RegExp(alt).test(Object.values(TOKEN))) {
                      return alt;
                    } else {
                      return false;
                    }
                  })[0];
                }
                if (!!combo && Array.isArray(proxy)) {
                  // this is a parenthetical, e/g combineString:(foo,bar)
                  value = [];
                  proxy.forEach(function (clause) {
                    var v
                      = PATTERN.endquotes.test(clause) ? clause.replace(PATTERN.endquotes, "")
                      : clause === TOKEN.index ? i
                      : clause === TOKEN.key ? key
                      : clause === TOKEN.value ? (key !== void(0) ? datum[key] : datum)
                      : clause in datum ? datum[clause]
                      : PATTERN.address.test(clause) ? parseObjectNotation(datum, clause)
                      : "";
                    value.push(v);
                  });
                } else {
                  value
                    = PATTERN.endquotes.test(proxy) ? proxy.replace(PATTERN.endquotes, "")
                    : proxy === TOKEN.index ? i
                    : proxy === TOKEN.key ? key
                    : proxy === TOKEN.value ? (key !== void(0) ? datum[key] : datum)
                    : proxy in datum ? datum[proxy]
                    : PATTERN.address.test(proxy) ? parseObjectNotation(datum, proxy)
                    : "";
                }
                if (!!transform && transform.length > 0) {
                  modify = transform.filter(function (exp) { return exp in MODIFIER; });
                  transform = transform.filter(function (exp) { return exp in TRANSFORMER; });
                  transform.forEach(function (exp) {
                    value = TRANSFORMER[exp](value, i);
                  });
                  if (modify.indexOf(MODIFIER.boolean) > -1) {
                    booleans.push({ name: attrs[j].name, able: !PATTERN.falsey.test(value) });
                  } else {
                    if (modify.indexOf(MODIFIER.concat) > -1) {
                      value = attrs[j].value.replace(PATTERN.proxy, value);
                    }
                    attrs[j].value = value;
                  }
                } else {
                  attrs[j].value = value;
                }
              }
            }
          }
        }
        booleans.forEach(function (attribute) {
          node.removeAttribute(attribute.name);
          if (attribute.able) {
            node.setAttribute(attribute.name, attribute.name);
          }
        });
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
        traverse(clone, traverseImpl(obj, i, key));
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

      traverse(clone, traverseImpl(datum, i));
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

      traverse(clone, traverseImpl(datum, i) );
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

  return {

    /* PUBLIC API */

    init: function(config) {
      if (arguments.length > 0 && Object(config) === config) {
        if ("strictStandard" in config) {
          strictStandard = !!config.strictStandard;
        }
        if ("showHeritage" in config) {
          strictStandard = !!config.showHeritage;
        }
        if ("stripByteOrderMark" in config) {
          stripByteOrderMark = !!config.stripByteOrderMark;
        }
      }
      return this;
    },

    /**
     * setTransformer adds a run-time tranformer to prototype's collection.
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
    setTransformer: function (name, func) {
      if (name in TRANSFORMER) {
        return false;
      } else if (!(func instanceof Function)) {
        return false;
      } else {
        TRANSFORMER[name] = func;
        return true;
      }
    },

    /**
     * render executes templated markup (embedded or cloned) according to a data set.
     *
     * @public
     * @param {HTMLElement} ele The outermost DOM Element to consider for template.
     * @param {Array|Object} data The data to be consumed for populating template.
     */
    render: function (ele, data) {
      var template = findTemplate(ele);
      if (!!template) {
        if (Array.isArray(data)) {
          element = template;
          source = data;
          if (typeof data[0] === "object") {
            renderCollection(template, data);
          } else {
            renderArray(template, data);
          }
        } else if (typeof data === "object") {
          element = template;
          source = data;
          renderObject(template, data);
        }
      }
    },

    /**
     * refresh re-executes previously templated markup (embedded or cloned) without deep traversal.
     * TODO: Coalesce with normal render.
     *
     * @public
     * @param {HTMLElement} ele The outermost DOM Element to consider for template.
     * @param {Array|Object} data The data to be consumed for populating template.
     */
    refresh: function (ele, data) {
      renderNestedTemplate(ele, data);
    },

    /**
     * clear removes the dynamically-populated elements of a rendered template.
     *
     * @public
     * @param {HTMLElement} ele (optional) The Element to clear (or instance's reserved "element").
     * @param {Function} callback (optional) The code to execute following this process.
     * @returns {Function|null} Will execute callback or null if template not valid.
     */
    clear: function (ele, callback) {

      var target = ele || element;

      if (isTemplate(target)) {
        clear(target, callback);
      } else if (!!callback && callback instanceof Function) {
        callback(null);
      } else {
        return null;
      }
    },
    
    getSetShowHeritage: function (boo) {
      /**
       * @param boo {Boolean} When true the obj.hasOwnProperty() is not enforced.
       * @returns {Boolean} The current setting.
       */
      if (arguments.length > 0) {
        showHeritage = !!boo;
      }

      return showHeritage;
    },
    
    getSetStrictStandard: function (boo) {
      /**
       * @param boo {Boolean} When true Microdata attributes are always required.
       * @returns {Boolean} The current setting.
       */
      if (arguments.length > 0) {
        strictStandard = !!boo;
      }

      return showHeritage;
    },

    getSetStripByteOrderMark: function (boo) {
      /**
       * @param boo {Boolean} When true, strips Byte Order Mark from incoming HTML snippets.
       * @returns {Boolean} The current setting.
       */
      if (arguments.length > 0) {
        stripByteOrderMark = !!boo;
      }

      return showHeritage;
    },

    getSetSource: function (obj) {

      if (arguments.length > 0) {
        source = obj;
      }

      return source;
    },

    getElement: function () {
      return element;
    },

    getTransformers: function () {
      return TRANSFORMER;
    },

    getVersion: function () {
      return version;
    }
  };
})));