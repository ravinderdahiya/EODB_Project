define([
    'dojo/dom',
    "esri/Graphic",
    "esri/tasks/QueryTask", "esri/tasks/support/Query",
	"esri/geometry/Extent",
	"esri/geometry/SpatialReference",
	"demo/symbole",
	'demo/loading',
	"demo/url"
	
], function(dom, Graphic, QueryTask,  Query,  Extent, SpatialReference, symbole, loading,url){

		
      	var queryTask = new QueryTask();
	  	var query = new Query();
	  	query.returnGeometry = true;

	  	query.outSpatialReference={"wkid":4326};
    
   
    return {
    	KhasraSymbole:function(){
		  var Murlsuffix
    	  if(Dcode.startsWith('0')){
	  		Murlsuffix=Dcode.replace("0", "");
	  	  }else{
			Murlsuffix=Dcode;
		  }
      		
    	  queryTask.url=url.mainURL+"/"+Murlsuffix;
    	  query.where="";	
	  	  loading.active();
	      
	      // if(status==2){
	    		// query.where = `n_d_code='`+Dcode+`' and n_t_code='`+Tcode+`'and n_v_code='`+Nvcode+`' and "n_murr_no"in(`+murabbanumbers+`)`;
	    		// this.executequery();
	      //  }
	      // if(status==2){
	       	console.log(murabbanumbers);
	       	console.log(khasranumbers);
	       	if(murabbanumbers.length>0 && khasranumbers.length>0){
		       	for(var i=0;i<murabbanumbers.length;i++){
		    		
		    		if(i>0){
		    			query.where += ` or n_d_code='`+Dcode+`' and n_t_code='`+Tcode+`'and n_v_code='`+Nvcode+`' and "n_murr_no"in(`+murabbanumbers[i]+`) and "n_khas_no"in(`+khasranumbers[i]+`)`;
		    		}else{
		    			query.where = `n_d_code='`+Dcode+`' and n_t_code='`+Tcode+`'and n_v_code='`+Nvcode+`' and "n_murr_no"in(`+murabbanumbers[i]+`) and "n_khas_no"in(`+khasranumbers[i]+`)`;
		    		}
		    		if(i==murabbanumbers.length-1){
		    			console.log(query.where);
		    			this.executequery();
		    		}
		       	}
		       }else if(khasranumbers.length>0){
		       		query.where = `n_d_code='`+Dcode+`' and n_t_code='`+Tcode+`'and n_v_code='`+Nvcode+`' and "n_khas_no"in(`+khasranumbers+`)`;
		       		console.log(query.where);
		    		this.executequery();
		       }else{
		       		loading.dismis();
		       }
	    //  }
	      

	    },
	    executequery:function(){
	      //console.log(query.where);
	      queryTask.execute(query).then(function(results){
		     const graphics = results.features;
		      if(graphics.length>0){
		      	  // console.log(graphics);
		      	  loading.dismis();
		          symbole.drowpolygon(graphics)
		      }else{
		      	loading.dismis();
		      	alert("Geometry Under Updation");
		      }
	      }).catch(function(error){
	      	    loading.dismis();
			    console.log("informative error message: ", error.message);
			});

	    }

   	};
});