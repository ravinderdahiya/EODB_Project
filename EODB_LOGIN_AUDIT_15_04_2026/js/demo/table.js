define([
    'dojo/dom'
], function(dom){
    
   
    return {
    	Displaytable:function(){
    // 	  
		  var Dcode=$("#selectDistrict option:selected").text();
		  var Tcode=$("#selectTehsil option:selected").text();
		  var Nvcode=$("#selectVillage option:selected").text();
		  var GetKhewats=$("#selectKhewat option:selected").text();
		  var GetKhatonis=$("#selectKhatoni option:selected").text();
		  var GetMurabba=$("#selectMurabba option:selected").text();
		  var GetKhasra=$("#selectKhasra option:selected").text();
		  for(var i=-1;i<Owner_names.length;i++){
		   var tr=document.createElement("tr");
		   for(var j=0;j<8;j++){
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
		          td.textContent = "Murabba";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 6:
		          var td=document.createElement("td");
		          td.textContent = "Khasra";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		        break;
		        case 7:
		          var td=document.createElement("td");
		          td.textContent = "Owner Name";
		          tr.appendChild(td);
		        //  document.getElementById("tbody1").append(tr);
		          
		      }

		      document.getElementById("thead1").append(tr);                 

		    }else if(i==0){ 
		    	
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
		          td.textContent = GetKhatonis;
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 5:
		          var td=document.createElement("td");
		          td.textContent = GetMurabba;
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 6:
		          var td=document.createElement("td");
		          td.textContent = GetKhasra;
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		        break;
		        case 7:
		          var td=document.createElement("td");
		          td.textContent = Owner_names[i];
		          tr.appendChild(td);
		        //  document.getElementById("tbody1").append(tr);
		          
		      } 
		      document.getElementById("tbody1").append(tr);                

		    }else{
		      switch (j) {
		        
		        case 0:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 1:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 2:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 3:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		          //document.getElementById("tbody1").append(tr);
		          break;
		        case 4:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 5:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		         // document.getElementById("tbody1").append(tr);
		          break;
		        case 6:
		          var td=document.createElement("td");
		          td.textContent = "";
		          tr.appendChild(td);
		          //document.getElementById("tbody1").append(tr);
		        break;
		        case 7:
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