

(function(jQuery) {
  console.error("CSV!");

  var getTabname = function(prefix, tabname) {
    var out = [prefix,tabname].join("-");
    console.log("TABNAME " + [[prefix,tabname].join('-'), out].join('='));
    return out;
  };

  var linkTab = function(tabsContainer, prefix, tabname) {
    console.log("link " + tabname + " :div: " + jQuery(tabsContainer).find("div.wrapup-" + tabname).length);
    
    jQuery(tabsContainer).find("div.wrapup-" + tabname).first().attr("id", getTabname(prefix, tabname));
    jQuery(tabsContainer).find("a.wrapup-" + tabname).first().attr("href", '#' + getTabname(prefix, tabname));
  };
  
  jQuery(document).on('wrapup-applied-wrapper', function() {
    console.log("CSVCSV: " + jQuery(".wrapup-table").length);

    if (jQuery(".wrapup-table").length > 1) {
      return;
    }
    
    tablify.setTemplate(jQuery(".wrapup-table").last());
    var tables = tablify.tablify();
    //var tables = {"true":{container:jQuery("body > div > table").first()}}; //tablify.tablify();

    var csvTemplate = jQuery(".wrapup-tabs").last();
    
    for (itemscope in tables) {
      console.log("TABLE: " + itemscope);
      var table = tables[itemscope];

      var tabsContainer = jQuery(csvTemplate).clone();

      if (table.container.nodeType === Node.DOCUMENT_NODE) {
	continue;
      }
      
      var insertPoint = jQuery(table.container);
      while (jQuery(insertPoint).is("table > pop")) {
        insertPoint = jQuery(insertPoint).parent();
      }
      
      jQuery(tabsContainer).insertBefore(jQuery(insertPoint).first());
      
      if (true) {
        jQuery(table.container).appendTo(jQuery(tabsContainer).find(".panel.wrapup-rawtab").first());
        jQuery(table.table).appendTo(jQuery(tabsContainer).find(".panel.wrapup-tabletab").first());
      }

      //console.error("TABDATA: %s", JSON.stringify(table.dataObj.json, null, 2));
      var jsonblob = new Blob([JSON.stringify(table.dataObj.json, null, 2)]);
      jQuery(".panels a.json").attr("href", window.URL.createObjectURL(jsonblob));
      jQuery(".panels a.json").attr("download", "table.json");

      var csvblob = new Blob([table.dataObj.getCSV()]);
      jQuery(".panels a.csv").attr("href", window.URL.createObjectURL(csvblob));
      jQuery(".panels a.csv").attr("download", "table.csv");

      //console.error("INNERHTML: %s", table.dataObj.getInnerHTML());
      // these templates gratefully cribbed from excellent export:
      // https://github.com/jmaister/excellentexport
      var xlsblob = new Blob(['<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>',
			      'sheet 1',
			      '</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>',
			      table.dataObj.getHTML(),
			      '</body></html>']);
      jQuery(".panels a.xls").attr("href", window.URL.createObjectURL(xlsblob));
      jQuery(".panels a.xls").attr("download", "table.xls");

      var xbrwcfg = {};
      if (window.xbrw) {
	if (window.xbrw.manifest) {
	  xbrwcfg = window.xbrw.manifest.config;
	}
      }
      console.error("XBRW: " + JSON.stringify(xbrwcfg));

      xbrwcfg.drivehelper_server = xbrwcfg.drivehelper_server || "";
      
      jQuery(".panels iframe.googleSheet").attr("src",
						[xbrwcfg.drivehelper_server,
						 "share2drive.html?data=9,7,4,127"].join("/"));
      
      setTimeout(function() {
	var ifrw = {};
	ifrw.window = jQuery(".panels iframe.googleSheet").first().get(0).contentWindow;
	ifrw.message = {csv:table.dataObj.getCSV()};
	
	ifrw.window.postMessage(ifrw.message, '*');
      }, 500);

      if (false) {
        linkTab(tabsContainer, itemscope, "rawtab");
        linkTab(tabsContainer, itemscope, "tabletab");
        linkTab(tabsContainer, itemscope, "downloadtab");
        linkTab(tabsContainer, itemscope, "abouttab");
      }

      jQuery(".tabs .tab").on('click', function(event) {
        jQuery(".tabs .tab").removeClass("selected");
        jQuery(".panels .panel").removeClass("selected");

        jQuery(this).addClass("selected");
        var panelname = jQuery(this).attr("data-panelname");
        var panel = jQuery(".panels .panel").filter(function(ix, elt) {
          //console.log("PNLCHK: " + jQuery(elt).attr("data-panelname") + " =?= " + panelname);
          return jQuery(elt).attr("data-panelname") === panelname;
        });
        jQuery(panel).addClass("selected");
      });

      jQuery(".panels").on('dblclick', function(event) {
	  var blob = new Blob(['lmnop,23','abc,ddd,fefe']);
	  jQuery(".panels a.csv").attr("href", window.URL.createObjectURL(blob));
	  jQuery(".panels a.csv").attr("download", "bazbar.txt");
	  console.log('ok: ' + jQuery(".panels a.csv").attr("href"));

      });
      
    }
  });
}(window.jQuery));

