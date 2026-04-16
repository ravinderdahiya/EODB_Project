define([
    'dojo/dom',
    "esri/widgets/Track",
    "demo/rout",	
], function(dom, Track, rout){
    
    var track = new Track();
   
    return {
    	tracking:function(){
    		//-------------------------track Button---------------------------------------------
			track.view=view;
			view.ui.add(track, "top-left");

			// The sample will start tracking your location
			// once the view becomes ready
			view.when(function() {
			  track.stop();
			  //console.log(track);
			});
			

			//-------------------------track Button End-----------------------------------------

    	},
    	currentlocation:function(){
    		track.on("track", function(trackEvent){
			    //console.log(trackEvent);
			    //console.log("track: %s", view.track);
			    //return trackEvent.position.coords.latitude;
			})
    	},
    	checkstatus:function(){
    		//console.log(track);
    		if(track.tracking){
    			return true;
    		}else{
    			return false;
    		}
    	},
    	addstops:function(){
    		//console.log(track.graphic.geometry);
    		view.center=[track.graphic.geometry.longitude, track.graphic.geometry.latitude];
    		rout.addStop(track.graphic.geometry);
    	}

   	};
});