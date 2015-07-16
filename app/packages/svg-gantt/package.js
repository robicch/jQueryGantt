Package.describe({
    name: 'fac:svg-gantt',
    version: '0.0.1',
    summary: 'A meteor package to provide gantt chart based on SVG technology',
    git: 'https://github.com/future-analytics/meteor-svg-gantt/',
    documentation: 'README.md'
});

Package.onUse(function(api){
    api.versionsFrom('1.1.0.2');

    api.use(["templating", "underscore"]);
    api.use(["iron:router@1.0.7"], 'client', {weak: false, unordered: false});
    api.use(["themeteorchef:controller@1.2.0"], 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('fac:svg-gantt');
  api.addFiles('svg-gantt-tests.js');
});
