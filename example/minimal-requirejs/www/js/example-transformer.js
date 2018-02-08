define(
[
  "templater",
  "json!../../../data/transformer.json"
],
function (templater, json) {
  return function() {

    var rootElement,
        templateElement;

    var render = function () {

      templater.setTransformer("formatDate", function(value, index) {
        var time = Date.parse(value);
        var date = new Date(isNaN(time) ? isNaN(value) ? Date.now() : value : time);
        return date.toLocaleString();
      });

      if (!!templateElement && !!json) {
        templater.render(templateElement, json);
      }
    };

    return {
      load: function (info) {
        if (!!info && "rootElement" in info) {
          rootElement = info.rootElement;
          templateElement = rootElement.querySelector("BLOCKQUOTE[itemscope]");
          render();
        }
      },
      unload: function () {
        try {
          templater.clear(templateElement);
          templateElement = null;
          rootElement = null;
        } catch (error) {
          console.error("Example could not be destroyed!", error);
        }
      }
    }
  };
});