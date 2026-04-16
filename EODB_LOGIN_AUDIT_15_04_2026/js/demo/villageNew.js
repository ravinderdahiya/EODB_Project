define([
    'dojo/dom',
    "esri/Graphic",
    "esri/tasks/QueryTask", "esri/tasks/support/Query",
	"esri/geometry/Extent",
	"esri/geometry/SpatialReference",
	"demo/symbole",	
	"demo/url"
], function(dom, Graphic, QueryTask,  Query,  Extent, SpatialReference, symbole,url){
    
   
    return {
    	getVillages:function(id){
	      var queryTask = new QueryTask({
	        url: url.mainURL+"/28"

			
	      });
	      var query = new Query();
	      query.outFields = ["*"];
	      	query.returnDistinctValues = true;
	      	query.orderByFields = ["n_v_name"];
	     	query.where = "n_d_code='"+Dcode+"' and n_t_code='"+Tcode+"'";
	       
	      queryTask.execute(query).then(function(results){
	     			let data = results.features;
	     			for(let i=0;i<data.length;i++){
	     				// console.log(results);
	     				let option = document.createElement('option')
	     				option.value = data[i].attributes.n_v_code;
	     				// console.log(data[i].attributes.d_code);
	     				option.text = data[i].attributes.n_v_name;
	     				$(id).append(option);	     			
	     			}
	     		});

	    }

   	};
});