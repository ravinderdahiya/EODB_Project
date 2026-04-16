define([
    'dojo/dom',
    "esri/Graphic",
	"esri/geometry/Extent",
	"esri/geometry/SpatialReference",
	'demo/loading'
	
], function(dom, Graphic, Extent, SpatialReference, loading){
   
    return {
    	drowpolygon:function(graphics){
			//console.log(graphics);
			//loading.dismis();
			var symbol
			//console.log(graphics[0].type);
			if(graphics[0].type=="polyline"){
				symbol=polylinesymbol;
			}else if(graphics[0].geometry.type=="polygon"){
				symbol=fillSymbol;
			}else if(graphics[0].geometry.type=="point"){
				//console.log("point");
				symbol=PictureMarker;
			}
			
			var newExtent = new Extent({
          		xmax: graphics[0].geometry.extent.extent.xmax,
          		xmin: graphics[0].geometry.extent.extent.xmin,
          		ymax: graphics[0].geometry.extent.extent.ymax,
          		ymin: graphics[0].geometry.extent.extent.ymin,
        	});
		        for(var i=0;i<graphics.length;i++){
		      
		        	//console.log(fillSymbol);
			        var graphic = new Graphic({
				        geometry: graphics[i].geometry,
				        symbol: symbol,
				    });      
				    GraphicArray.push(graphic);
			        view.graphics.add(graphic);
			       
			        //console.log(results.features[i].geometry.extent);
			        var ext = new Extent({
			          xmax: graphics[i].geometry.extent.extent.xmax,
			          xmin: graphics[i].geometry.extent.extent.xmin,
			          ymax: graphics[i].geometry.extent.extent.ymax,
			          ymin: graphics[i].geometry.extent.extent.ymin,
			        });
			        //console.log(ext);
			        newExtent=newExtent.union(ext);
			        
		        }
		        	view.extent=newExtent.expand(5);
			        //view.zoom = 17;
    		}

    };
});