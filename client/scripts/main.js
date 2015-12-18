'use strict';

var angular = require('angular'),
    //npm modules
    angular_notification = require('angular-notification'),
    //todo: socket.io-client is not working
    //have to manually include in html for now
    io = require('socket.io-client'),
    angular_socket_io = require('angular-socket-io'),
    angularjs_scroll_glue = require('angularjs-scroll-glue'),
    angular_ui_tree = require('../../bower_components/angular-ui-tree/dist/angular-ui-tree.js'), //todo: fix this crazy path
    //controllers
    channelTreeController = require('./controllers/channelTreeController'),
    buttonsController = require('./controllers/buttonsController'),
    chatBoxController = require('./controllers/chatBoxController'),
    mumbleExpressController = require('./controllers/mumbleExpressController'),
    //services
    audio = require('./services/audio'),
    channelTree = require('./services/channelTree'),
    mumbleChat = require('./services/mumbleChat'),
    mumbleExpressConnection = require('./services/mumbleExpressConnection');

var app = angular.module('mumbleExpressApp', ['luegg.directives','btford.socket-io','notification', 'ui.tree'])
    .factory('socket', function (socketFactory) {
	return socketFactory();
    })
    .service('channelTree', channelTree)
    .service('mumbleChat', mumbleChat)
    .service('audio', audio)
    .service('mumbleExpressConnection', mumbleExpressConnection)
    .controller('channelTreeController', channelTreeController)
    .controller('buttonsController', buttonsController)
    .controller('chatBoxController', chatBoxController)
    .controller('mumbleExpressController', mumbleExpressController);
