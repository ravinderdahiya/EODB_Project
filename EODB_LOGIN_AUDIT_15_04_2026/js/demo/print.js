define([
    'dojo/dom',
    "esri/tasks/PrintTask",
  "esri/tasks/support/PrintTemplate",
  "esri/tasks/support/PrintParameters",
  "demo/loading"
], function(dom, PrintTask, PrintTemplate, PrintParameters, loading){
    var xyz=0;
   var printTask = new PrintTask({
	   url: "https://hsac.org.in/server/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
	});

	var template = new PrintTemplate({
	 format: "jpg",
	 exportOptions: {
	  width:800,
	  height:1100,
	   dpi: 96
	 },
	 layout: "map-only",
	 layoutOptions: {
	   titleText: "Warren Wilson College Trees",
	   authorText: "Sam"
	 }
	});

	var params = new PrintParameters({
	 //view: view,
	 template: template
	});
    return {
    	printStrat:function(){
    		//console.log(view);
    		loading.active();
    		params.view=view;
    		printTask.execute(params).then(this.printResult, this.printError);
    	},
	    printResult:function(printresult){
	    	//console.log(printresult);
	    	loading.dismis();
	    	if(myWindow != null){
				myWindow.close();
			}
			var print_page=`<div class="jumbotron text-center">
								<img src='`+printresult.url+`' alt='Smiley face' style="transform:rotate(90deg);">
							</div>
							<div class="container">
							  <div class="row">
							    <div class="col-sm-12">
							    	`+document.getElementById("datagrid").innerHTML+`
							    </div>
							  </div><p></p>
							  <div class="row print_footer">
							  	<div class="col-sm-3">
							  	</div>
							    <div class="col-sm-3" id="Success">
							    	<button type="button" class="btn btn-success" onclick="window.print()" style="float:right;">Print</button>
							    </div>
							    <div class="col-sm-3">
									<button type="button" class="btn btn-danger" onclick="self.close()">Close</button>
							    </div>
							    <div class="col-sm-3">
							  	</div>
							  </div>
							</div>`;
			 myWindow= window.open("",  "width="+screen.width+",height="+screen.height+"");
			 //myWindow.document.write("<img src='"+imgurl+"' alt='Smiley face'>");
			 myWindow.document.write("<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css'>");
			 myWindow.document.write("<link rel='stylesheet' href='style/popup.css'>");
			 // myWindow.document.write("<link rel='stylesheet' href='my/css/print.css'>");
			 myWindow.document.write(print_page);
	    },
	    printError:function(printerror){
	    	loading.dismis();
	    	console.log(printerror);
	    }
    };
});