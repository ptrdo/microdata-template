###### This is released software. Please **[log issues](https://github.com/ptrdo/microdata-template/issues)** found. 
# microdata-template `v2.2.2`
An implementation of HTML template by way of the microdata mechanism.
### The Gist  
This JavaScript module should simplify adding dynamic content to HTML documents while staying true to the recommendations of web standards. There are no dependencies here except the JavaScript [ECMA5 standard](http://www.ecma-international.org/ecma-262/5.1/) which enjoys [nearly universal support](http://kangax.github.io/compat-table/es5/) in modern browsers. Also, since the HTML recommendations for integral technologies such as [template](https://www.w3.org/TR/html52/semantics-scripting.html#the-template-element) and [microdata](https://www.w3.org/TR/microdata/) are variably implemented by modern browsers, this module serves as a [polyfill](https://en.wikipedia.org/wiki/Polyfill) to assure reliable results. Best of all, this methodology encourages the writing of low-dependency JavaScript and perfectly valid HTML &mdash; even within fully-functional templated markup.

***
### Simple Usage
**1:** In the HTML document, simply load the module and instantiate when ready: 
```html
<script src="./lib/microdata-template.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function() {
    var templater = window.MicrodataTemplate.init();
    console.log("MicrodataTemplate!", templater.getVersion());
  });
</script>
```

**2:** Write some HTML with a template element (any node designated with both the `hidden` and `itemscope` attributes): 
```html
<nav>
  <menu id="example">
    <li hidden itemscope>
      <a itemprop="url" href="{{ Url }}">
        <span itemprop="name">{{ Name }}</span>
      </a>
    </li>
  </menu>
</nav>
```

**3:** In JavaScript, create a corresponding set of data and then render it (note that the designated element can be an outer scope): 
```javascript
var data = [{ 
    "Name": "Home", 
    "Url": "/home"
  }, {
    "Name": "About", 
    "Url": "/about"
}];

var templater = window.MicrodataTemplate.init();
    templater.render(document.getElementById("example"), data); 
```

**4:** The resulting HTML will look like this (the template source persists for future use but remains hidden): 
```html
<nav>
  <menu>
    <li hidden itemscope>
      <a itemprop="url" href="{{ Url }}">
        <span itemprop="name">{{ Name }}</span>
      </a>
    </li>
    <li itemscope>
      <a itemprop="url" href="/home"><span itemprop="name">Home</span></a>
    </li>
    <li itemscope>
      <a itemprop="url" href="/about"><span itemprop="name">About</span></a>
    </li>
  </menu>
</nav>
```

**Note:** The example above is simplified for clarity, but more compliant microdata could look like this: 
```html
<nav>
  <menu itemscope itemtype="http://schema.org/BreadcrumbList">
    <li hidden itemscope itemprop="itemListElement" itemtype="http://schema.org/ListItem">
      <a itemprop="url" href="{{ Url }}">
        <span itemprop="name">{{ Name }}</span>
      </a>
    </li>
  </menu>
</nav>
```

***
### Advanced Usage
This module is organized to be attached to an HTML document as a simple external script (see: [Simple Usage](#simple-usage)), but also in a project governed by [Asynchronous Module Definition](https://en.wikipedia.org/wiki/Asynchronous_module_definition) (AMD) with a library such as [RequireJS](https://github.com/requirejs/requirejs), or an [ES6-compliant](http://es6-features.org/) project bundled by a library such as [Webpack](https://webpack.js.org/). The expectations are the same, but the syntax used to load, instantiate, and then address the module may be slightly different depending on circumstance.

**Old-fashioned AMD (RequireJS) Implementation:**
```javascript
require.config({
  paths: {
    text: "./node_modules/requirejs-text/text",
    json: "./node_modules/requirejs-json/json",
  }
});
define(
[
  "./path/to/microdata-template.js",
  "json!./path/to/collection.json"
],
function(templater, collection) {
  
  var render = function(rootElement) {
    var templateElement = rootElement.querySelector("TR[itemscope]");
    templater.render(templateElement, collection);
  }
});
```
**New-fangled ES6 Module Implementation:**
```javascript
import templater from "./path/to/microdata-template.js";
import collection from "./path/to/data/collection.json";

class Example {
  
  render(rootElement=document) {
    let templateElement = rootElement.querySelector("TR[itemscope]");
    templater.render(templateElement, collection);
  };
}

export default Example;
```

***
### The Reasoning
When displaying information in an HTML page, it sometimes makes sense for a script to loop over a set of data to extract its values and embed them into a repeatable pattern of markup. This sort of routine is what can easily populate the many rows and columns of a complex `<table>` of data, but is also convenient for rendering more pedestrian page elements like `<menu>` and `<select><option>` lists. Of course, this is nothing new and many JavaScript frameworks and libraries provide for exactly this sort of routine as core to their technology, but standard HTML provides for this as well with the `<template>` element. Even more, HTML has long-supported a special set of [microdata](https://www.w3.org/TR/microdata/) attributes designed to make such rendered information more comprehensible to the machine-reading done by search engine crawlers and the like. 

The [HTML5 Recommendations](https://www.w3.org/TR/html52/semantics-scripting.html#the-template-element) designate the `<template>` element as a hidden node containing some fragment of markup. That markup is intended as the source structure for a script to clone and then customize and deposit elsewhere in the HTML document. An advantage of this technology is that HTML structures can be plainly constructed in manifest markup rather than assembled on-the-fly from within the logic of a script. This can be especially advantagous when the resulting assembly is deep or elaborate. The Mozilla Developer's Network has a concise explanation of [how to employ the standard template element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).

**Unfortunately**, even though the `<template>` element is a specified recommendation of HTML5, it is not fully supported in all popular browsers (as of this writing), so certain accommodations must be made, especially to assure that the browser recognizes `template` as a valid node name and that its content should not be rendered by default. These accommodations can be made quite simply by declaring an appropriate namespace in the HTML and CSS documents (at least `http://www.w3.org/1999/xhtml`), and by also declaring the CSS rule: `template { display: none; }`. Alternatively, the [hidden attribute](http://caniuse.com/#search=hidden) can be added for super-duper assurance in most every browser: `<template hidden></template>`.  

**Regardless**, even when the `<template>` is used as intended, and even if the browser supports it, a considerable amount of scripted logic can be required to traverse the cloned structure and locate particular nodes of a certain heirarchy into which specific data should be deposited in a certain way. Essentially, the JavaScript must have an awareness of the templated markup, and what this means is that every change in markup structure necessitates a corresponding adjustment to the scripted routine. A solution for this is to prescribe *tokens* within the templated markup that the script can leverage as identity and location for which variable value to insert and where. This is the solution provided by popular templating libraries like [Mustache](https://mustache.github.io/), [Handlebars](http://handlebarsjs.com/), and [WebComponents](http://webcomponents.org/articles/introduction-to-template-element/).

**However**, even though those libraries are awesome and have many useful features, using them can necessitate some departure from the true intent of the `<template>` methodology, lull the markup away from validity, and require JavaScript that adheres to somewhat esoteric methodology. Seemingly, the `<template>` specification has fallen so short of what HTML developers want and need that every JavaScript framework and library fills the void by employing its own ideas for what templating ought to be and then offers that as a core selling point. Which to choose? Maybe just the HTML standard. 

***
### The Template 
The element targeted as a template does not need to be a `<template>` node. In fact, it is recommended that the targeted element be any standard HTML node with a parent designed to contain the repeated siblings of the templated element. An obvious example would be an `<li>` node targeted as a template to dynamically populate the parent `<ul>` list, but it could also be table cells within a table row, table rows within a table body, paragraphs within a section, or just about anything inside anything.

Furthermore, the targeted element should be positioned within the DOM wherever it belongs on the page and within the markup. The targeted element will never be visible, only the repeated clones populated by the data.

When authoring HTML markup for rendering by microdata-template, the templating element must have a `hidden` attribute PLUS a microdata attribute such as `itemscope`, `itemprop`, and/or `itemid`. It is valid to add these to any HTML element. Other attributes of the [microdata specification](https://www.w3.org/TR/microdata/) can be employed, but are not required. Therefore:

```html
<ul id="months" itemscope>
  <li itemprop="month" hidden>{{ monthName }}</li>
</ul>
```
Per this example (above), the code will replicate the element with the `itemprop hidden` attributes, removing those two attributes from each clone (therefore making them visible). If it is more convenient to address the parent element (for instance, if the parent has a readily available `id` attribute), the parent can be passed to the `render(ele,data)` method, which then finds the first valid templatable element to render. Therefore, per the markup above: 
```javascript
import templater from "./path/to/microdata-template.js";

let itemToReplicate = document.querySelector("[itemprop][hidden]"); // the template
let parentOfClones = document.getElementById("months"); // the parent of the template works when strictStandards: true;

templater.render(itemToReplicate||parentOfClones, myData); // either works when strictStandards: true;
```

>**NOTE:** The [microdata specification](https://www.w3.org/TR/microdata/) requires an element with an `itemscope` attribute to also have either an `itemref` or `itemtype` attribute, but this rule is not enforced here. 

***
### The Handlebars 
The HTML markup should be valid, and within each element targeted as a template, the microdata-template will recognize a double-set of curly braces (aka *handlebars*) as enclosing a key, index, or token which corresponds to the data being iterated over. There must be a space between these handlebars and the variable inside. For example, `{{ thisWorks }}` but `{{thisDoesNot}}`. 

By default, the handlebars expect to populate the entire contents of an HTML node, `<span>{{ phrase }}</span>` or attribute value, `<ul itemid="{{ guid }}">`. However, the handlebars can be embedded within content with a special *concat* modifier, `<span>It is now {{ concat:hour }} o'clock</span>`. See more about [modifiers](#the-modifiers) below.

***
### The Tokens
The term appearing inside the handlebars (aka *token*) will refer to the data at that iteration. When iterating over an array, this can be an index value (e/g `{{ 0 }}` would insert the first item found in the array), or when iterating over a collection of objects, the token can be a key that contains the value to deposit into the markup. There are also reserved terms to deposit the abstract, `INDEX`, `KEY`, `VALUE`. Values not found will render an empty string. 

Given the following data: 
```javascript
const data = [
  { party: "Republican", candidate: "Ellie Elephant", color: "red" },
  { party: "Democrat", candidate: "Dora Donkey", color: "cornflowerblue" }
];
```
And the following template: 
```html
<table>
  <tr bgcolor="{{ color }}" itemscope hidden>
    <td><input type="radio" name="vote" value="{{ INDEX }}"/></td>
    <td>{{ candidate }}</td>
    <td>{{ party }}</td>
  </tr>
</table>
```
The resulting markup would be: 
```html
<table>
  <tr bgcolor="{{ color }}" itemscope hidden>
    <td><input type="radio" name="vote" value="{{ INDEX }}"/></td>
    <td>{{ candidate }}</td>
    <td>{{ party }}</td>
  </tr>
  <tr bgcolor="red">
    <td><input type="radio" name="vote" value="0"/></td>
    <td>Ellie Elephant</td>
    <td>Republican</td>
  </tr>
  <tr bgcolor="cornflowerblue">
    <td><input type="radio" name="vote" value="1"/></td>
    <td>Dora Donkey</td>
    <td>Democrat</td>
  </tr>
</table>
```

**OR Alternatives:** If it is not certain that a token will resolve or exist, alternatives can be supplied, separated by a pipe `|` character. These will by tried from left-to-right until a key resolves. If none resolve, then an empty string results. Or, if a string is provided as the final alternative, it will be inserted. **NOTE:** OR Alternatives will *not* work within a [combineString transformer](#transformers).
```html
<samp>{{ tryThis|thenThis|"Default text" }}</samp>
```

**OBJECT Notation:** Tokens can be JavaScript-compliant Object dot.notation or braced[addressing]. These can be used exactly as a simple token would be used, including in OR Alternatives.
```html
<samp>{{ tryThis.value|thenThis[value]|"Not Found!" }}</samp>
```

***
### The Modifiers
By default, the value inserted for a token will be applied as the nodeValue of the tag or the literal value of the attribute. However, there are instances when the insertion should be treated differently. Modifiers are reserved keywords that can precede a token to prescribe special treatment. 

| Modifer | Usage | Description |
|----------|-----------|---------|
| html | `{{ html:token }}` |  Insert value with innerHTML rather than nodeValue (e.g. escaped content, unicodes, html entities). |
| concat | `{{ concat:token }}` | Concatenates value in-context to any adjacent content within the targeted attribute or node. |
| forin | `{{ forin:token }}` | Iterates over every property found in the assumed object. See the [object](/example/simple-javascript/object.html) example. |
| boolean | `{{ boolean:token }}` | Inserts boolean per resolved truthiness of value (e.g. *checked="false"*, *disabled="true"*, *class="true"*). |

Modifiers can be applied on top of Transformers: 
```html
<samp>The national debt is ${{ concat:toLocaleString:debt }}.</samp>
```
***
### Transformers
Transformers allow for modification of a value prior to insertion into the targeted location. This allows for performing logic on the data without embedding logic into the markup. The transformer function receive two arguments: the value and the index of the current iteration.

| Transformer | Usage | Description |
|----------|-----------|---------|
| join | `{{ join:token }}` |  Inserts comma-delineated string concatenating an assumed array of values. |
| toLocaleString | `{{ toLocaleString:token }}` |  Inserts commas into large numbers (e.g. 1234567.890 becomes 1,234,567.89). |
| parseDateToTimeValue | `{{ parseDateToTimeValue:token }}` |  Inserts a time value parsed from an assumed standard date string. |
| toMebibytes | `{{ toMebibytes:token }}` |  Converts bytes to mebibytes. (e.g. 1048576 becomes "1.00"). |
| exists | `{{ exists:token }}` |  Inserts `true` or `false` if value exists (e.g. as a CSS class name to denote visibility). |
| absent | `{{ absent:token }}` |  Inserts `true` or `false` if value does not exist (the obverse of `exists`). |
| combineString | `{{ combineString:('foo',token1,'bar',token2,…) }}` | Combines arbitrary strings and/or token values (e.g. to construct an URL). See the [transformer](/example/simple-javascript/transformer.html) example.  |

At runtime, custom transformers can be supplied to the microdata-template instance for immediate use within templated markup: 
```javascript
import templater from "./path/to/microdata-template.js";

templater.setTransformer("formatDate", function(value, index) {
  var time = Date.parse(value);
  var date = new Date(isNaN(time) ? isNaN(value) ? Date.now() : value : time);
  return date.toLocaleString();
});

// then: <samp>{{ formatDate:myData.creationDate }}</samp>
```

***
### Public API
Once instantiated in the web client code, the microdata-template can be addressed via a variety of public methods, getters, and setters. These methods can be addressed within the scope of the instantiation, or via the browser's JavaScript console.
```javascript
// In pre-ES6 implementations, the code is exposed to the global namespace: 
var templater = window.MicrodataTemplate.init();
templater.getVerson(); // returns current version, e.g. "2.3.0"

// In ES6 implementations, the import code does not require init() 
import templater from "./path/to/microdata-template.js";
templater.getVersion(); // returns current version, e.g. "2.3.0"

// Defaults are assumed, but configuration can be passed to init: 
templater.init({
  showHeritage: true, // bypass obj.hasOwnProperty() filtering.
  strictStandard: true, // require Microdata attributes.
  stripByteOrderMark: false // leave HTML unperturbed.
});
```

| Method Name | Argument(s) | Description                                                               |
|-------------|-------------|---------------------------------------------------------------------------|
| `init` | *Object (optional)* | Returns an instance of the microdata-template. Config object is optional. |
| `render` | *element, data* | Populates the HTML element template with data.                            |
| `clear` | *element, callback* | Removes dynamically populated content, retaining the original template.   |
| `refresh` | *element, data* | Makes current a previously rendered template.                             |
| `getSetShowHeritage` | *Boolean* | False by default. When true, bypasses obj.hasOwnProperty() filtering.     |
| `getSetStrictStandard` | *Boolean* | False by default. When true, Microdata attributes are always required.    |
| `getSetStripByteOrderMark` | *Boolean* | True by default. When true, strips Byte Order Mark from incoming HTML snippets.     |
| `setTransformer` | *name, func* | Provides for a custom transformer.                                        | 
| `getTransformers` | *none* | Returns default and custom transformers.                                  |
| `getVersion` | *none* | Returns the current version.                                              | 