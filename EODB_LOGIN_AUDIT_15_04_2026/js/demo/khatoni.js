define([
    'dojo/dom',
    'demo/murabba',
    'demo/loading'
], function(dom, murabba, loading){


    return {
			getkhatoni:function(id2){
				loading.active();
			  
    	 		//console.log(Dcode+" "+Tcode+" "+Nvcode+" "+GetJamabandiPeriod);
    	 		$.ajax({
		          url: "https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetKhatonis",
		          type:"GET",
		          dataType: "xml",
		          data:"Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&period1="+GetJamabandiPeriod+"&khewat1="+GetKhewats+"",
		          success: function(result){
		            if(result!=null){
		              var parser = new DOMParser();
		              var a = parser.parseFromString(result.documentElement.firstChild.textContent,"text/xml");
		              // console.log(a);

		              //console.log(Left);
		               	if(a.getElementsByTagName('khatoni').length>0){
			              for(var i=0;i<a.getElementsByTagName('khatoni').length;i++){

			                khatoninumbers.push(a.getElementsByTagName('khatoni')[i].childNodes[0].nodeValue);
			                if(i==a.getElementsByTagName('khatoni').length-1){
								        murabba.MurabbaUrls();
			   		           	//console.log(khatoninumbers);
			                }
			              }
			          	}else{
			          		$('#'+id2).addClass("error");
			          		loading.dismis();
			          	}

		            }
		          }
		      });


			}
    	};
});
