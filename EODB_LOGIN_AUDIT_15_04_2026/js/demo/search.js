define([
  "dojo/dom",
  "esri/widgets/Search",
  "demo/url"
], function (dom, Search,url) {
  return {
    searching: function () {
      var searchWidget = new Search({
        view: view,
        // includeDefaultSources:false,
        allPlaceholder: "Address or Places",
        sources: [{
            featureLayer: {
              url: url.mainURL+"/26",
              
              popupTemplate: { // autocasts as new PopupTemplate()
                title: "District {n_d_name}",
                overwriteActions: true
              }
            },
            searchFields: ["n_d_name"],
            displayField: "n_d_name",
            exactMatch: false,
            outFields: ["n_d_name"],
            name: "Search District",
            placeholder: "example: Rohtak",
          }, {
            featureLayer: {
              url: url.mainURL+"/27",
              popupTemplate: { // autocasts as new PopupTemplate()
                title: "Tehsil {n_t_name}",
                overwriteActions: true
              }
            },
            searchFields: ["n_t_name"],
            displayField: "n_t_name",
            exactMatch: false,
            outFields: ["n_t_name"],
            name: "Search Tehsil",
            placeholder: "example: Rohtak",
          },
          {
            featureLayer: {
              url: url.mainURL+"/28",
              popupTemplate: { // autocasts as new PopupTemplate()
                title: "Village {n_v_name}",
                overwriteActions: true
              }
            },
            searchFields: ["n_v_name"],
            displayField: "n_v_name",
            exactMatch: false,
            outFields: ["n_v_name"],
            name: "Search Village",
            placeholder: "example: Anwal",
          },
          // {
          // featureLayer: {
          // url: "https://hsac.org.in/server/rest/services/EODB/EODB_HR21/MapServer/24",
          // popupTemplate: { // autocasts as new PopupTemplate()
          // title: "{name}",
          // overwriteActions: true
          // }
          // },
          // searchFields: ["name"],
          // displayField: "name",
          // exactMatch: false,
          // outFields: ["*"],
          // name: "Search POI",
          // placeholder: "example: Atm",
          // }
        ]
      });

      // Add the search widget to the top left corner of the view
      view.ui.add(searchWidget, {
        position: "top-right"
      });
    }
  }


});