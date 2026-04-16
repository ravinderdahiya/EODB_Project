define([
    'dojo/dom',
    'demo/geom',
    'demo/loading',
    'demo/khasra'
], function(dom, geom,loading, khasra){
    return {
    	MurabbaUrls:function(id=null, id2=null){
    		 // loading.dismis();
    
		 var khatonilength=khatoninumbers.length;
		 //console.log(khatoninumbers);
		 var khat=0;
		 getMurabba(khatonilength-1);
		 function getMurabba(khatonilength){
		 	if(khatonilength>-1){
		 		//console.log(khatoninumbers[khat]);
					$.ajax({
			          url: "https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetMuraba",
			          type:"GET",
			          dataType: "xml",    
			          data:"Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&period1="+GetJamabandiPeriod+"&khewat1="+GetKhewats+"&Khatoni1="+khatoninumbers[khat]+"",    
			          success: function(result){
			          	//console.log("https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetMuraba?"+"Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&period1="+GetJamabandiPeriod+"&khewat1="+GetKhewats+"&Khatoni1="+khatoninumbers[khat]+"");
			            if(result!=null){
			            	//console.log(result);
			              var parser = new DOMParser();
			              var a = parser.parseFromString(result.documentElement.firstChild.textContent,"text/xml");
			              //console.log(a);
			              if(a.getElementsByTagName('must').length>0){
			              	var innerarray=[];
				              for(var i=0;i<a.getElementsByTagName('must').length;i++){  
				                murabbanumbers.push("'"+a.getElementsByTagName('must')[i].childNodes[0].nodeValue+"'");
				                innerarray.push("'"+a.getElementsByTagName('must')[i].childNodes[0].nodeValue.trim()+"'");
				                if(i==a.getElementsByTagName('must').length-1){
				                	murabbarray[khat]=innerarray;
				                	khat++;
				                	return getMurabba(khatonilength-1);
				                }      
				              }
				          }
			              
			            }               
			          }
			      });
				
			}else{
				khasra.getkhasraUrl(murabbarray);
				return -1;
			}
			  
		}

		}

	};
});

// 					$.ajax({
// 			          url: "https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetMuraba",
// 			          type:"GET",
// 			          dataType: "xml",    
// 			          data:"Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&period1="+GetJamabandiPeriod+"&khewat1="+GetKhewats+"&Khatoni1="+GetKhatonis+"",    
// 			          success: function(result){
// 			            if(result!=null){
// 			              var parser = new DOMParser();
// 			              var a = parser.parseFromString(result.documentElement.firstChild.textContent,"text/xml");
// 			              //console.log(a);
// 			              if(a.getElementsByTagName('must').length>0){
// 				              for(var i=0;i<a.getElementsByTagName('must').length;i++){
				                
// 				                murabbanumbers.push("'"+a.getElementsByTagName('must')[i].childNodes[0].nodeValue+"'");
// 				                if(i==a.getElementsByTagName('must').length-1){
// 				                	khasra.getkhasra();
				                	
// 				                }
				                
// 				              }
// 				          }else{
// 				          	$('#'+id2).addClass("error");
// 				          	if(status==2){
// 			                		alert("Murabba Not Found");
// 			                	}
// 				          }
			              
// 			            }               
// 			          }
// 			      });