define([
    'dojo/dom',
    "esri/tasks/QueryTask", 
    "esri/tasks/support/Query",
    "demo/poi",  
	"demo/url"  
], function(dom, QueryTask, Query, poi,url){
    
   
    return {

    	autocomplete:function(id) {
    		/*create a DIV element that will contain the items (values):*/
    		P=document.getElementById("sugetion");
    		clearlist();
		  	a = document.createElement("DIV");
		  	a.setAttribute("id", id + "autocomplete-list");
		    a.setAttribute("class", "autocomplete-items");
		    /*append the DIV element as a child of the autocomplete container:*/
      		P.appendChild(a);
    		var value=document.getElementById(id).value;
    		var queryTask = new QueryTask({
	        	url: url.mainURL+"/24"
	      	});

			  
	      	var query = new Query();
	      	query.returnGeometry = false;
	      	query.maxRecordCountFactor="7";
	    	query.where = "category LIKE '"+value.toLocaleUpperCase()+"%'";
	       	query.outFields=["*"];
	       	query.returnDistinctValues = true;
	       	query.orderByFields = ["category"];

	      	//console.log(query.where);
	      	queryTask.execute(query).then(function(results){
	      		var graphic=results.features;
		     for(var i=-1;i<graphic.length && i<6;i++){
		     	if(i==-1){
		     		console.log(graphic[i+1].attributes.category);			    	
			        b = document.createElement("DIV");
			        b.innerHTML = "<strong>" + graphic[i+1].attributes.category.substr(0, value.length) + "</strong>";
			        b.innerHTML += graphic[i+1].attributes.category.substr(value.length);
			        b.innerHTML += "<input type='hidden' value='"+graphic[i+1].attributes.category+"'>";
			        b.addEventListener("click", function(e) {
			            document.getElementById(id).value = this.getElementsByTagName("input")[0].value;
			            clearlist();
			            poi.poisearch(1);		              
			        });
			        a.appendChild(b);

		     	}else{
		     		console.log(graphic[i].attributes.category);			    	
			        b = document.createElement("DIV");
			        b.innerHTML = "<strong>" + graphic[i].attributes.category.substr(0, value.length) + "</strong>";
			        b.innerHTML += graphic[i].attributes.category.substr(value.length);
			        b.innerHTML += "<p>"+graphic[i].attributes.address.substr(0, 25)+"</p>";
			        b.innerHTML += "<input type='hidden' value='"+graphic[i].attributes.category+"'>";
			        b.innerHTML += "<input type='hidden' value='"+graphic[i].attributes.address+"'>";
			        b.addEventListener("click", function(e) {
			            document.getElementById(id).value = this.getElementsByTagName("input")[0].value+"-"+this.getElementsByTagName("input")[1].value;
			            clearlist();
			            poi.poisearch(2);		              
			        });
			        a.appendChild(b);
		     	}
			   	  
				}
	      	});

	      	function clearlist(elemt){
	      		var length=P.children.length
	      		//console.log(length);
    			for(j=length-1;j>=0;j--){
    				P.removeChild(P.children[j]);
    			}
    		}
    		document.addEventListener("click", function (e) {
			      clearlist();
			});
    	},
    	clear_search:function(id){
    		document.getElementById(id).value=null;
    	}
    	
    };
});