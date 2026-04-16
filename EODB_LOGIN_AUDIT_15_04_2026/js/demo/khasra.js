define([
	'dojo/dom',
	'demo/geom'
], function (dom, geom) {


	return {
		getkhasraUrl: function (murabbarray) {
			//console.log(murabbanumbers);
			//console.log(khatoninumbers);
			khasranumbers = [];
			var khasraurl = [];
			for (var i = 0; i < khatoninumbers.length; i++) {
				for (var j = 0; j < murabbarray[i].length; j++) {
					//console.log("https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetKhasra?"+"Dcode1="+Dcode+"&Tcode1="+Tcode+"&Nvcode1="+Nvcode+"&period1="+GetJamabandiPeriod+"&khewat1="+GetKhewats+"&Khatoni1="+khatoninumbers[i]+"&Mustno1="+murabbarray[i][j].replace(/'/g, '')+"");
					khasraurl.push("https://hsac.org.in/LandOwnerAPI/getownername.asmx/GetKhasra?" + "Dcode1=" + Dcode + "&Tcode1=" + Tcode + "&Nvcode1=" + Nvcode + "&period1=" + GetJamabandiPeriod + "&khewat1=" + GetKhewats + "&Khatoni1=" + khatoninumbers[i] + "&Mustno1=" + murabbarray[i][j].replace(/'/g, '') + "");
					if (i == khatoninumbers.length - 1 && j == murabbarray[i].length - 1) {
						this.getkhasra(khasraurl);
					}
				}
			}


		},
		getkhasra: function (url) {
			var ulrlength = url.length;
			khas = 0;
			getkhasras(ulrlength - 1);

			function getkhasras(l) {
				if (l > -1) {
					$.ajax({
						url: url[khas],
						type: "GET",
						dataType: "xml",
						success: function (result) {

							if (result != null) {
								var parser = new DOMParser();
								var a = parser.parseFromString(result.documentElement.firstChild.textContent, "text/xml");
								//console.log(a);
								if (a.getElementsByTagName('khas').length > 0) {
									var innerarray = [];
									for (var i = 0; i < a.getElementsByTagName('khas').length; i++) {
										innerarray.push("'" + a.getElementsByTagName('khas')[i].childNodes[0].nodeValue.trim() + "'");
										if (i == a.getElementsByTagName('khas').length - 1) {
											khasranumbers[khas] = innerarray;
											khas++;
										}
									}
								}
								return getkhasras(l - 1);

							}
						}
					});
				} else {
					geom.KhasraSymbole();
					return -1;
				}

			}

		}

	};

});