define([
    'dojo/dom',
    "esri/Graphic",
    "esri/tasks/RouteTask",
    "esri/geometry/Extent",
      "esri/tasks/support/RouteParameters",
      "esri/tasks/support/FeatureSet",
      "demo/symbole",
      "demo/direction"
], function(dom, Graphic, RouteTask, Extent, RouteParameters, FeatureSet, symbole, direction){
    
   
    return {

    	addStop:function(geometry) {
    		 //console.log(document.getElementById("RoutingOne").getAttribute("aria-expanded"));
    		 var divstatus=document.getElementById("RoutingOne").getAttribute("aria-expanded");
    		if(divstatus == 'true'){
    			for(var k=0;k<dynamicMapServiceLayer.sublayers.items.length-5;k++){
    				dynamicMapServiceLayer.sublayers.items[k].popupEnabled = false;
    			}				
    			view.popup.close();
    			//console.log(ViewClickCount);
		        switch (ViewClickCount) {
				  case 1:
						var stop = new Graphic({
				        geometry: geometry,
				        symbol: StartSymbol
				        });
				        layer.add(stop);
				    	ViewClickCount++;
				    	if(layer.graphics.items.length>3){
				    		var lastStop=layer.graphics.items[1];
							layer.removeMany([layer.graphics.items[0],layer.graphics.items[1],layer.graphics.items[2]]);
							 layer.add(lastStop);
						}
				    	routeParams.stops.features[0]=stop;
				    	if(routeParams.stops.features.length ==2){
				    		routeTask.solve(routeParams).then(showRoute);
				    	}
				    	document.getElementById("Starting").value = geometry.latitude+", "+geometry.longitude;
				    	break;
				  case 2:
				  		var stop = new Graphic({
				        geometry: geometry,
				        symbol: EndSymbol
				        });
				        layer.add(stop);
				  		if(layer.graphics.items.length>3){						
							  layer.removeMany([layer.graphics.items[1],layer.graphics.items[2]]);
						}
				    	routeParams.stops.features[1]=stop;
				    	if(routeParams.stops.features.length ==2){
				    		routeTask.solve(routeParams).then(showRoute, Noresult);
				    		//console.log(layer);
				    	}
				    	document.getElementById("Destination").value = geometry.latitude+", "+geometry.longitude;
				    
				}
    		}else if(view.zoom<17){
    			for(var k=0;k<dynamicMapServiceLayer.sublayers.items.length;k++){
    				dynamicMapServiceLayer.sublayers.items[k].popupEnabled = false;
    			}
    		}else{
				for(var k=0;k<dynamicMapServiceLayer.sublayers.items.length-5;k++){
    				dynamicMapServiceLayer.sublayers.items[k].popupEnabled = true;
    			}
			}




			function showRoute(data){
				//console.log(data);
				var routeResult;
				var routarray=[];
		        routeResult = data.routeResults[0].route;
		        routeResult.symbol = routeSymbol;
		        layer.add(routeResult);
		        //console.log(layer);
		        direction.directionlist(data.routeResults[0].directions);
		        var newExtent = new Extent({
	          		xmax: data.routeResults[0].route.geometry.extent.extent.xmax,
	          		xmin: data.routeResults[0].route.geometry.extent.extent.xmin,
	          		ymax: data.routeResults[0].route.geometry.extent.extent.ymax,
	          		ymin: data.routeResults[0].route.geometry.extent.extent.ymin,
        		});
        		//console.log(newExtent);
		        for(var i=1;i<data.routeResults.length;i++){
		      			       
			        //console.log(results.features[i].geometry.extent);
			        var ext = new Extent({
			          	xmax: data.routeResults[i].route.geometry.extent.extent.xmax,
	          			xmin: data.routeResults[i].route.geometry.extent.extent.xmin,
	          			ymax: data.routeResults[i].route.geometry.extent.extent.ymax,
	          			ymin: data.routeResults[i].route.geometry.extent.extent.ymin,
			        });
			        //console.log(ext);
			        newExtent=newExtent.union(ext);
			        
		        }
		        	view.extent=newExtent.expand(2);
			        //view.zoom = 17;
			}

			function Noresult(error){
				routeParams.stops.features.pop();
				routeParams.stops.features.pop();
				layer.removeAll();
				ViewClickCount=1;
				document.getElementById("Starting").value="";
				document.getElementById("Destination").value="";
				document.getElementById("grid").innerHTML="";
				alert(error.message);
				//console.log(error);
			}

		},


		clearStop:function(){
			routeParams.stops.features.pop();
			routeParams.stops.features.pop();
			layer.removeAll();
			ViewClickCount=1;
			document.getElementById("Starting").value="";
			document.getElementById("Destination").value="";
			document.getElementById("grid").innerHTML="";
		}
		
    };
});