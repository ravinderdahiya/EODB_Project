define([ 'dojo/dom', 
		"esri/geometry/Extent",
		"esri/Graphic",
		"demo/symbole",
], function(dom, Extent, Graphic, symbole){
   
    return {    	
    	directionlist:function(direction){
    		var directionfeature=[];
    		const gridDiv = document.getElementById("grid");
    		gridDiv.innerHTML="";
    		//console.log(direction.features);
    		var ul = document.createElement("ul");
    		ul.id="pathlist";
    		for(var i=0;i<direction.features.length;i++){
    			var li=document.createElement("li");
    			li.id=i;
    			if (i<1) {
            		var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/direction_source.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }
		        else if(i==direction.features.length-1) {
		            var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/direction_destination.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;

		        }else if(direction.features[i].attributes.maneuverType=="esriDMTStraight"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/straight.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }else if(direction.features[i].attributes.maneuverType=="esriDMTTurnRight"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/right.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }else if(direction.features[i].attributes.maneuverType=="esriDMTTurnLeft"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/left.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }else if(direction.features[i].attributes.maneuverType=="esriDMTTurnLeftRight"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/left_then_right.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }
		        else if(direction.features[i].attributes.maneuverType=="esriDMTTurnRightLeft"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/right_then_left.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }
		        else if(direction.features[i].attributes.maneuverType=="esriDMTBearLeft"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/bear_left.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }
		        else if(direction.features[i].attributes.maneuverType=="esriDMTBearRight"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="img/root/bear_right.png">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }else if(direction.features[i].attributes.maneuverType=="esriDMTSharpRight"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }
		        else if(direction.features[i].attributes.maneuverType=="esriDMTTurnRightRight"){
		        	var data=`<img alt="" class="esri-directions__maneuver-icon" src="">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }
		        else{
		        	var data=`<img alt="no" class="esri-directions__maneuver-icon" src="">
    						<span>`+direction.features[i].attributes.text+`</span>`;
		        }
    			
    			li.innerHTML=data;
    			directionfeature[i]=direction.features[i];
    			li.addEventListener("click", function(){	
				  //console.log(this.id);
				  featureShowOnMap(this.id);
				});
    			ul.append(li)
    			if(i==direction.features.length-1){
    				gridDiv.append(ul);
    			}
    		}

    		function featureShowOnMap(id){
    			for(var k=GraphicArray.length;k>0;k--){
			      view.graphics.remove(GraphicArray[k-1]);
			      GraphicArray.pop();
			    }
    			if(id==0 || id==directionfeature.length-1){
    				console.log(directionfeature[id].geometry.paths[0][0][0],directionfeature[id].geometry.paths[0][0][0]);
    				view.center =directionfeature[id].geometry.paths[0][0]
    			}else{
    				directionfeature[id].type="polyline"
    				var garphicarray=[];
    				garphicarray.push(directionfeature[id]);
    				symbole.drowpolygon(garphicarray);
    			}
    			  			
    			
    		}
    	},
    	
   	};
});