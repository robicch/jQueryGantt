Package.describe({
    name: 'fac:svg-gantt',
    version: '0.0.1',
    summary: 'A meteor package to provide gantt chart based on SVG technology',
    git: 'https://github.com/future-analytics/meteor-svg-gantt/',
    documentation: 'README.md'
});

Package.on_use(function(api){
    api.versionsFrom('1.1.0.2');
    api.addFiles('svg-gantt.js');

    api.use("templating", "client");
    api.addFiles('aTemplate.html', 'client');
    api.addFiles('serverFunction.js', 'server');

    api.export('capitalise', 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('fac:svg-gantt');
  api.addFiles('svg-gantt-tests.js');
});
