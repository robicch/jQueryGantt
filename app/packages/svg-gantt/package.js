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
    api.use(["templating", "underscore", "sergeyt:livequery"]);
    //api.use(["iron:router@1.0.7"], 'client', {weak: false, unordered: false});
    //api.use(["themeteorchef:controller@1.2.0"], 'client');

    //used to export a dependencies symbols to the client/server
    //api.imply()

    // Loading files on both the client and the server.
    /*
    api.addFiles([
        "lib/collections/food-groups.js"                                        //declare collection (declared before use below)
    ], ['client', 'server']);
    */

    // Loading files on the server only.
    /*
    api.addFiles([
        "lib/publications/food-groups.js",                                      //publish collection
        "lib/startup.js"                                                        //server startup script (insert default data if needed)
    ], ['server']);
    **/

    // Loading files on the client only.
    api.addFiles([
        "lib/stylesheets/gantt.css",                                            // lib/stylesheets
        "lib/stylesheets/ganttPrint.css",
        "lib/stylesheets/platform.css",
        "lib/stylesheets/teamworkFont.css",

        "vendor/jquery.1.8.js",
        "vendor/JST/jquery.JST.js",
        "vendor/jquery.livequery.min.js",
        "vendor/dateField/images/next.png",                                     // vendor
        "vendor/dateField/images/prev.png",
        "vendor/dateField/jquery.dateField.css",
        "vendor/dateField/jquery.dateField.js",
        "vendor/date.js",
        "vendor/i18nJs.js",
        "vendor/jquery.svgdom.1.8.js",
        "vendor/jquery.svgdom.js",
        "vendor/jquery.svgdom.pack.js",
        "vendor/jquery.svg.js",
        "vendor/jquery.svg.min.js",
        "vendor/jquery.timers.js",
        "vendor/platform.js",

        "lib/ganttDrawer.js",                                                   // scripts
        "lib/ganttDrawerSVG.js",
        "lib/ganttGridEditor.js",
        "lib/ganttMaster.js",
        "lib/ganttTask.js",
        "lib/ganttUtilities.js",
        "lib/startup.js",

        "lib/templates/gantt.html",                                                 // templates

    ], ['client']);

    //export globals from files above
    api.export([
        "GridEditor",
        "GanttMaster",
        "JST"
        ], 'client');
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
