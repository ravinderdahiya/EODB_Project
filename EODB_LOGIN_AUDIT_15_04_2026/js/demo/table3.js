define([
    'dojo/dom',
    'demo/loading'
], function(dom, loading){
	return {
		Displaytable:function(Multi_Owner_names){
			console.log(Multi_Owner_names.length);
			if(Multi_Owner_names.length>0){
				opendatagrid();
				for(i=-1;i<Multi_Owner_names.length;i++){
					var tr=document.createElement("tr");
					if(i==-1){
						for (key in Multi_Owner_names[i+1]) {
					  	  	var td=document.createElement("td");
				          	td.textContent = key;
				          	tr.appendChild(td);
						}
						document.getElementById("thead1").append(tr); 

					}else{
						for (key in Multi_Owner_names[i]) {
							var td=document.createElement("td");
				          	td.textContent = Multi_Owner_names[i][key];
				          	tr.appendChild(td);				  
						}
						document.getElementById("tbody1").append(tr);
					}

				}
			}else{
				alert("Data Not Available");
			}
			loading.dismis();
			loading.Progressdismis();
		}
	};
});