define([
	'dojo/dom',
	"esri/Graphic",
	"esri/tasks/QueryTask", "esri/tasks/support/Query",
	"esri/geometry/SpatialReference",
	"demo/symbole",
	"demo/loading",
		"demo/url",
	
	], function(dom, Graphic, QueryTask,  Query, SpatialReference, symbole,loading,url){


		return {
			boundaryOf:function(id){

	      var query = new Query();
	      if(id=="district"){
	      	var queryTask = new QueryTask({
	      		url: url.mainURL+"/26"
	      	});
	      	query.where = "n_d_code='"+Dcode+"'";
	      	console.log(query.where);

	      }else if(id=="tehsil"){
	      	var queryTask = new QueryTask({
	      		url: url.mainURL+"/27"
	      	});

	      	query.where = "n_d_code='"+Dcode+"' and n_t_code='"+Tcode+"'";
	      	console.log(query.where);

	      }else if(id=="village"){
	      	loading.active();
	      	var queryTask = new QueryTask({
	      		url: url.mainURL+"/28"
	      	});
	      	query.where = "n_d_code='"+Dcode+"' and n_t_code='"+Tcode+"' and n_v_code ='"+Nvcode+"'";
	      	console.log(query.where);

	      }
	      else if(id=="murabba"){
	      	var Murlsuffix;
	      	if(Dcode.startsWith('0')){
	      		Murlsuffix=Dcode.replace("0", "");
	      	}else{
		      	Murlsuffix=Dcode;
		      }
	      	loading.active();
	      	var queryTask = new QueryTask({
		        url: url.mainURL+"/"+Murlsuffix
		      });
	      	query.where = "n_d_code='"+Dcode+"' and n_t_code='"+Tcode+"'and n_v_code='"+Nvcode+"' and n_murr_no='"+murabbavalue+"'";
	      	console.log(query.where);

	      }

	      else if(id=="khasra"){
	      	var Kurlsuffix
	      	if(Dcode.startsWith('0')){
	      		Kurlsuffix=Dcode.replace("0", "");
	      	}else{
		      	Kurlsuffix=Dcode;
		      }
	      	loading.active();
	      	var queryTask = new QueryTask({
		        url: url.mainURL+"/"+Kurlsuffix
		      });
	      	query.where = "n_d_code='"+Dcode+"' and n_t_code='"+Tcode+"'and n_v_code='"+Nvcode+"' and n_murr_no='"+murabbavalue+"' and n_khas_no='"+khasravalue+"'";
	      	console.log(query.where);

	      }
	      
	      query.returnGeometry = true;
	      query.outSpatialReference={"wkid":4326};
	      queryTask.execute(query).then(function(results){
	      	const graphics = results.features;
	      	if(graphics.length>0){
	      		if(id != "murabba" && id != "village"){
	      			loading.dismis();
	      		}
	      		symbole.drowpolygon(graphics);
	      	}else{
	      		if(id != "murabba" && id != "village"){
	      			loading.dismis();
	      		}
	      		alert("Geometry under updation.");
	      	}
	      });

	  },

	};
});