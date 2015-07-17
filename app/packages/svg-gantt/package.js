//package details
Package.describe({
    name: 'fac:svg-gantt',
    version: '0.0.1',
    summary: 'A meteor package to provide gantt chart based on SVG technology. Original project: https://github.com/robicch/jQueryGantt ',
    git: 'https://github.com/future-analytics/meteor-svg-gantt/',
    documentation: 'README.md'
});
//end package details


//load npm dependencies
Npm.depends({
    //"connect": "2.13.0"                                                       //to use connect in code `var npmConnect = Npm.require('connect')`
});
//end load npm dependencies


//load cordova dependencies
Cordova.depends({});


//package build / make routine
//Package.registerBuildPlugin();                                                //for compiling, ie converting coffeescript into javascript etc


//package bootloader onUse
Package.onUse(function(api){
    api.versionsFrom('1.1.0.2');

    //dependencies
    api.use(["templating", "underscore"]);
    api.use(["iron:router@1.0.7"], 'client', {weak: false, unordered: false});
    api.use(["themeteorchef:controller@1.2.0"], 'client');

    //used to export a dependencies symbols to the client/server
    //api.imply()

    // Loading files on both the client and the server.
    api.addFiles([
        "lib/collections/food-groups.js"                                        //declare collection (declared before use below)
    ], ['client', 'server']);

    // Loading files on the server only.
    api.addFiles([
        "lib/publications/food-groups.js",                                      //publish collection
        "lib/startup.js"                                                        //server startup script (insert default data if needed)
    ], ['server']);

    // Loading files on the client only.
    api.addFiles([
        "lib/modules/grindage.js",
        "lib/stylesheets/grindage.css",
        "lib/templates/grindage.html",
        "lib/controllers/grindage.js",
        "lib/routes/routes.js"
    ], ['client']);

    //export globals from files above
    api.export("Grindage", 'client');
    api.export("FoodGroups", ['client', 'server']);
});
//end package bootloader onUse


//package unit tests
Package.onTest(function (api) {

    //load packages for test environment (inc this one)
    api.use([
        "tinytest",                                                             //unittest suite
        "fac:svg-gantt"                                                         //package to test
    ], ['client', 'server']);

    //files to run for tests and their destined architecture
    api.addFiles("tests/client/client-tests.js", "client");                     //load test case files (client)
    api.addFiles("tests/server/server-tests.js", "server");                     //load test case files (server)
});
//end package unit tests
