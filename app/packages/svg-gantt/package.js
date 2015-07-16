Package.describe({
    name: 'fac:svg-gantt',
    version: '0.0.1',
    summary: 'A meteor package to provide gantt chart based on SVG technology',
    git: 'https://github.com/future-analytics/meteor-svg-gantt/',
    documentation: 'README.md'
});

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

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('fac:svg-gantt');
  api.addFiles('svg-gantt-tests.js');
});
