'use strict';

var angular = require('angular'),
    //controllers
    channelTreeController = require('./controllers/channelTreeController'),
    buttonsController = require('./controllers/buttonsController'),
    chatBoxController = require('./controllers/chatBoxController'),
    mumbleExpressController = require('./controllers/mumbleExpressController'),
    //services
    audio = require('./services/audio'),
    channelTree = require('./services/channelTree'),
    mumbleChat = require('./services/mumbleChat'),
    mumbleExpressConnection = require('./services/mumbleExpressConnection.js');

var app = angular.module('mumbleExpressApp', ['luegg.directives', 'btford.socket-io','notification', 'ui.tree'])
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
