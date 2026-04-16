require([
  "demo/MapView",
  "demo/khewat",
  "demo/timePeriod",
  "demo/khatoni",
  "demo/ownername",
  "demo/skatchmodel",
  "demo/rout",
  "demo/Symbol",
  "demo/RoutTask",
  "demo/sugetion",
  "demo/search",
  "demo/drawBoundary",
  "demo/ownersInPopup",
  "demo/villageNew",
  "demo/tehsilNew",
  "demo/districtNew",
  "demo/murrabaNew",
  "demo/khasraNew",
  "demo/jamabandi",
  "demo/print",
  "demo/poi",
  "demo/track",
  "esri/widgets/BasemapGallery",
  "esri/widgets/LayerList",
  "esri/widgets/Home",
  "esri/widgets/Expand",
  "esri/layers/GraphicsLayer",
  "esri/layers/MapImageLayer",
  "esri/layers/support/LabelClass",
  "demo/readurl",
          "esri/Graphic",



], function (MapView, khewat, timePeriod,
  khatoni,  ownername,  skatchmodel, rout, Symbol, RoutTask, sugetion, 
  search, drawBoundary, ownersInPopup, villageNew, tehsilNew, districtNew, murrabaNew, khasraNew, jamabandi, print, poi, track,  BasemapGallery, LayerList, Home, Expand,
   GraphicsLayer, MapImageLayer, LabelClass, readurl,Graphic) {


  //--------------------Globle Variables Declear------------------------------------

  GetJamabandiPeriod = null;
  ViewClickCount = 1;
  GraphicArray = [];
  Owner_names = [];
  murabbanumbers = [];
  murabbarray = [];
  Dcode = null;
  Tcode = null;
  Nvcode = null;
  urlstatus = null;
  GetKhewats = null;
  GetKhatonis = null;
  murabbavalue = null;
  status = 0;
  khasravalue = null;
  Deecode = "Ambala";
  Dname = null;
  Tname = null;
  myWindow = null;
  khasranumbers = [null];
  // khatoninumbers=[null];
  khatoninumbers = [];


  //--------------------Globle Variables Declear End--------------------------------

  //---------------------Declear Graphic Layer--------------------------------------
   layer = new GraphicsLayer();
  layer.title = "Location layer";

  //-------------------------Map View-----------------------------------------------
  MapView.mapview();

  //-------------------------Map View End--------------------------------------------

  //-------------------------Basemap Gallery-----------------------------------------
  var basemapGallery = new BasemapGallery({
    view: view
  });
  var bgExpand = new Expand({
    view: view,
    content: basemapGallery
  });
  view.ui.add(bgExpand, {
    position: "top-left"
  });

  //-------------------------Basemap Gallery End-------------------------------------

  //-------------------------Layer List----------------------------------------------
  view.when(function () {
    var layerList = new LayerList({
      view: view,
      listItemCreatedFunction: function (event) {
        const item = event.item;
        if (item.layer.type != "group") {
          // don't show legend twice
          item.panel = {
            content: "legend",
            open: false
          };
        }
      }
    });
    var layerlistexpend = new Expand({
      view: view,
      content: layerList
    });
    view.ui.add(layerlistexpend, "bottom-left");

  });

  //-------------------------Layer List End------------------------------------------

  //-------------------------Home Button---------------------------------------------
  var homeBtn = new Home({
    view: view
  });

  // Add the home button to the top left corner of the view
  view.ui.add(homeBtn, "top-left");

  //-------------------------Home Button End-----------------------------------------

  //-------------------------Info Template End---------------------------------------

  //-------------------------Add Feature Layer---------------------------------------
  
  const districtRenderer = {
    type: "simple", // autocasts to SimpleRenderer
    symbol: {
      type: "simple-fill", // autocasts to SimpleFillSymbol
      // color: [51, 51, 204, 0.7],
      outline: {
        color: [0, 0, 369],
        width: 1
      }
    }
  };

  Boundaries = new MapImageLayer({
    url: "https://hsac.org.in/server/rest/services/EODB/EODB_HR21/MapServer/",
    title: "Boundaries",
    visible: true,
    sublayers: [{
      title: "Murabba",
      id: 30,
      visible: true,
    },
    {
      title: "Village",
      id: 28,
      visible: true,
    },
    {
      title: "Tehsil",
      id: 27,
      visible: true,
    },
    {
      title: "District",
      id: 26,
      visible: true,
      renderer:districtRenderer
    },
    ]
  });

  map.add(Boundaries);



  //-------------------------END Add Feature Layer---------------------------------------

  //-------------------------Add Graphic Layer---------------------------------------

  
   // ✅ Example API URL
        const apiUrl = "https://hsac.org.in/API_hsac/API_eodb/getAllUser";  

         const requestBody = {
          // mobile: "8168397965",
        };

        fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {

          console.log(data)
        if(data.status){

          // Assume API returns array of objects [{latitude, longitude, name, description}, ...]
          data.data.forEach(item => {

            const point = {
              type: "point",
              longitude: item.longitude,
              latitude: item.latitude
            };

            // const symbol = {
            //   type: "simple-marker",
            //   color: "blue",
            //   size: "8px",
            //   outline: {
            //     color: "white",
            //     width: 1
            //   }
            // };

          const symbol = {
            type: "picture-marker",
            url: "img/location.png",
            width: "24px",
            height: "24px"
          };

            const attributes = {
              name: item.name,
              mobile: item.mobile,
              login_time: item.login_time,
              logout_time: item.logout_time,
              user_status: item.user_status

            };


const popupTemplate = {
  title: "👤 {name}",
  content: function (feature) {
    const attrs = feature.graphic.attributes;

    function formatDateTime(isoString) {
      if (!isoString) return "-";

      const dateObj = new Date(isoString);

      // Format date dd/mm/yyyy
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();

      // Format time hh:mm
        let hours = dateObj.getHours();
      const minutes = String(dateObj.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 → 12 AM

      return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
    }

    const start = formatDateTime(attrs.login_time);  
    const end = formatDateTime(attrs.logout_time);  
    const status = attrs.user_status || "-";   

    return `
      <div style="font-family:Arial; font-size:13px; line-height:1.5;">
        <p><b>📱 Mobile:</b> ${attrs.mobile}</p>
        <p><b>📌 Status:</b> ${status}</p>
        <p><b>🔑 Login:</b> ${start}</p>
        <p><b>🚪 Logout:</b> ${end}</p> 

      </div>
    `;
  }
};


            const graphic = new Graphic({
              geometry: point,
              symbol: symbol,
              attributes: attributes,
              popupTemplate: popupTemplate
            });

            layer.add(graphic);
          });
        }else{
          alert("No User")
        }
        })
        .catch(err => console.error("POST API Error: ", err));

  //////////////////////////


  $("#clear_search").click(function () {
    clearUpSelection();
    sugetion.clear_search("search_poi");
  });

  $("#clearall").click(function () {
    clearUpSelection();
    rout.clearStop();
  });

  $("#clearrootparams").click(function () {
    rout.clearStop();
  });

  districtNew.getDistricts("#selectDistrict");
  districtNew.getDistricts("#s_selectDistrict");
  districtNew.getDistricts("#j_selectDistrict");
  //------------print----------------------------------------------

  $(".print-btn").click(function () {
    print.printStrat();
  });

  //---------------------------------------------------------------

  //----------------------------------------------------------------
  $(".widgits").click(function () {
    // console.log(track.currentlocation());
    $('.sub_widgits:not(' + $(this).attr("data-target") + ')').slideUp();
    $($(this).attr("data-target")).slideToggle("slow");

  });

  //----------------------------------------------------------------

  //----------------------------------------------------------------------------------------------------------
  $(".accordion-toggle:not(#print_tool)").click(function () {
    //------------------------------------------------------------------------------
    $("#selectDistrict,#s_selectDistrict,#j_selectDistrict").each(function () {
      $(this).prop("selectedIndex", 0);
    });
    $("select:not(#selectDistrict,#s_selectDistrict,#j_selectDistrict)").each(function () {
      $(this).children('option:not(:first)').remove();
    });
    clearUpSelection();
    if ($(this).attr("href") == "#collapseOne") {
      status = 1;
    } else if ($(this).attr("href") == "#collapseTwo") {
      status = 2;
    } else if ($(this).attr("href") == "#collapseThree") {
      status = 3;
    } else if ($(this).attr("href") == "#RoutingOne") {
      rout.clearStop();
    }
    //--------------------------------------------------------------------------
  });
  //------------------------------------------------------------------------------

  //------------------------------------------------------------------------------

  $("#selectDistrict").change(function () {
    //--------------------------------------------------------------------------
    Dcode = $(this).val();
    Dname = $("#selectDistrict option:selected").text();;
    $('#selectTehsil').children('option:not(:first)').remove();
    $('#selectVillage').children('option:not(:first)').remove();
    $('#selectMurabba').children('option:not(:first)').remove();
    $("#selectKhasra").children('option:not(:first)').remove();
    clearUpSelection();
    //--------------------------------------------------------------------------


    if(this.value != -1){
      tehsilNew.getTehsils("#selectTehsil");
      drawBoundary.boundaryOf("district");
    }

  });


  $("#selectTehsil").change(function () {
    //--------------------------------------------------------------------------
    Tcode = $(this).val();

    $('#selectVillage').children('option:not(:first)').remove();
    $('#selectMurabba').children('option:not(:first)').remove();
    $("#selectKhasra").children('option:not(:first)').remove();
    clearUpSelection();
    //--------------------------------------------------------------------------

    if(this.value != -1){
      villageNew.getVillages("#selectVillage");
      drawBoundary.boundaryOf("tehsil");
    }


  });


  $("#selectVillage").change(function () {
    //--------------------------------------------------------------------------
    Nvcode = $(this).val();
    $('#selectMurabba').children('option:not(:first)').remove();
    $("#selectKhasra").children('option:not(:first)').remove();
    clearUpSelection();
    //--------------------------------------------------------------------------
    if(this.value != -1){
      murrabaNew.getMurrabas("#selectMurabba");
      drawBoundary.boundaryOf("village");
    }



  });

  //---------------------------------------------------------------------------------------------------------

});

function clearUpSelection() {
  //view.graphics.removeAll();
  layer.removeAll();
  $(":input").removeClass("error");
  for (var k = GraphicArray.length; k > 0; k--) {
    view.graphics.remove(GraphicArray[k - 1]);
    GraphicArray.pop();
  }
  $("#tbody1").children('tr').remove();
  $("#thead1").children('tr').remove();
}