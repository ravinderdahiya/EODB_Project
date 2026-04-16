define(function () {

    //all feature layer url

    // const baseURL = "https://hsacggm.in/map/rest/services/EODB/EODB_HR211/MapServer";
    const baseURL = "https://hsac.org.in/server/rest/services/EODB/EODB_HR21/MapServer";
    const nhaiURL = "https://onemapggm.gmda.gov.in/server/rest/services/NHAI_All/MapServer";
    const roadURL = "https://hsacggm.in/server/rest/services/Onemap_Haryana/Haryana_Roads/MapServer";
    const assetURL = "https://hsacggm.in/server/rest/services/Onemap_Haryana/Government_Assets/MapServer";
    
  return {
    mainURL: baseURL,
    nhaiURL: nhaiURL,
    roadURL: roadURL,
    assetURL:assetURL
  };
});

