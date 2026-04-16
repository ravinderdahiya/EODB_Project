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
    	getTehsils:function(id){
	      var queryTask = new QueryTask({
	       		 url: url.mainURL+"/27"
	     	});
	      var query = new Query();
	      query.outFields = ["n_t_code","n_t_name"];
	      	query.returnDistinctValues = true;
	      	query.orderByFields = ["n_t_name"];
	     	query.where = "n_d_code='"+Dcode+"' and NOT n_t_code=' '";

				
	      queryTask.execute(query).then(function(results){
	     			let data = results.features;
	     			for(let i=0;i<data.length;i++){
	     				let option = document.createElement('option')
	     				option.value = data[i].attributes.n_t_code;
	     				option.text = data[i].attributes.n_t_name;
	     				$(id).append(option);	     			
	     			}
	     		});

	    }

   	};
});