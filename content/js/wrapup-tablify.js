

var tablify = function(jQuery) {
  "use strict";
  
  var self = {};

  self.scopes = {};
  self.props = {};
    
  self.setTemplate = function(template) {
    console.log("SETTEMPL!");
    self.tableTempl = jQuery(template);
    console.log("SETTEMPL: " + jQuery(self.tableTempl).length);
  };
  
  self.addColumn = function(itemprop, table) {
    var templateRow = jQuery(table).data("templateRow");
    var headerRow = jQuery(table).find("thead tr");

    if (! self.props[itemprop]) {
      self.props[itemprop] = {};
      if (itemprop.match(/^COL0/)) {
        self.props[itemprop].colhead = ['COLUMN',Object.keys(self.props).length].join(" ");
      } else {
        self.props[itemprop].colhead = itemprop;
      }
    }
      
    var headerCell = jQuery(self.tableTempl).find("thead tr th").first().clone();
    headerCell.attr("itemprop", itemprop);
    headerCell.empty();
    headerCell.text(self.props[itemprop].colhead || itemprop);
    headerCell.appendTo(jQuery(headerRow));
    
    var templateCell = jQuery(self.tableTempl).find("tbody tr td").first().clone();
    templateCell.empty();
    templateCell.attr("itemprop", itemprop);
    //templateCell.text(jQuery(cellElt).attr("itemprop"));
    templateCell.appendTo(jQuery(templateRow));
    
    return templateCell;    
  };

  self.tablifyTuple = function(tupleElt) {
    var tuplescope = jQuery(tupleElt).attr("itemscope");
    if (! self.scopes[tuplescope]) {
      var injectTable = jQuery(self.tableTempl).clone();
      //jQuery(injectTable).appendTo(jQuery(div));

      var templateRow = jQuery(self.tableTempl).find("tbody tr").clone();
      jQuery(templateRow).append(jQuery(templateRow).find("td").clone());
      jQuery(templateRow).empty();
      jQuery(injectTable).data("templateRow", templateRow);

      jQuery(injectTable).find("thead tr, tbody").empty();

      var range = document.createRange();
      range.selectNode(jQuery(tupleElt).get(0));
      jQuery(injectTable).data("range", range);

      var dataObj = {
        json: [],
	addRow: function(row) { this.json.push(row); },
	cleanCell: function(celltext) {
	  return celltext.trim().split(/\s+/).join(' ');
	},
	csvQuote: function(o) {
	  return '"' + o.toString().replace(/\"/g,'""') + '"';
	},
	htmlQuote: function(o) {
	  return o.toString();
	},
	getCSV: function() {
	  var that = this;
	  var csvlines = this.json.map(function(row) {
	    return row.map(that.csvQuote).join(',');
	  });
	  return csvlines.join("\n");
	},
	getInnerHTML: function() {
	  var that = this;
	  var rows = this.json.map(function(row) {
	    return row.map(that.htmlQuote).join('</td><td>');
	  });
	  return rows.join('</td></tr><tr><td>');
	},
	getHTML: function() {
	  var tableElt = document.createElement('table');
	  this.json.forEach(function(row) {
	    var rowElt = document.createElement('tr');
	    row.forEach(function(cell) {
	      var cellElt = document.createElement('td');
	      cellElt.appendChild(document.createTextNode(cell));
	      rowElt.appendChild(cellElt);
	    });
	    tableElt.appendChild(rowElt);  
	  });
	  return new XMLSerializer().serializeToString(tableElt);
	},
      };
      jQuery(injectTable).data("table-data", dataObj);
	
      self.scopes[tuplescope] = injectTable;
    }

    var table = self.scopes[tuplescope];
    var templateRow = jQuery(table).data("templateRow");
    
    var range = jQuery(table).data("range");
    range.setEndAfter(jQuery(tupleElt).get(0));
      
    var newrow = jQuery(templateRow).clone();      
    jQuery(newrow).appendTo(jQuery(table).find("tbody"));

    var dataObj = jQuery(table).data("table-data");
    var datarow = [];
    
    jQuery(tupleElt).find("*[itemprop]").each(function(ix, cellElt) {
      var itemprop = jQuery(cellElt).attr("itemprop");
      var cell = jQuery(newrow).find("td[itemprop]").filter(function(ix,x) { return jQuery(x).attr("itemprop") === itemprop; });

      if (jQuery(cell).size() === 0) {
        var templateCell = self.addColumn(itemprop, table);
        
        cell = templateCell.clone();
        cell.appendTo(jQuery(newrow));
      }

      var cellContents = jQuery(cellElt).clone();

      datarow.push(dataObj.cleanCell(cellContents.text()));
      
      jQuery(cell).empty();
      jQuery(cell).append(jQuery(cellContents));
    });

    dataObj.addRow(datarow);
    
    jQuery(table).find("td > td").replaceWith(function() { return jQuery("<span/>").append(jQuery(this).contents()); });
      
    return table;      
  };

  self.tablify = function() {
    var output = {};

    var tables = {};
    jQuery("*[itemscope]").each(function(ix, tupleElt) {
      //setTimeout(function() { tablifyTuple(tupleElt) }, 2000*ix);
      var itemscope = jQuery(tupleElt).attr("itemscope");
        
      tables[itemscope] = self.tablifyTuple(tupleElt);
    });

    for (var itemscope in tables) {
      output[itemscope] = {};
      output[itemscope].table = tables[itemscope];
      output[itemscope].range = jQuery(output[itemscope].table).data("range");
      output[itemscope].dataObj = jQuery(output[itemscope].table).data("table-data");
      //setTimeout(function() { range.deleteContents(); }, 5000);

      console.log("RANGE: " + (!! output[itemscope].range));
	
      output[itemscope].container = output[itemscope].range.commonAncestorContainer;
      //jQuery(table).insertBefore(container);
      console.log("CONT: " + (output[itemscope].container.nodeType) + " :: " + Node.DOCUMENT_NODE);

      //jQuery(container).hide();
    
      //console.log("INJECT");
    }

    return output;
  };
  
  return self;
}(window.jQuery);

