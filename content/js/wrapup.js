"use strict";

var Smartwrap = Smartwrap || {};


var wrapup = wrapup || {};
wrapup.env = window.env || {};

wrapup.jQuery = window.jQuery;

wrapup.env.server = {};
wrapup.env.server.prefix = wrapup.env.serverprefix || "https://gae-wrapup-server.appspot.com";
wrapup.env.server.querypath = wrapup.env.querypath || "/query";
wrapup.env.server.feedbackpath = wrapup.env.feedbackpath || "/feedback";
wrapup.env.format = wrapup.env.format || "microdata";

console.log(JSON.stringify({ENV: wrapup.env}));

wrapup.microdata = {
  "wrapup-tuple": function(event,detail) {
    //console.log("wrapup: tuple fire");

    detail = detail || event.detail || (event.originalEvent && event.originalEvent.detail);
    detail.format = detail.format || "";
    if (wrapup.env.format !== 'microdata') {
      if (detail.format !== 'microdata') {
        return;
      }
    }
    wrapup.jQuery(event.target).attr("itemscope", "true");
  },
  "wrapup-attr": function(event,detail) {
    //console.log("wrapup: attr fire");

    detail = detail || event.detail || (event.originalEvent && event.originalEvent.detail);
    detail.format = detail.format || "";
    if (wrapup.env.format !== 'microdata') {
      if (detail.format !== 'microdata') {
        return;
      }
    }

    detail.target = detail.wrapupTarget || event.target;
    if (detail.target.nodeType === detail.target.TEXT_NODE) {
      wrapup.jQuery(detail.target).wrap(detail.target.ownerDocument.createElement("span"));
      detail.target = detail.target.parentNode;
    }
    wrapup.jQuery(detail.target).attr("itemprop", detail.name);
  },
};

wrapup.rdfa_lite = {
  "wrapup-tuple": function(event,detail) {
    detail = detail || event.detail || (event.originalEvent && event.originalEvent.detail);
    detail.format = detail.format || "";
    if (wrapup.env.format !== 'rdfa_lite') {
      if (detail.format !== 'rdfa_lite') {
        return;
      }
    }
    wrapup.jQuery(event.target).attr("typeof", detail.name);
  },
  "wrapup-attr": function(event,detail) {
    detail = detail || event.detail || (event.originalEvent && event.originalEvent.detail);
    detail.format = detail.format || "";
    if (wrapup.env.format !== 'rdfa_lite') {
      if (detail.format !== 'rdfa_lite') {
        return;
      }
    }
    detail.target = detail.wrapupTarget || event.target;
    if (detail.target.nodeType === detail.target.TEXT_NODE) {
      wrapup.jQuery(detail.target).wrap(detail.target.ownerDocument.createElement("span"));
      detail.target = detail.target.parentNode;
    }
    wrapup.jQuery(detail.target).attr("property", detail.name);
  },
};

wrapup.emit = function(element, eventName, detail) {
  if (false) {
    element.dispatchEvent(new CustomEvent(eventName, {bubbles:true,detail:detail}));
  } else {
    wrapup.jQuery(element).trigger(eventName, [detail]);
  }
};

wrapup.adhocNSResolver = {
  lookupNamespaceURI: function(prefix) {
    return null;
  }
};

wrapup.getNSResolver = function() {
  if (self.document.createNSResolver) {
    return self.document.createNSResolver(self.document.documentElement);
  }
  
  return wrapup.adhocNSResolver;
};

