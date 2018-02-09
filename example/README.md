###### This is released software. Please **[log issues](https://github.com/ptrdo/microdata-template/issues)** found. 
# Examples of microdata-template
These samples demonstrate implementations of the microdata-template utility for rendering a variety of data to an HTML page. Clone this project and then follow the instructions (below) which are most-appropriate for application.

*** 
### simple-javascript
This example includes HTML documents which can be run directly in a web browser. A web server (or localhost) is recommended for demonstrating complete functionality in real-world circumstance, but is not required. All links are relative, including to the data sources and the microdata-template library.

***
### minimal-requirejs
This example demonstrates integration into a minimal [Asynchronous Module Definition](https://en.wikipedia.org/wiki/Asynchronous_module_definition) (AMD) project governed by the [RequireJS](https://github.com/requirejs/requirejs) library. An enclosed `package.json` designates all dependencies required for running the demonstration. 

[Yarn](https://yarnpkg.com/) is an excellent choice for managing packages for web clients and can be [installed a variety of ways](https://yarnpkg.com/en/docs/install). Alternatively, the Node Package Manager ([NPM](https://www.npmjs.com/get-npm)) can also be used.

**1:** From a command prompt, navigate to the project path where the clone of this repository is installed, and then the path where the relevant `package.json` file exists.
```sh
> cd C:\path\to\microdata-template\example\minimal-requirejs
```
**2:** From a command prompt, run the Yarn `install` command to get the dependencies as prescribed in the `package.json` file. This will create a path local to this example `\node_modules` for deposit of the downloaded code. 
```sh
> yarn install
```
**3:** The file to run is `\minimal-requirejs\www\index.html`. A `localhost` or other webserver will be required for the page to import all runtime components and then render without error. One convenient means is use an Integrated Development Environment (IDE) such as JetBrain's [WebStorm](https://www.jetbrains.com/webstorm/) or [IntelliJ](https://www.jetbrains.com/idea/) which can open these files for review and edit and then run them in its internal webserver. 

***
### minimal-webpack
This example demonstrates integration into a minimal [ES6-compliant](http://es6-features.org/) project bundled by the [Webpack](https://webpack.js.org/) library. An enclosed `package.json` designates all dependencies required for running the demonstration.

[NodeJS](https://nodejs.org/en/download/) is a technology which can execute scripts on a computer. In this application, NodeJS fasciliates the Webpack framework in assembling the various ingredients of the Client code, preparing them for deployment to a browser. It will be necessary to install NodeJS to run these examples. 

The Node Package Manager ([NPM](https://www.npmjs.com/get-npm)) is installed as a component of NodeJS and is a popular means for executing the `package.json` of a project.

**1:** From a command prompt, navigate to the project path where the clone of this repository is installed, and then the path where the relevant `package.json` file exists.
```sh
> cd C:\path\to\microdata-template\example\minimal-webpack
```
**2:** From a command prompt, run the NPM `install` command to get the dependencies as prescribed in the `package.json` file. This will create a path local to this example `\node_modules` for deposit of the downloaded code. 
```sh
> npm install
```
**3:** From a command prompt, run the NPM `start` command which has been configured in the `webpack.config.js` to instruct Webpack to survey the dependencies prescribed in the project code and then compile the bundled JavaScript.  
```sh
> npm start
```
**4:** Open a browser and navigate to `http://localhost:8080` to view the deployed code. Note: If this does not work, there may be a conflict with other processes, so th `8080` port can be changed by [configuring the devServer](https://webpack.js.org/configuration/dev-server/).