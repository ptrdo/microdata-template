require.config({
  waitSeconds: 0,
  paths: {
    text: "../../node_modules/requirejs-text/text",
    json: "../../node_modules/requirejs-json/json",
    templater: "../../../../lib/microdata-template",
    exampleModule: "example-transformer"
  },
  shim: {
    exampleModule: {
      deps: ["templater"]
    }
  }
});
define(
[
  "exampleModule"
],
function (ExampleModule) {

   var element,
       currentModule;

   var init = function() {

     element = document.getElementById("app");
     currentModule = new ExampleModule()
     currentModule.load({ rootElement: element });

   };

  try {
    if ("jQuery" in window && !!$) {
      $(document).ready(init);

    } else if (window.hasOwnProperty("addEventListener")) {
      window.addEventListener("DOMContentLoaded", init, false);

    } else if (window.hasOwnProperty("attachEvent")) {
      window.attachEvent("onload", init);

    } else {
      init();
    }
  } catch (error) {
    console.error("error: " + error.status)
  }
});