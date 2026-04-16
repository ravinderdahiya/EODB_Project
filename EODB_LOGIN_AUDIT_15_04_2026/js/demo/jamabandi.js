define([
    'dojo/dom',
    'demo/loading',
    'demo/jamabanditable',
    'demo/geom'
], function(dom, loading, jamabanditable, geom){
    return {
    	JamaBandiData:function(){
        loading.active();
        var dataarray=[];
    	  murabbanumbers=[];
        khasranumbers=[];
        var kashrainner=[];
        var k=0;
    	  var datas;
    	  var urls;  
    	  datas="Discode1="+Dcode+"&tehcode1="+Tcode+"&Village1="+Nvcode+"&Period1="+GetJamabandiPeriod+"&Khewat1="+GetKhewats+"";
        console.log(datas);
    	  urls="https://hsac.org.in/testapi/getjamabandi.asmx/Jam";
		  $.ajax({
		          url:urls,
		          type:"GET",
		          dataType: "xml",    
		          data:datas,    
		          success: function(result){
		            if(result!=null){
				          console.log(result);   
		             	var xmlText = new XMLSerializer().serializeToString(result).replace(/web_nakal/gi,'').trim();
		             	//console.log(xmlText);
		             	var res = xmlText.slice(78, -14);
		             	//console.log(res);
                  if(res==""){
                    loading.dismis();
                    alert("Data Under Updataion");
                    return;
                  }
		             	var res1 = res.split("/&gt;&lt;");
      						//console.log(res1);
      						for(var i=0;i<res1.length;i++){
      							var res3=res1[i].replace('    ','').replace('OWNER=" ','OWNER="').replace('CULTI="  ','CULTI="').replace('KHASRA="    ','KHASRA="');
      							//console.log(res3);
      							var res2=res3.split('" ');
      							//console.log(res2);
                    var innerarray=[];
                   

                    // innerarray[0]="";
                    // innerarray[1]="";
                    // innerarray[2]="";
                    // innerarray[3]="";
                    // innerarray[4]="";
                    // innerarray[5]="";
                    // innerarray[6]="";
                    // innerarray[7]="";
                    // innerarray[8]="";
                    // innerarray[9]="";
                    // innerarray[10]="";
                    // innerarray[11]="";
                   


      							for(j=0;j<res2.length;j++){
      								//console.log(res2[j].split("=")[0].trim()+"="+res2[j].split("=")[1]);
                      switch (res2[j].split("=")[0].trim()) {
                        case "KHEWAT":
                          innerarray[0]=res2[j].split("=")[1].replace('"','');
                          break;
                        case "KHATONI":
                          innerarray[1]=res2[j].split("=")[1].replace('"','');
                          break;
                        case "PATTI":
                          innerarray[2]=res2[j].split("=")[1].replace('"','');
                          break;
                        case "OWNER":
                          innerarray[3]=res2[j].split("=")[1].replace('"','');
                          break;
                        case "CULTI":
                          innerarray[4]=res2[j].split("=")[1].replace('"','');
                          break;
                        case "KHASRA":
                          innerarray[6]=res2[j].split("=")[1].replace('"','');
                          if(innerarray[6]){
                            //console.log(innerarray[6]);
                            if(innerarray[6].match("//")){
                              //alert(i);
                              if(i>0){
                                khasranumbers[k]=kashrainner;
                                kashrainner=[];
                                k++;
                              }
                              murabbanumbers.push("'"+innerarray[6].replace('//','')+"'");
                            }else if(innerarray[6].match("/")){
                                kashrainner.push("'"+innerarray[6]+"'");
                            }else{
                                if(''+parseInt(innerarray[6])+''!='NaN' && !innerarray[6].match("-")){
                                 // if(parseInt(innerarray[6])>24){
                                 //     console.log("test");
                                 // }
                                 // else{
                                    kashrainner.push("'"+innerarray[6]+"'");
                                 // }
                                }
                             }
                          }
                          break;
                        case "AREA":
                          innerarray[7]=res2[j].split("=")[1].replace('"','');
                          break;
                        case "HISSA":
                          innerarray[9]=res2[j].split("=")[1].replace('"','');
                          break;
                        case "REMARKS":
                          innerarray[11]=res2[j].split("=")[1].replace('"','');
                          break;
                      }
                      if(j==res2.length-1){
                        if(innerarray.length>0){
                          dataarray.push(innerarray);
                        }
                        
                      }
                      if(j==res2.length-1 && i==res1.length-1){
                        khasranumbers[k]=kashrainner;
                        //console.log(murabbanumbers);
                        //console.log(khasranumbers);
                        if(dataarray.length>0){
                          jamabanditable.Displaytable(dataarray);
                          geom.KhasraSymbole();
                        }else{
                          loading.dismis();
                          return;
                        }
                        
                      }
      							}
      							
      						}
  						      		               
		            }               
		          },
              error: function (error) {
                  loading.dismis();
                  alert("Data Under Updataion");
              }
		      });

		}
    };
});