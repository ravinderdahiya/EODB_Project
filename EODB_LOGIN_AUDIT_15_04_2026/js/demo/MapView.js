define([
    'dojo/dom',
    "esri/Map",
  	"esri/views/MapView","esri/core/urlUtils",
], function(dom, Map, MapView,urlUtils){
    return {
    	mapview:function(){
			// urlUtils.addProxyRule({
			// 	urlPrefix: "https://hsacggm.in/map/rest/services/",
			// 	proxyUrl: "http://hsac.org.in/DotNet/proxy.ashx"
			//   });
			//    urlUtils.addProxyRule({
			// 	urlPrefix: "https://hsacggm.in/server/rest/services/",
			// 	proxyUrl: "http://hsac.org.in/DotNet/proxy.ashx"
			//   });
			  
			  
			  urlUtils.addProxyRule({
			urlPrefix: "https://hsac.org.in/server/rest/services/",
				proxyUrl: "http://hsac.org.in/DotNet/proxy.ashx"
			  }); 
			  
			  
		    //-------------------------Map ---------------------------------------------------
			map = new Map({
				basemap: "satellite",
			  layers: [layer]
			});
			//-------------------------Map End -----------------------------------------------

			//-------------------------Map View-----------------------------------------------
			view = new MapView({
			  container: "map", 
			  map: map, 
			  zoom: 10,  
			  center: [76.945349, 29.666836] ,
			  
			  
			});
			//-------------------------Map View End--------------------------------------------
		 
		}

    	};
});