wrapup.watcher = function(doc) {
  switch (doc.location.protocol) {
    case "chrome:":
      switch (doc.location.hostname) {
        case "wrapup-client":
        case wrapup.env.extname:
          break;
        default:
          return;
      } 
      break;
    case "about:":
      return;
    default:
  }

  var self = {};
  self.document = doc;
  self.url = wrapup.jQuery('base.mirror').data('resolve') || self.document.location.href;  

  self.done = false;

  [wrapup.rdfa_lite, wrapup.microdata].forEach(function(formatter) {
    wrapup.jQuery(self.document.documentElement).on("wrapup-tuple", formatter["wrapup-tuple"]);
    wrapup.jQuery(self.document.documentElement).on("wrapup-attr", formatter["wrapup-attr"]);
  });

  self.feedback = {};
  
  wrapup.jQuery(self.document).on('wrapup_feedback', function(event, detail) {
    //console.log("FEEB: " + JSON.stringify(detail));

    var message = function(detail) {
      if (self.feedback[self.url]) {
	return null; // do not send feedback
      }
      if (self.done) {
	return "wrapper_used";
      }
      return "wrapper_wanted";
    }(detail);

    if (message) {
      self.sendRequest({
	url: [wrapup.env.server.prefix,wrapup.env.server.feedbackpath].join(""),
	querydata: {url:self.url,message:message,wrapper:JSON.stringify(self.wrappers)},
	success: function(data){
	  console.log("FEEDBACK: " + JSON.stringify(data));
	  if (message === 'wrapper_wanted') {
	    self.feedback[self.url] = message;
	  }
        }
      });
    }
  });
    
  self.applySelector = function(obj, context) {
    if (obj.xpathSelector) {
      self.resolver = self.resolver || wrapup.getNSResolver();
      self.defaultNamespace = self.defaultNamespace || self.resolver.lookupNamespaceURI(null);
      obj.resolver = function(prefix) {
        console.log("RESOLVE! " + prefix);
        if (prefix === '_') {
          console.log("RESOLVE1 " + prefix + " --> " + self.defaultNamespace);
          return self.defaultNamespace;
        }
        console.log("RESOLVE2 " + prefix + " --> " + (self.resolver.lookupNamespaceURI(prefix) ||self.defaultNamespace));
        return self.resolver.lookupNamespaceURI(prefix) || self.defaultNamespace;
      };

      //console.log("XPATH: " + obj.xpathSelector);
      try {
	var tuples = wrapup.jQuery(context).xpath(obj.xpathSelector, obj.resolver);
	//console.log("FOUND: " + tuples.length);
	if (tuples.length > 0) {
	  return tuples;
	}
      } catch (ee) {
	console.log("NOPERS: " + ee);
	console.log("NOPERS: " + ee.stack);
      }
    }
    if (obj.xpathSelector) {
      var xpathSelector = obj.xpathSelector.replace(/(\/)_:/, '${1}*:');
      console.log("RETRY: " + obj.xpathSelector + " --> " + xpathSelector);
      var tuples = wrapup.jQuery(context).xpath(obj.xpathSelector, obj.resolver);
      //console.log("FOUND: " + tuples.length);
      if (tuples.length > 0) {
        return tuples;
      }      
    }
    if (obj.cssSelector) {
      console.log("CSS: " + obj.cssSelector);
      var tuples = wrapup.jQuery(context).find(obj.cssSelector);
      return tuples;
      if (tuples.length > 0) {
        return tuples;
      }      
    }
    console.log("NONESUCH");    
    return wrapup.jQuery();
  };

  self.applyWrapper = function(wrapper, context) {
    if (wrapper instanceof Array) {
      wrapper.forEach(function(part) {
        self.applyWrapper(part, context);
      });
      return;
    }

    wrapper.attributes = wrapper.attributes || [];
    wrapper.children = wrapper.children || [];

    context = context || wrapup.jQuery(self.document.documentElement);

    console.log("APPLY: " + JSON.stringify(wrapper));
    console.log("APPLYTO: " + context.get(0).outerHTML.slice(0,200));

    var nsr = wrapup.getNSResolver();
    var def = nsr.lookupNamespaceURI("");
    var resolver = function(prefix) {
      //console.log("ALSO " + nsr.lookupNamespaceURI("")); 
      var output = nsr.lookupNamespaceURI(prefix) || def;
      console.log("PREFIX: " + prefix + " --> " + output);
      return output || def;
    };

    var wrapped = {};
    wrapped.tuples = self.applySelector(wrapper, context);
    console.log("#TUPLED: " + wrapped.tuples.length);    
      
    // check if the wrapper found results in the page
    if (wrapped.tuples.length > 0) {
      console.log("Valid wrapper!");         
      self.sendRequest({
        url: [wrapup.env.server.prefix,wrapup.env.server.feedbackpath].join(""),
	querydata: {url:self.url,message:"pro", wrapper:JSON.stringify(wrapper)},
        success: function(data){
          console.log("PRO: " + JSON.stringify(data));
        }
      });
    } else {
      console.log("Invalid wrapper!");
      self.sendRequest({
        url: [wrapup.env.server.prefix,wrapup.env.server.feedbackpath].join(""),
	//type: 'GET',
	querydata: {url:self.url,message:"contra", wrapper:JSON.stringify(wrapper)},
        success: function(data){
          console.log("CONTRA: " + JSON.stringify(data));
        }
      });

      // return if invalid
      return;   
    }
   
    var detail = {};
    detail.name = wrapper.name;
    detail.type = wrapper.type;
    wrapped.tuples.each(function(ix, elt) {
      //console.log("TUPLE#: " + ix);

      //wrapup.emit(elt, "wrapup-tuple", detail);
      //console.log("TUPLED#: " + ix);

      if (wrapper.attributes instanceof Array) {
        wrapper.attributes.forEach(function(attributeWrapper) {
          var attrElts = self.applySelector(attributeWrapper, wrapup.jQuery(elt));
          var detail2 = Object.create(detail);

          attrElts.each(function(ix2, attrElt) {
            detail2.wrapupTarget = attrElt;
            wrapup.emit(attrElt, "wrapup-attr", detail2);
          });
        });
      } else {
        Object.keys(wrapper.attributes).forEach(function(key) {
          var attributeWrapper = wrapper.attributes[key];
          var attrElts = self.applySelector(attributeWrapper, wrapup.jQuery(elt));
          var detail2 = Object.create(detail);
          detail2.name = key;

          attrElts.each(function(ix2, attrElt) {
            detail2.wrapupTarget = attrElt;
            wrapup.emit(attrElt, "wrapup-attr", detail2);
          });
        });
      }

      wrapup.emit(elt, "wrapup-tuple", detail);

      wrapper.children.forEach(function(kid) {
        self.applyWrapper(kid, wrapup.jQuery(elt));
      });
    });
  };

  self.processWrapper = function(data, statusText, jqxhr) {

    console.log("RESPONSE");
    //console.log("RESPONSE: " + statusText + ":: " + JSON.stringify(data));
    if (! data) {
      return;
    }
    console.log("RESPONSE: " + JSON.stringify({url:data.url}));
    //console.log("RESPONSE w DATA: " + statusText + ":: " + JSON.stringify(data));
    if (! data.wrappers) {
      return;
    }

    console.log("RESPONSE w WRAPPER: " + [this.url, this.data].join("?"));

    self.done = true;

    self.applyWrapper(data.wrappers);
    self.wrappers = data.wrappers;
    
    wrapup.emit(self.document, "wrapup-applied-wrapper", {});
    // apply wrapper to doc
  };

  self.logError = function(jqxhr, statusText) {
    console.log("ERROR: " + statusText);
  };

  self.sendQuery = function(spec) {
    if (self.done) { 
      console.log("IGNORING REQUEST; WRAPPER ALREADY APPLIED");
      return; 
    }

    self.sendRequest(spec);
  };

  self.sendRequest = function(spec) {
    spec.querydata.xo = "true"; // enable CORS

    //console.log("SENDING REQUEST: " + JSON.stringify({qdata:Object.keys(spec.querydata),env:wrapup.env}));
    var req = wrapup.jQuery.ajax({
      url: spec.url || [wrapup.env.server.prefix,wrapup.env.server.querypath].join(""),
      type: spec.type || "POST",
      xhrFields: {
        withCredentials: spec.useCredentials || false
      },
      dataType: spec.dataType || "json",
      data: spec.querydata,
      success: spec.success || self.processWrapper,
      error: spec.error || self.logError
    });
  };

  self.queryByURL = function() {
    console.log("QURL: " + self.url);
    self.sendQuery({querydata:{url:self.url}});
  };
  
  self.queryBySignature = function() {
    var copy = wrapup.jQuery(self.document.documentElement).clone().get(0);
    var treeWalker = self.document.createTreeWalker(copy,NodeFilter.SHOW_TEXT, null, false);
    
    //var nodeList = [];

    //console.log("WALK!");

    while(treeWalker.nextNode()) {
      //nodeList.push(treeWalker.currentNode)
      wrapup.jQuery(treeWalker.currentNode).detach();
    }

    //console.log("WALKED");

    var sig = new XMLSerializer().serializeToString(copy);

    //console.log("SIG: " + sig);

    self.sendQuery({querydata:{signature:sig}});
  };

  self.requeries = 0;
  self.requeryTimeout = 5000;
  self.requery = function() {
    if (self.done) {
      return;
    }

    self.requeries--;

    if (self.requeries < 0) {
      return;
    }

    self.queryBySignature();
    setTimeout(self.requery, self.requeryTimeout);  
    
  };

  self.queryServer = function() {
    //console.log("QUERY SERVER!");

    this.queryByURL();

    this.requery();
  };

  self.wrap = function() {
    //console.log(JSON.stringify({WRAP: 1}));
    //console.log(JSON.stringify({WRAP: 2, SW: (!!Smartwrap), SWDM: (Smartwrap && !!Smartwrap.DocumentMarker)}));

    // CHANGE following line to "...&& false)" to disable span insertions, etc.
    if (Smartwrap && Smartwrap.DocumentMarker && true) {
      var that = this;
      this.markParams = {};
      this.markParams.chunkSize = 100;
      this.markParams.chunkDelay = 5;
      this.markParams.logger = {log: function(obj) { console.log(JSON.stringify(obj)); }};
      this.markParams.settings = this.markSettings = {};
      this.markSettings.fixComments = true;
      this.markSettings.fixAttribute = true;
      this.markSettings.fixLinebreaks = true;
      this.markSettings.fixEltnames = true;
      this.markSettings.computeFeatures = false;      
      this.markParams.finishCallback = function() { that.queryServer(); };
      this.marker = new Smartwrap.DocumentMarker({doc:this.document, params: this.markParams});
      setTimeout(function() { that.marker.mark(); }, 10);
    } else {
      this.queryServer();
    }
  };

  return self;
};

wrapup.jQuery(document).ready(function() { 
  console.log("WRAPUP READY!");
  //wrapup.wrap(document);

  var watcher = new wrapup.watcher(document);
  if (watcher && watcher.wrap) {
    watcher.wrap();
  }
});

console.log("WRAPUP: " + (document.currentScript && document.currentScript.dataset && document.currentScript.dataset.resolve));
