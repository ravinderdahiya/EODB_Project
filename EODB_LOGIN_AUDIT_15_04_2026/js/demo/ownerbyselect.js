define([
    'dojo/dom',
    'demo/geom',
    'demo/table3',
    'demo/loading'
], function(dom, geom, table3, loading){
    return {
    	Owner_name:function(graphics){
    		var Multi_Owner_names=[];
    		var s=0, sp, i=0, ip=-1;
    		//console.log(graphics);
    		loading.active();
    		loading.Progressactive(graphics.length);
    		var urls="https://hsac.org.in/LandOwnerAPI/getownername.asmx/Owner_name";
    		var OwnerVar = setInterval(OwnerTimer, 1000);
    		//for(var i=0;i<graphics.length;){
    		 function OwnerTimer(){
    			//console.log(i+"   "+s);
    			if(i<graphics.length && i>ip){
    				ip=i;
    				var datas="Dcode1="+graphics[i].attributes.n_d_code+"&Tcode1="+graphics[i].attributes.n_t_code+"&Nvcode1="+graphics[i].attributes.n_v_code+"&Mustno1="+graphics[i].attributes.n_murr_no+"&Khasra1="+graphics[i].attributes.n_khas_no+"";
	    			//console.log(datas);
	    			$.ajax({
			          url:urls,
			          type:"GET",
			          dataType: "xml",    
			          data:datas,    
			          success: function(result){
			          	//console.log(result);
			            if(result!=null){
			               	var parser = new DOMParser();
			               	if(result.documentElement.firstChild){
			              		var a = parser.parseFromString(result.documentElement.firstChild.textContent,"text/xml");
			              		//console.log(a);
				              	for(var j=0;j<a.getElementsByTagName('OWNER').length;j++){
				              		//console.log(result)
				              		if(a.getElementsByTagName('OWNER')[j].childNodes[0]==null){
				              			//console.log(graphics.length-1);
				              			//console.log(s);
				              			if(i<graphics.length){
					              			var myObj1 = {
													  "District Name":graphics[s].attributes.n_d_name,
													  "District Code":graphics[s].attributes.n_d_code,
													  "Tehsil Name":graphics[s].attributes.n_t_name,
													  "Tehsil Code":graphics[s].attributes.n_t_code,
													  "Village Name":graphics[s].attributes.n_v_name,
													  "NV Code":graphics[s].attributes.n_v_code,										  
													  "Murraba No":graphics[s].attributes.n_murr_no,
													  "Khasra No":graphics[s].attributes.n_khas_no,
													  "Ownwer Name":"No Owner Name"
													 };
													 Multi_Owner_names.push(myObj1);

					              			
					              			if(s==graphics.length-1 && j==a.getElementsByTagName('OWNER').length-1){
					              				clearInterval(OwnerVar);
					              				table3.Displaytable(Multi_Owner_names);
					              			}
				              			}
					              	}else{
					                  var owners = a.getElementsByTagName('OWNER')[j].childNodes[0].nodeValue.split(",");
					                  //console.log(owners);
					                  for(var k=0;k<owners.length;k++){
					                  	if(i<graphics.length){
						                  	if(k==0){
						                  		var myObj = {
													  "District Name":graphics[s].attributes.n_d_name,
													  "District Code":graphics[s].attributes.n_d_code,
													  "Tehsil Name":graphics[s].attributes.n_t_name,
													  "Tehsil Code":graphics[s].attributes.n_t_code,
													  "Village Name":graphics[s].attributes.n_v_name,
													  "NV Code":graphics[s].attributes.n_v_code,										  
													  "Murraba No":graphics[s].attributes.n_murr_no,
													  "Khasra No":graphics[s].attributes.n_khas_no,
													  "Ownwer Name":owners[k]
													 };
													 Multi_Owner_names.push(myObj);
																                  		
						                  	}else{
						                  		//if(i<graphics.length){
						                  		var myObj = {
													  "District Name":"",
													  "District Code":"",
													  "Tehsil Name":"",
													  "Tehsil Code":"",
													  "Village Name":"",
													  "NV Code":"",										  
													  "Murraba No":"",
													  "Khasra No":"",
													  "Ownwer Name":owners[k]
													 };
													 Multi_Owner_names.push(myObj);
						                  	}
						                  	if(s==graphics.length-1 && j==a.getElementsByTagName('OWNER').length-1 && k==owners.length-1){
						                  		clearInterval(OwnerVar);
						              			table3.Displaytable(Multi_Owner_names);
						              		}
					                  	}		        
					                  }
					                 
					              	}
					            
				              	}
				              }else{
				              	loading.dismis();
				              	return;
				              }
			               
			            }
			            s++;
			            i++;
			            loading.Progressincreamnet(i);            
			          }
			      });
	    			
    		}
    		 
    	}
    		
		}
    };
});