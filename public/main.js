var app = angular.module('mumbleExpressApp', ['luegg.directives', 'btford.socket-io','notification', 'ui.tree']);

app.factory('socket', function (socketFactory) {
    return socketFactory();
});
