define([
    "dojo/dom",
    "demo/ownername",
  "demo/khatoni"
], function(dom,ownername,khatoni){
    
   
    return {
      TimePeriodOption:function(){
    
      $.ajax({
              url: "https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetJamabandiPeriod",
              type:"GET",
              dataType: "xml",    
              data:"Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"",    
              success: function(result){
                // console.log(result);
                if(result!=null){
                  var x = result.getElementsByTagName("string")[0].childNodes[0];
                  var xmlText = new XMLSerializer().serializeToString(x);
                  //console.log(xmlText);
                  var Left=xmlText.slice(52, -51);
                  GetJamabandiPeriod=Left;
                  console.log(Dcode+"|"+Tcode+"|"+Nvcode+"|"+GetKhewats+"|"+GetJamabandiPeriod);
                  if(urlstatus ==100){
                    khatoni.getkhatoni("s_selectKhewat");  
                    status = 2;
                    ownername.Owner_name();
                    urlstatus = 0;
                  }
                  console.log(Dcode+"|"+Tcode+"|"+Nvcode+"|"+GetKhewats+"|"+GetJamabandiPeriod);
                }               
              }
          });

        }
      };
});