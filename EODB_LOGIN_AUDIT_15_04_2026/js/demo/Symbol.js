define([
    'dojo/dom',
    "esri/symbols/PictureMarkerSymbol" ,  
	
], function(dom,PictureMarkerSymbol){
    
   
    return {

    	addSymbole:function() {
    		fillSymbol = {
			    type: "simple-fill", // autocasts as new SimpleFillSymbol()
			    color: [227, 139, 79, 0.2],
			    outline: { // autocasts as new SimpleLineSymbol()
			      color: [255, 0, 0],
			      width: 1
			    }
			  };
    		// Define the symbology used to display the stops
            StartSymbol =new PictureMarkerSymbol({
            "url":"img/root/direction_source.png",
            "height":20,
         
          });
            EndSymbol = new PictureMarkerSymbol({
            "url":"img/root/direction_destination.png",
            "height":20,
         
          });

            // Define the symbology used to display the route
            routeSymbol = {
              type: "simple-line", // autocasts as SimpleLineSymbol()
              color: [95, 251, 218, 1],
              width: 5
            };

            polygonsymbol={
            	type:"simple-fill",
            	color:[102,204,255,0.1],
            	style:"solid",
            	outline:{
            		color:"white",
            		width:1
            	}
            };

            polylinesymbol={
            	type:"simple-line",
            	color:[102,204,255,0.1],
            	style:"solid",
            	color:"white",
            	width:4
            };
			
			PictureMarker = new PictureMarkerSymbol({
            "url":"img/icc.png",
            "height":20,
         
          });
    		
    	
		}
    };
});