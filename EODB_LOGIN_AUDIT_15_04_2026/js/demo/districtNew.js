define([
	'dojo/dom',
	"esri/Graphic",
	"esri/tasks/QueryTask", "esri/tasks/support/Query",
	"esri/geometry/Extent",
	"esri/geometry/SpatialReference",
	"demo/symbole",
	"demo/url"

], function (dom, Graphic, QueryTask, Query, Extent, SpatialReference, symbole,url ) {


	return {
		getDistricts: function (id) {
			var queryTask = new QueryTask({
				 url: url.mainURL+"/26"
			});
			var query = new Query();
			query.outFields = ["*"];
			query.returnDistinctValues = true;
			query.orderByFields = ["n_d_name"];
			query.outSpatialReference = {
				"wkid": 4326
			};
			query.where = `NOT "n_d_code"=' ' and NOT "n_d_name"=' '`;

			queryTask.execute(query).then(function (results) {
				let data = results.features;
				for (let i = 0; i < data.length; i++) {
					let option = document.createElement('option')
					option.value = data[i].attributes.n_d_code;
					option.text = data[i].attributes.n_d_name;
					$(id).append(option);
				}
			});

		}

	};
});