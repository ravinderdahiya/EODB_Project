define([
    'dojo/dom',
    'demo/loading'
], function(dom, loading){
	return {
		Displaytable:function(Tabledata){
			loading.dismis();
			//console.log(Tabledata);
			var tablehead = ["खेवट या जमाबंदी न.", "खतौनी न.", "नाम तरक या पत्ती ", "विवरण सहित मालिक का नाम", "विवरण सहित काश्तकार", "कुएं या सिंचाई के अन्य साधन का नाम ", "नम्बर खसरा या मुरब्बे और किले का नम्बर", "रक्बा और किस्म जमीन ", "दर और संख्या के ब्यौरे के साथ लगाना  जो मुजारा देता है ","हिस्सा या हकीयत का पैमाना और बाछ का ढंग ", "माल और सवाई के ब्यौरा सहित मांग", "अभियुक्ति "]
			if(Tabledata.length>0){
				opendatagrid();
				var jamabandi=document.getElementById("Jamabandi-tab");
				for(i=-1;i<Tabledata.length;i++){
					var tr=document.createElement("tr");
					if(i==-1){
						var divhead=document.createElement("div");
							divhead.setAttribute("id", "jamabandi-heading");
							divhead.setAttribute("class", "col-sm-12");
							divhead.textContent="नकल जमाबंदी (ऑनलाइन जमाबंदी )";
							jamabandi.appendChild(divhead);
						var br=document.createElement("br");
							jamabandi.appendChild(br);
						var div1=document.createElement("div");
							div1.setAttribute("class", "col-sm-2");
							div1.textContent="जिला : "+$("#j_selectDistrict option:selected").text();
							jamabandi.appendChild(div1);
						var div2=document.createElement("div");
							div2.setAttribute("class", "col-sm-3");
							div2.textContent="तहसील : "+$("#j_selectTehsil option:selected").text();
							jamabandi.appendChild(div2);
						var div3=document.createElement("div");
							div3.setAttribute("class", "col-sm-3");
							div3.textContent="गाँव : "+$("#j_selectVillage option:selected").text();
							jamabandi.appendChild(div3);
						var div4=document.createElement("div");
							div4.setAttribute("class", "col-sm-2");
							div4.textContent="साल : 2012-2013";
							jamabandi.appendChild(div4);
						var div5=document.createElement("div");
							div5.setAttribute("class", "col-sm-2");
							div5.textContent="Type : Online Jamabandi";
							jamabandi.appendChild(div5);

						for (var j=0;j<12;j++) {
					  	  	var td=document.createElement("td");
				          	td.textContent = tablehead[j];
				          	tr.appendChild(td);
						}
						document.getElementById("thead1").append(tr); 

					}else{
						for (var j=0;j<12;j++) {
							var td=document.createElement("td");
				          	td.textContent = Tabledata[i][j];
				          	tr.appendChild(td);				  
						}
						document.getElementById("tbody1").append(tr);
					}

				}
			}else{
				alert("Data Not Available");
			}
			
		}
	};
});