define([
    'dojo/dom'
], function(dom){
	return {
		Displaytable:function(){
		  //console.log(Owner_names);
	
		  var Dcode=$("#s_selectDistrict option:selected").text();
		  var Tcode=$("#s_selectTehsil option:selected").text();
		  var Nvcode=$("#s_selectVillage option:selected").text();
		  var GetKhewats=$("#s_selectKhewat option:selected").text();
		  //var GetKhatonis=$("#s_selectKhatoni option:selected").text();
		  document.getElementById("grid").innerHTML="";
		  for(var i=-1;i<Owner_names.length;i++){
		   var tr=document.createElement("tr");
		   for(var j=0;j<6;j++){
		    if(i==-1){ 
		      opendatagrid();
		    switch (j) {
		        case 0:
		          var td=document.createElement("td");
		          td.textContent = "District Name";
		          tr.appendChild(td);       
		          break;
		        case 1:
		          var td=document.createElement("td");
		          td.textContent = "Tehsils Name";
		          tr.appendChild(td);
		          break;
		        case 2:
		          var td=document.createElement("td");
		          td.textContent = "Village Name";
		          tr.appendChild(td);
		          break;
		        case 3:
		          var td=document.createElement("td");
		          td.textContent = "Khewat";
		          tr.appendChild(td);
		        //  document.getElementById("tbody1").append(tr);
		          break;
		        case 4:
		          var td=document.createElement("td");
		          td.textContent = "Khatoni";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 5:
		          var td=document.createElement("td");
		          td.textContent = "Owner Name";
		          tr.appendChild(td);
		         
		      }
		      document.getElementById("thead1").append(tr);                 

		    }
		    else if(i==0){ 

		    switch (j) {
		        
		        case 0:
		          var td=document.createElement("td");
		          td.textContent = Dcode;
		          tr.appendChild(td);
		       
		          break;
		        case 1:
		          var td=document.createElement("td");
		          td.textContent = Tcode;
		          tr.appendChild(td);
		        
		          break;
		        case 2:
		          var td=document.createElement("td");
		          td.textContent = Nvcode;
		          tr.appendChild(td);
		        
		          break;
		        case 3:
		          var td=document.createElement("td");
		          td.textContent = GetKhewats;
		          tr.appendChild(td);
		        //  document.getElementById("tbody1").append(tr);
		          break;
		        case 4:
		          var td=document.createElement("td");
		          td.textContent = khatoninumbers.toString();;
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 5:
		          var td=document.createElement("td");
		          td.textContent = Owner_names[i];
		          tr.appendChild(td);
		         
		      }  
		      document.getElementById("tbody1").append(tr);               

		    }else{
		      switch (j) {
		        
		        case 0:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		       
		          break;
		        case 1:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		        
		          break;
		        case 2:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		        
		          break;
		        case 3:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		        //  document.getElementById("tbody1").append(tr);
		          break;
		        case 4:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 5:
		          var td=document.createElement("td");
		          td.textContent = Owner_names[i];
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          
		          
		      }       
		      document.getElementById("tbody1").append(tr);

		    }

		   }
		   
		      
		      
		  }
		}

	};
});