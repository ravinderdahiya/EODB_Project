define([
  'demo/timePeriod',
  "demo/ownername",
  "demo/khatoni",
  "demo/drawBoundary",

], function (timePeriod, ownername, khatoni, drawBoundary) {


  return {
    geturl: function () {

      let url = window.location.href;
      let urlarray = url.split("?");
      let data = urlarray[1];
      if (data) {
        var dataarray = data.split("&");
        Dcode = dataarray[0].split("=")[1];
        Tcode = dataarray[1].split("=")[1];
        Nvcode = dataarray[2].split("=")[1];
      } else {
        dataarray = ''
      }


      if (dataarray.length == 4) {
        urlstatus = 100;
        GetKhewats = dataarray[3].split("=")[1];
        GetKhewats = GetKhewats.replace(/#/g, "");
        timePeriod.TimePeriodOption();
      } else if (dataarray.length == 5) {
        murabbavalue = dataarray[3].split("=")[1];
        khasravalue = dataarray[4].split("=")[1];
        khasravalue = khasravalue.replace(/#/g, "");
        status = 1;
        ownername.Owner_name();
        drawBoundary.boundaryOf("khasra");
      }
    }

  };
});