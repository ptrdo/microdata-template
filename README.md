#### This is pre-release software. Use at your own risk. 
# microdata-template
An implementation of HTML template by way of the microdata mechanism.
### The Gist  
This JavaScript module should simplify adding dynamic content to HTML documents while staying true to the recommendations of web standards. There are no dependencies here except the JavaScript [ECMA5 standard](http://www.ecma-international.org/ecma-262/5.1/) which enjoys [nearly universal support](http://kangax.github.io/compat-table/es5/) in modern browsers. Also, since the HTML recommendations for integral technologies such as [template](https://www.w3.org/TR/html5/scripting-1.html#the-template-element) and [microdata](https://www.w3.org/TR/microdata/) are variably implemented by modern browsers, this module serves as a [polyfill](https://en.wikipedia.org/wiki/Polyfill) to assure reliable results. Best of all, this methodology encourages the writing of low-dependency JavaScript and perfectly valid HTML &mdash; even within fully-functional templated markup. 
### Simple Usage
**1:** In the HTML document, simply load the module and instantiate when ready: 
```html
<script src="./lib/microdata-template.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function() {
    var templater = new MicrodataTemplate();
  });
</script>
```

**2:** Write some HTML with a template element (or any node designated with both the `hidden` and `itemscope` attributes): 
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

var templater = new MicrodataTemplate();
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
### Advanced Usage
Alternatively, the module can be assigned to a discrete namespace: 
```html
<script>
  this.PTRDO = { utils: {} };
  this.exports = PTRDO.utils;
</script>
<script src="./lib/microdata-template.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function() {
    var templater = new PTRDO.utils.MicrodataTemplate();
  });
</script>
```


### The Whole Spiel
When displaying information in an HTML page, it sometimes makes sense for a script to loop over a set of data to extract its values and embed them into a repeatable pattern of markup. This sort of routine is what can easily populate the many rows and columns of a complex `<table>` of data, but is also convenient for rendering more pedestrian page elements like `<menu>` and `<select><option>` lists. Of course, this is nothing new and many JavaScript frameworks and libraries provide for exactly this sort of routine as core to their technology, but standard HTML provides for this as well with the `<template>` element. Even more, HTML has long-supported a special set of [microdata](https://www.w3.org/TR/microdata/) attributes designed to make such rendered information more comprehensible to the machine-reading done by search engine crawlers and the like. 

The [HTML5 Recommendations](https://www.w3.org/TR/html5/scripting-1.html#the-template-element) designate the `<template>` element as a hidden node containing some fragment of markup. That markup is intended as the source structure for a script to clone and then customize and deposit elsewhere in the HTML document. An advantage of this technology is that HTML structures can be plainly constructed in manifest markup rather than assembled on-the-fly from within the logic of a script. This can be especially advantagous when the resulting assembly is deep or elaborate. WebPlatform.org has a concise explanation of [how to employ the standard template element](https://docs.webplatform.org/wiki/html/elements/template).

**Unfortunately**, even though the `<template>` element is a specified recommendation of HTML5, it is not fully supported in all popular browsers (as of this writing), so certain accommodations must be made, especially to assure that the browser recognizes `template` as a valid node name and that its content should not be rendered by default. These accommodations can be made quite simply by declaring an appropriate namespace in the HTML and CSS documents (at least `http://www.w3.org/1999/xhtml`), and by also declaring the CSS rule: `template { display: none; }`. Alternatively, the [hidden attribute](http://caniuse.com/#search=hidden) can be added for super-duper assurance in most every browser: `<template hidden></template>`.  

**Regardless**, even when the `<template>` is used as intended, and even if the browser supports it, a considerable amount of scripted logic can be required to traverse the cloned structure and locate particular nodes of a certain heirarchy into which specific data should be deposited in a certain way. Essentially, the JavaScript must have an awareness of the templated markup, and what this means is that every change in markup structure necessitates a corresponding adjustment to the scripted routine. A solution for this is to prescribe *tokens* within the templated markup that the script can leverage as identity and location for which variable value to insert and where. This is the solution provided by popular templating libraries like [Mustache](https://mustache.github.io/), [Handlebars](http://handlebarsjs.com/), and [WebComponents](http://webcomponents.org/articles/introduction-to-template-element/).

**However**, even though those libraries are awesome and have many useful features, using them can necessitate some departure from the true intent of the `<template>` methodology, lull the markup away from validity, and require JavaScript that adheres to somewhat esoteric methodology. Seemingly, the `<template>` specification has fallen so short of what HTML developers want and need that every JavaScript framework and library fills the void by employing its own ideas for what templating ought to be and then offers that as a core selling point. Which to choose? 
