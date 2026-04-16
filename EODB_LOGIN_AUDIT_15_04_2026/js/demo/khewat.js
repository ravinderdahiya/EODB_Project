define([
    'dojo/dom',
    'demo/loading'
], function(dom, loading){
    return {
    	Khewatoption:function(id, id2){
		  loading.dismis();
		  $.ajax({
		  	
		          url: "https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetKhewats",
		          type:"GET",
		          dataType: "xml",    
		          data:"Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"",
		          success: function(result){
		            if(result!=null){
		              var parser = new DOMParser();
		              var a = parser.parseFromString(result.documentElement.firstChild.textContent,"text/xml");
		              //console.log(a);
		              if(a.getElementsByTagName('khewat').length>0){
			              for(var i=0;i<a.getElementsByTagName('khewat').length;i++){
			               // console.log(i);
			               
			                $(id).append("<option value='"+ a.getElementsByTagName('khewat')[i].childNodes[0].nodeValue +"'>" + a.getElementsByTagName('khewat')[i].childNodes[0].nodeValue  + "</option>");
			              }
			          }else{
			          	$('#'+id2).addClass("error");
			          }
		              
		            } 
		               
		          }
		      });

		  

		}

    	};
});