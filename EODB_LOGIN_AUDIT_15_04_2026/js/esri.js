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
  "demo/readurl"


], function (MapView, khewat, timePeriod,
  khatoni,  ownername,  skatchmodel, rout, Symbol, RoutTask, sugetion, 
  search, drawBoundary, ownersInPopup, villageNew, tehsilNew, districtNew, murrabaNew, khasraNew, jamabandi, print, poi, track,  BasemapGallery, LayerList, Home, Expand,
   GraphicsLayer, MapImageLayer, LabelClass, readurl) {


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
  layer.title = "Operational layer";
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

  track.tracking();
  //track.currentlocation();


  Symbol.addSymbole();

  RoutTask.rootParameters();
  //-------------------------SketchViewModel tool------------------------------------

  skatchmodel.setUpSketchViewModel();
  sketchViewModel.on("create", function (event) {
    if (event.state === "complete") {
      // this polygon will be used to query features that intersect it
      //console.log(event);
      polygonGraphicsLayer.remove(event.graphic);
      skatchmodel.selectFeatures(event.graphic.geometry);
    }
  });



  //-------------------------SketchViewModel tool End--------------------------------


  // -------------------------Info Template-------------------------------------------
  var template = { // autocasts as new PopupTemplate()
    title: "Khasra Detail",
    content: [
      {
        type: "text",
        text: "Owners Name:<b><table class='table table-responsive' id='ownertable'></table>"
      },
      {
        type: "fields",
        fieldInfos: [{
          fieldName: "n_d_code",
          label: "District Code",
          visible: true
        },
        {
          fieldName: "n_d_name",
          label: "District Name",
          visible: true,

        },
        {
          fieldName: "n_t_code",
          label: "Tehsil Code",
          visible: true,
          format: {
            digitSeparator: true,
            places: 0
          }
        },
        {
          fieldName: "n_t_name",
          label: "Tehsil Name",
          visible: true,

        },
        {
          fieldName: "n_v_name",
          label: "Village Name",
          visible: true,
          format: {
            digitSeparator: true,
            places: 0
          }
        },

        {
          fieldName: "n_v_code",
          label: "Village Code",
          visible: true,

        },

        {
          fieldName: "n_murr_no",
          label: "Murabba No",
          visible: true,
          format: {
            digitSeparator: true,
            places: 0
          }
        }, {
          fieldName: "n_khas_no",
          label: "Khasra No",
          visible: true,
          format: {
            digitSeparator: true,
            places: 0
          }
        }
        ]
      },


      {
        type: "text",
        text: "{n_d_name:cf1}"
      },



    ]
  };


  cf1 = function (key, value, data) {
    // console.log(data);
    Dcode = data.n_d_code;
    Tcode = data.n_t_code;
    Nvcode = data.n_v_code;
    murabbavalue = data.n_murr_no;
    khasravalue = data.n_khas_no;
    ownersInPopup.Owners_name();
  }

  //-------------------------Info Template End---------------------------------------

  //-------------------------Add Feature Layer---------------------------------------
  
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
    },
    ]
  });


  karnal = new MapImageLayer({
    // url: "https://hsacggm.in/map/rest/services/EODB/Government_Assets/MapServer/",
    url: "https://hsacggm.in/server/rest/services/Onemap_Haryana/Government_Assets/MapServer",
    title: "Government Asset",
    visible: true,
    maxSize: 40,
    minSize: 4,

  });
  NHAI = new MapImageLayer({
    url: "https://onemapggm.gmda.gov.in/server/rest/services/NHAI_All/MapServer/",
    title: "NHAI (Upcoming)",
    visible: false,
  });
  RoadInfra = new MapImageLayer({
    url: "https://hsacggm.in/server/rest/services/Onemap_Haryana/Haryana_Roads/MapServer",
    title: "HR Road Infra",
    visible: false,
  });

  dynamicMapServiceLayer = new MapImageLayer({
    url: "https://hsac.org.in/server/rest/services/EODB/EODB_HR21/MapServer",
    outFields: ["*"],
    title: "Cadastral",
    visible: true,
    sublayers: [{
      title: "Ambala",
      id: 1,
      popupTemplate: template,
    },
    {
      title: "Bhiwani",
      id: 2,
      popupTemplate: template,
    },
    {
      title: "Faridabad",
      id: 3,
      popupTemplate: template,
    },
    {
      title: "Fatehabad",
      id: 4,
      popupTemplate: template,
    },
    {
      title: "Gurugram",
      id: 5,
      popupTemplate: template,
    },
    {
      title: "Hisar",
      id: 6,
      popupTemplate: template,
    },
    {
      title: "Jhajjar",
      id: 7,
      popupTemplate: template,
    },
    {
      title: "Jind",
      id: 8,
      popupTemplate: template,
    },
    {
      title: "Kaithal",
      id: 9,
      popupTemplate: template,
    },
    {
      title: "Karnal",
      id: 10,
      popupTemplate: template,
    },
    {
      title: "Kurukshetra",
      id: 11,
      popupTemplate: template,
    },
    {
      title: "Mahendragad",
      id: 12,
      popupTemplate: template,
    },
    {
      title: "Panchkula",
      id: 13,
      popupTemplate: template,
    },
    {
      title: "Panipat",
      id: 14,
      popupTemplate: template,
    },
    {
      title: "Rewari",
      id: 15,
      popupTemplate: template,
    },
    {
      title: "Rohtak",
      id: 16,
      popupTemplate: template,
    },
    {
      title: "Sirsa",
      id: 17,
      popupTemplate: template,
    },
    {
      title: "Sonipat",
      id: 18,
      popupTemplate: template,
    },
    {
      title: "Yamunanagar",
      id: 19,
      popupTemplate: template,
    },
    {
      title: "Mewat",
      id: 20,
      popupTemplate: template,
    },
    {
      title: "Palwal",
      id: 21,
      popupTemplate: template,
    },
    {
      title: "Charkhi Dadri",
      id: 22,
      popupTemplate: template,
    }
    ]

  });

  map.add(RoadInfra);
  map.add(NHAI);
  map.add(dynamicMapServiceLayer);
  map.add(karnal);
  map.add(Boundaries);

  const statesLabelClass = new LabelClass({
    labelExpressionInfo: {
      expression: "$feature.murrba_no + ' // ' + $feature.khasra_no"
    },
    symbol: {
      type: "text", // autocasts as new TextSymbol()
      color: "black",
      haloSize: 1,
      haloColor: "white"
    }
  });


  //----------View on Click Listioner--------------------------------------------

  view.on("click", function (event) {
    rout.addStop(event.mapPoint);
  });
  //-----------------------------------------------------------------------------
  $("#search_poi").keyup(function () {
    if ($(this).val().length > 0) {
      document.getElementById("sugetion").style.display = "block";
      sugetion.autocomplete(this.id);
    } else {
      document.getElementById("sugetion").style.display = "none";
    }
  });

  $("#clear_search").click(function () {
    clearUpSelection();
    sugetion.clear_search("search_poi");
  });

  $("#clearall").click(function () {
    clearUpSelection();
    clearAllSelected(); //called this new function
    rout.clearStop();
  });
