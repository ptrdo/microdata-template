import Example from "./example.js";

let example = new Example();
let element;

document.addEventListener("DOMContentLoaded", function(event) {
  element = document.getElementById("app");
  example.render(element);
});