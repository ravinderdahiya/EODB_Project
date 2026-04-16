define([
    'dojo/dom',
    "esri/Graphic",
    "esri/tasks/QueryTask", "esri/tasks/support/Query",
	"esri/geometry/Extent",
	"esri/geometry/SpatialReference",
	"demo/symbole",
	"demo/loading",
	"demo/url"
	
], function(dom, Graphic, QueryTask,  Query,  Extent, SpatialReference, symbole,loading,url){
    
   
    return {
    	getKhasras:function(id){
	      // loading.active();
	      var urlsuffix
	      if(Dcode.startsWith('0')){
	      	urlsuffix=Dcode.replace("0", "");
	      }else{
	      	urlsuffix=Dcode;
	      }

	      //console.log(urlsuffix);
	      var queryTask = new QueryTask({
	        url: url.mainURL+"/"+urlsuffix
	      });	      
	      var query = new Query();
	      	query.outFields = ["n_khas_no "];
	      	query.returnDistinctValues = true;
	     	query.orderByFields = ["n_khas_no "];
	      	query.where = "n_d_code='"+Dcode+"' and n_t_code='"+Tcode+"'and n_v_code='"+Nvcode+"' and n_murr_no='"+murabbavalue+"'";

	      	queryTask.execute(query).then(function(results){
	      	var result = results.features;

	      	for (let i = 0; i < result.length; i++) {
	      		let data = result[i].attributes;
		      	let option = document.createElement('option');
		      	option.value = data.n_khas_no;
		      	// console.log(option.value);
		      	option.text = data.n_khas_no;	    
		      	$(id).append(option);
	      	}
	      	 loading.dismis();
	      });

	    }

   	};
});