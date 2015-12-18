app.controller('buttonsController', function($scope, mumbleExpressConnection) {

    //set up buttons
    $scope.user = mumbleExpressConnection.user;

    $scope.$on( 'connectionUpdate', function( event ) {
	$scope.user = mumbleExpressConnection.user;
    });
    
    var muteState =  true; //for remembering if should be muted when undeafening

    $scope.deafButton = function() {
	if(!$scope.user.deafened)
	    $scope.user.muted = muteState;

	mumbleExpressConnection.setMuteDeaf($scope.user.muted, $scope.user.deafened);
    };
    
    $scope.muteButton = function() {
	muteState = $scope.user.muted;
	if(!$scope.user.muted)
	    $scope.user.deafened = false;

	mumbleExpressConnection.setMute($scope.user.muted);
    };
});
