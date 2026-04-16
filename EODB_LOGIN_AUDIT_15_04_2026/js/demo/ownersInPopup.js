define([
    'dojo/dom',
    'demo/table',
    'demo/table2',
], function(dom, table, table2){
    return {
    	Owners_name:function(){
    	  var datas;
    	  var urls;
    		datas="Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&Mustno1="+murabbavalue+"&Khasra1="+khasravalue+"";
    		urls="https://hsac.org.in/LandOwnerAPI/getownername.asmx/Owner_name";

		  Owner_names=[];
		  $.ajax({
		          url:urls,
		          type:"GET",
		          dataType: "xml",    
		          data:datas,    
		          success: function(result){
		            if(result!=null){
		              var parser = new DOMParser();
		              var a = parser.parseFromString(result.documentElement.firstChild.textContent,"text/xml");
		              //console.log(a);
		              for(var i=0;i<a.getElementsByTagName('OWNER').length;i++){
		              	if(a.getElementsByTagName('OWNER')[i].childNodes[0]==null){
		              		//alert("Not Found");
		              		Owner_names.push("No Owner Names");
		              		
		              	}else{
		                  var owners = a.getElementsByTagName('OWNER')[i].childNodes[0].nodeValue.split(",");
		                  for(var j=0;j<owners.length;j++){
		                    Owner_names.push(owners[j]);
		                    
		                  }

		              	}
		                  
		               }

		            }  


		            // $('#ownerdiv').append('<table class="table table-responsive" id="ownertable" border="1"></table>');
		            // $('#ownertable').append('<tbody id="ownertbody"></tbody>');

		            		
		            		//console.log(Owner_names);
		            		var table1 = document.getElementById("ownertable");
		                   	for(let v= Owner_names.length-1; v>=0;v--){
								// $("#ownertbody").append("<span>"+Owner_names[v]+'</span>');
								
								var row = table1.insertRow(0);
							  var cell1 = row.insertCell(0);
							  cell1.innerHTML = Owner_names[v];
		                   	}          


		          }
		      });

		}
    };
});