function clearAllSelected() {
  const districtSelects = ["#selectDistrict", "#s_selectDistrict", "#j_selectDistrict"];
  districtSelects.forEach((id) => {
    const el = document.querySelector(id);
    if (el) {
      el.value = "-1";
    }
  });
  const dependentSelects = ["#selectTehsil", "#selectVillage", "#selectMurabba", "#selectKhasra", "#s_selectTehsil", "#s_selectVillage", "#s_selectKhewat", "#j_selectTehsil", "#j_selectVillage", "#j_selectKhewat"];
  dependentSelects.forEach((id) => {
    const el = document.querySelector(id);
    if (el) {
      el.selectedIndex = 0;
      while (el.options.length > 1) {
        el.remove(1);
      }
    }
  });
}

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


  $(document).click(function (e) {
    if (e.toElement.id == "Starting-location") {
      track.addstops();
      document.getElementById("Starting-sugetion").style.display = "none";
    } else if (e.toElement.id == "Destination-location") {
      track.addstops();
      document.getElementById("Destination-sugetion").style.display = "none";
    } else if (e.toElement.id == "Starting") {
      document.getElementById("Destination-sugetion").style.display = "none";
      if (track.checkstatus()) {
        document.getElementById("Starting-sugetion").style.display = "block";
      }

      ViewClickCount = 1;
    } else if (e.toElement.id == "Destination") {
      ViewClickCount = 2;
      document.getElementById("Starting-sugetion").style.display = "none";
      if (track.checkstatus()) {
        document.getElementById("Destination-sugetion").style.display = "block";
      }
    } else if (e.toElement.id == "search_poi") {
      document.getElementById("sugetion").style.display = "block";
    } else {
      document.getElementById("Destination-sugetion").style.display = "none";
      document.getElementById("Starting-sugetion").style.display = "none";
      document.getElementById("sugetion").style.display = "none";
    }
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

  //....................Search bar ...............................................
  search.searching();
  //.................Search Bar end...............................................

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

  $("#selectMurabba").change(function () {
    //--------------------------------------------------------------------------
    murabbavalue = $(this).val();
    $("#selectKhasra").children('option:not(:first)').remove();
    clearUpSelection();
    //--------------------------------------------------------------------------
    if(this.value != -1){
      khasraNew.getKhasras("#selectKhasra");
      drawBoundary.boundaryOf("murabba");
    }

  });

  $("#selectKhasra").change(function () {
    //--------------------------------------------------------------------------
    khasravalue = $(this).val();
    clearUpSelection();
    //--------------------------------------------------------------------------
    if(this.value != -1){
      ownername.Owner_name();
      drawBoundary.boundaryOf("khasra");
    }
  });
  //---------------------------------------------------------------------------------------------------------
 //----------------------------------------------------------------------------------------------------------

  $("#s_selectDistrict").change(function () {
    //------------------------------------------------------------------------------
    Dcode = $(this).val();
    $('#s_selectTehsil').children('option:not(:first)').remove();
    $('#s_selectVillage').children('option:not(:first)').remove();
    $('#s_selectKhewat').children('option:not(:first)').remove();
    $('#s_selectKhatoni').children('option:not(:first)').remove();
    clearUpSelection();

    //------------------------------------------------------------------------------
    if(this.value != -1){
      tehsilNew.getTehsils("#s_selectTehsil");
      drawBoundary.boundaryOf("district");
    }
  });


  $("#s_selectTehsil").change(function () {
    //-----------------------------------------------------------------------------
    Tcode = $(this).val();
    $('#s_selectVillage').children('option:not(:first)').remove();
    $('#s_selectKhewat').children('option:not(:first)').remove();
    //$('#s_selectKhatoni').children('option:not(:first)').remove();
    clearUpSelection();

    //-----------------------------------------------------------------------------
    if(this.value != -1){
      villageNew.getVillages("#s_selectVillage");
      drawBoundary.boundaryOf("tehsil");
    }
  });

  $("#s_selectVillage").change(function () {
    //-----------------------------------------------------------------------------
    Nvcode = $(this).val();
    $('#s_selectKhewat').children('option:not(:first)').remove();
    //$('#s_selectKhatoni').children('option:not(:first)').remove();

    clearUpSelection();

    //-----------------------------------------------------------------------------
    if(this.value != -1){
      drawBoundary.boundaryOf("village");
      khewat.Khewatoption("#s_selectKhewat", this.id);
      timePeriod.TimePeriodOption();
    }

  });

  $("#s_selectKhewat").change(function () {
    //-----------------------------------------------------------------------------
    GetKhewats = $(this).val();
    //$('#s_selectKhatoni').children('option:not(:first)').remove();
    clearUpSelection();

    //-----------------------------------------------------------------------------
    if(this.value != -1){
      khatoni.getkhatoni(this.id);
      ownername.Owner_name();
    }
  });
 
  //--------------------------------------------------Jamabandi--------------------------------------------------
  //----------------------------------------------------------------------------------------------------------

  $("#j_selectDistrict").change(function () {
    //------------------------------------------------------------------------------
    Dcode = $(this).val();
    $('#j_selectTehsil').children('option:not(:first)').remove();
    $('#j_selectVillage').children('option:not(:first)').remove();
    $('#j_selectKhewat').children('option:not(:first)').remove();
    clearUpSelection();

    //------------------------------------------------------------------------------
    if(this.value != -1){
      tehsilNew.getTehsils("#j_selectTehsil");
      drawBoundary.boundaryOf("district");
    }
  });


  $("#j_selectTehsil").change(function () {
    //-----------------------------------------------------------------------------
    Tcode = $(this).val();
    $('#j_selectVillage').children('option:not(:first)').remove();
    $('#j_selectKhewat').children('option:not(:first)').remove();
    clearUpSelection();

    //-----------------------------------------------------------------------------
    if(this.value != -1){
      villageNew.getVillages("#j_selectVillage");
      drawBoundary.boundaryOf("tehsil");
    }
  });

  $("#j_selectVillage").change(function () {
    //-----------------------------------------------------------------------------
    Nvcode = $(this).val();
    $('#j_selectKhewat').children('option:not(:first)').remove();
    clearUpSelection();

    //-----------------------------------------------------------------------------
    if(this.value != -1){
      drawBoundary.boundaryOf("village");
      khewat.Khewatoption("#j_selectKhewat", this.id);
      timePeriod.TimePeriodOption();
    }
  });

  $("#j_selectKhewat").change(function () {
    //-----------------------------------------------------------------------------
    GetKhewats = $(this).val();
    clearUpSelection();

    //-----------------------------------------------------------------------------
    if(this.value != -1){
      jamabandi.JamaBandiData();
    }
  });

  //------------------------------------------------------------------------------------------
  //-----------------------------POI Search---------------------------------------------------
  $("#poi_search").click(function () {
    clearUpSelection();
    poi.poisearch(1);
  });

  //By url parametrs..................................................................
  readurl.geturl();
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
  $("#Jamabandi-tab").children().remove();
  closedatagrid();
  document.getElementById("embed-btn").value = "Copy";
  document.getElementById("grid").innerHTML = "";
}