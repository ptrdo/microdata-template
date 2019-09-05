import Templater from "../../../lib/microdata-template.js";
import data from "../../data/collection.json";

class Example {

  constructor() {
    console.log("The Example module has been constructed!");
  };

  render(rootElement) {
    let template = rootElement.querySelector("tr[itemscope]");
    try {
      Templater.render(template, data["StatePopulations"]);
    } catch (error) {
      console.error("Example could not render!", error);
    }
    document.querySelector("input[value=empty]")
    .addEventListener("click", function (event) {
      event.preventDefault();
      Templater.clear(template);
    });
    document.querySelector("input[value=fill]")
    .addEventListener("click", function (event) {
      event.preventDefault();
      Templater.render(template, data["StatePopulations"]);
    });
  };
}

export default Example;