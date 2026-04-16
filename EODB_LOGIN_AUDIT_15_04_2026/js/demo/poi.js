define([
    'dojo/dom',
    "esri/Graphic",
    "esri/tasks/QueryTask", "esri/tasks/support/Query",
	"esri/geometry/Extent",
	"esri/geometry/SpatialReference",
	"demo/symbole",
	'demo/loading',
	"esri/layers/FeatureLayer",
	"demo/url"
], function(dom, Graphic, QueryTask,  Query,  Extent, SpatialReference, symbole, loading, FeatureLayer,url){

		
  	var poifeatureLayer = new FeatureLayer({
        url: url.mainURL+"/24",
         outFields: ["*"],
      });
   
    return {
    	poisearch:function(status){
    		if(status==1){
    			if(view.zoom<14){
    				view.zoom=14;
	    		}
	    		
	    		//console.log(document.getElementById('search_poi').value);
	    		if(view.zoom>12){
	    			//console.log(view);
		    		var query = {
		            	geometry: view.extent,
		            	where:"category LIKE '%"+document.getElementById('search_poi').value.toLocaleUpperCase()+"%'",
		            	outFields: ["*"],
		            	returnGeometry:true,
		            	outSpatialReference:{"wkid":4326}
		          	};

	          		this.poiresult(query);
	    		}else{
	    			alert('Zoom to Khasra Label');
	    		}

    		}else if(status==2){
    			var searchdata=document.getElementById('search_poi').value;
    			searchdata=searchdata.split("-");
    			//console.log(searchdata);
    			 var query = {
	             	where:"category ='"+searchdata[0].toLocaleUpperCase()+"' and address='"+searchdata[1]+"'",
	            	outFields: ["*"],
	             	returnGeometry:true,
	             	outSpatialReference:{"wkid":4326}
	           	};

           		this.poiresult(query);
    		}
    		
    	
		

		
		},
		poiresult:function(query){
			//console.log(query);
	          poifeatureLayer.queryFeatures(query).then(function(results) {
	            var graphics = results.features;
	            //console.log(graphics);
	            if(graphics.length>0){
	               drowpoi(graphics);
	            }else{
	              alert("POI Not Available In These Area");
	              return;
	            }
	          });

	          


	          function drowpoi(graphics){
					
		        for(var i=0;i<graphics.length;i++){
			        var poigraphic = new Graphic({
				        geometry: graphics[i].geometry,
				        symbol: PictureMarker
				    });
				         
				    GraphicArray.push(poigraphic);
			        layer.add(poigraphic); 
		        }
		       poifeatureLayer.queryExtent(query).then(function(response){
		        view.goTo(response.extent);
		      });	

			}

		}
	}
});
