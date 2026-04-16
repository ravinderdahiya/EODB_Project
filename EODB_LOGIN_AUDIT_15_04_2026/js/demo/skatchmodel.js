define([
    'dojo/dom',
    "esri/widgets/Sketch/SketchViewModel",
    "esri/tasks/support/Query",
    "esri/layers/GraphicsLayer",
    "demo/symbole",
    "esri/layers/FeatureLayer",
    "demo/ownerbyselect",
    "demo/url"
], function(dom, SketchViewModel, Query, GraphicsLayer, symbole, FeatureLayer, ownerbyselect,url){

    var DistfeatureLayer = new FeatureLayer({
      url: url.mainURL+"/26",
       outFields: ["*"],
      });
    return {
      setUpSketchViewModel:function () {
        polygonGraphicsLayer = new GraphicsLayer();
        polygonGraphicsLayer.title="Sketch layer";
        map.add(polygonGraphicsLayer);
        // add the select by polygon button the view
        //view.ui.add("select-by-polygon", "top-left");
        const selectButton_rect = document.getElementById("select-by-rect-polygon");
        const selectButton_poly = document.getElementById("select-by-polygon");
        const selectButton_free = document.getElementById("select-by-free-polygon");
        const selectButton_clear = document.getElementById("clearSkatch");
        // click event for the button
        selectButton_rect.addEventListener("click", function() {
          clearUpSelection();
          view.popup.close();
          // ready to draw a polygon
          sketchViewModel.create({
            tool: "rectangle"
          });
        });
        selectButton_poly.addEventListener("click", function() {
          clearUpSelection();
          view.popup.close();
          // ready to draw a polygon
          sketchViewModel.create({
            tool: "polygon"
          });
        });
        selectButton_free.addEventListener("click", function() {
          clearUpSelection();
          view.popup.close();
          // ready to draw a polygon
          sketchViewModel.create({
            tool: "polyline"
          });
        });

        selectButton_clear.addEventListener("click", function() {
          clearUpSelection();
        });

        // create a new sketch view model set its layer
        sketchViewModel = new SketchViewModel({
          view: view,
          layer: polygonGraphicsLayer,
          polygonSymbol: polygonsymbol,
          polylineSymbol:polylinesymbol
        });
      },

      selectFeatures:function(geometry) {
        //view.graphics.removeAll();
        if(DistfeatureLayer){
          var query = {
            geometry: geometry,
            outFields: ["*"],
            returnGeometry:true,
            outSpatialReference:{"wkid":4326}
          };

          //console.log(event);
          //console.log(dynamicMapServiceLayer);
          DistfeatureLayer.queryFeatures(query).then(function(results) {
            var graphics = results.features;
            if(graphics.length>0 && graphics.length<21){
                var Districtcode;
                if(graphics[0].attributes.n_d_code.startsWith('0')){
                  Districtcode=graphics[0].attributes.n_d_code.replace("0", "");
                }else{
                  Districtcode=graphics[0].attributes.n_d_code;
                }
                selectFeatures2(Districtcode, geometry);
            }else if(graphics.length>20){
              alert("You Can Select Maximum 20 Khasra");
              return;
            }
          });
        }
        

        function selectFeatures2(districtcode, geometry){
          //console.log(geometry);
          var KhasrafeatureLayer = new FeatureLayer({
            url: url.mainURL+"/"+districtcode,
             outFields: ["*"],
          });

          if(KhasrafeatureLayer){
          var query = {
            geometry: geometry,
            outFields: ["*"],
            returnGeometry:true,
            outSpatialReference:{"wkid":4326}
          };
          KhasrafeatureLayer.queryFeatures(query).then(function(results) {
            var graphics = results.features;
            if(graphics.length>0 && graphics.length<21){
                //console.log(graphics);
                symbole.drowpolygon(graphics)
                ownerbyselect.Owner_name(graphics);
            }else if(graphics.length>20){
              alert("You Can Select Maximum 20 Khasra");
              return;
            }
          });
        }
        }
        
      },
      
    };
});