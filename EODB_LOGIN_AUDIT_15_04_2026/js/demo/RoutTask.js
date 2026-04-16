define([
    'dojo/dom',
    "esri/tasks/RouteTask",
    "esri/tasks/support/RouteParameters",
    "esri/tasks/support/FeatureSet"    
], function(dom, RouteTask, RouteParameters, FeatureSet){
    
   
    return {

    	rootParameters:function() {
    	   // Point the URL to a valid route service
          routeTask = new RouteTask({
            url: "https://onemapggm.gmda.gov.in/server/rest/services/HaryanaRoadNW/NAServer/Route"
          });

          // Setup the route parameters
         routeParams = new RouteParameters({
            stops: new FeatureSet(),
            outSpatialReference: { // autocasts as new SpatialReference()
              wkid: 4326
            },
            returnDirections:true
          });
    	
		}
    };
});