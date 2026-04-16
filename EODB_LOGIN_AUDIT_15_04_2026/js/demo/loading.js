define([
    'dojo/dom'
], function(dom){
    var TotalLength;
    return {
    	active:function(){
          document.getElementById("loaderScreen").style.display="block";
       },
       dismis:function(){
          document.getElementById("loaderScreen").style.display="none";
       },
       // printactive:function(){
       // 		document.getElementsByClassName("print-btn")[0].value="Printing";
       // },
       // printdismis:function(){
       // 		document.getElementsByClassName("print-btn")[0].value="Print";
       // },
       Progressactive:function(length){
          TotalLength=length;
          document.getElementById("progress_bar").style.display="block";
          document.getElementById("progress_bar_inner").setAttribute("aria-valuemax", length-2);
          //console.log(document.getElementById("progress_bar"));
       },
       Progressdismis:function(){
        setTimeout(function(){
            document.getElementById("progress_bar").style.display="none";
            document.getElementById("progress_bar_inner").style.width="0%";
            document.getElementById("progress_bar_inner").innerHTML="0%";
           }, 1000);
       },
       Progressincreamnet:function(x){
          var persentage=Math.round((x*100)/TotalLength);
          document.getElementById("progress_bar_inner").style.width=persentage+"%";
          document.getElementById("progress_bar_inner").innerHTML=persentage+"%";
       }
    };
});