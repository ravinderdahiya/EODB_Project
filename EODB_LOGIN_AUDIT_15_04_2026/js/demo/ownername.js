define([
    'dojo/dom',
    'demo/table',
    'demo/table2',
], function(dom, table, table2){
    return {
    	Owner_name:function(){
    	  var datas;
    	  var urls;
    	if(status==1){
    		datas="Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&Mustno1="+murabbavalue+"&Khasra1="+khasravalue+"";
    		urls="https://hsac.org.in/LandOwnerAPI/getownername.asmx/Owner_name";
    	}else if(status==2){
    		datas="Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&period1="+GetJamabandiPeriod+"&khewat1="+GetKhewats+"";
    		urls="https://hsac.org.in/LandOwnerAPI/GetOwnerName.asmx/GetOwnersbykhewat";
    	}
		  Owner_names=[];
		  $.ajax({
		          url:urls,
		          type:"GET",
		          dataType: "xml",    
		          data:datas,    
		          success: function(result){
		          	// console.log(result);
		            if(result!=null){
		              var parser = new DOMParser();
		              var a = parser.parseFromString(result.documentElement.firstChild.textContent,"text/xml");
		              // console.log(a);
		              for(var i=0;i<a.getElementsByTagName('OWNER').length;i++){
		              	if(a.getElementsByTagName('OWNER')[i].childNodes[0]==null){
		              		//alert("Not Found");
		              		Owner_names.push("No Owners Name");
							console.log(status);
		              		if(status==1){
	                    		table.Displaytable();
	                    	}else if(status==2){
	                    		table2.Displaytable();
	                    	}
		              	}else{
		                  var owners = a.getElementsByTagName('OWNER')[i].childNodes[0].nodeValue.split(",");
		                  // console.log(owners);
		                  console.log(owners);
		                  for(var j=0;j<owners.length;j++){
		                    Owner_names.push(owners[j]);
							console.log(status);
		                    if(j==owners.length-1){
		                    	if(status==1){
		                    		table.Displaytable();
		                    	}else if(status==2){
		                    		table2.Displaytable();
		                    	}
		                      
		                    }
		                  }
		              	}
		                  
		               }
		          	     
		            }               
		          }
		      });

		}
    };
});