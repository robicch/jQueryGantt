/*
 Copyright (c) 2012-2018 Open Lab
 Written by Roberto Bicchierai and Silvia Chelazzi http://roberto.open-lab.com
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

$.gridify = function (table, opt) {
  var options = {
    resizeZoneWidth: 10
  };

  $.extend(options, opt);

  var box = $("<div>").addClass("gdfWrapper");
  box.append(table);

  var head = table.clone();
  head.addClass("table ganttFixHead");
  //remove non head
  head.find("tbody").remove();
  box.append(head);

  box.append(table);

  var hTh = head.find(".gdfColHeader");
  var cTh = table.find(".gdfColHeader");
  for (var i = 0; i < hTh.length; i++) {
    hTh.eq(i).data("fTh", cTh.eq(i));
  }

  //--------- set table to 0 to prevent a strange 100%
  table.width(0);
  head.width(0);


  //----------------------  header management start
  head.find("th.gdfColHeader:not(.gdfied)").mouseover(function () {
    $(this).addClass("gdfColHeaderOver");

  }).on("mouseout.gdf", function () {
    $(this).removeClass("gdfColHeaderOver");
    if (!$.gridify.columInResize) {
      $("body").removeClass("gdfHResizing");
    }

  }).on("mousemove.gdf", function (e) {
    if (!$.gridify.columInResize) {
      var colHeader = $(this);
      var nextCol = colHeader.next();
      if (nextCol.length > 0 && nextCol.outerWidth() < options.resizeZoneWidth)
        colHeader = nextCol;

      if (!colHeader.is(".gdfResizable"))
        return;

      var mousePos = e.pageX - colHeader.offset().left;

      if (colHeader.outerWidth() - mousePos < options.resizeZoneWidth) {
        $("body").addClass("gdfHResizing");
      } else {
        $("body").removeClass("gdfHResizing");
      }
    }

  }).on("mousedown.gdf", function (e) {
    //console.debug("mousedown.gdf")
    var colHeader = $(this);

    var nextCol = colHeader.next();
    if (nextCol.length > 0 && nextCol.outerWidth() < options.resizeZoneWidth)
      colHeader = nextCol;

    if (!colHeader.is(".gdfResizable"))
      return;

    var mousePos = e.pageX - colHeader.offset().left;
    if (colHeader.outerWidth() - mousePos < options.resizeZoneWidth) {
      $("body").unselectable();
      $.gridify.columInResize = colHeader;
      //on event for start resizing
      $(document).on("mousemove.gdf", function (e) {

        e.preventDefault();
        $("body").addClass("gdfHResizing");

        //manage resizing
        var w = e.pageX - $.gridify.columInResize.offset().left;
        w = w <= 1 ? 1 : w;
        $.gridify.columInResize.outerWidth(w);
        $.gridify.columInResize.data("fTh").outerWidth(w);


        //on mouse up on body to stop resizing
      }).on("mouseup.gdf", function () {
        //console.debug("mouseup.gdf")
        $(this).off("mousemove.gdf").off("mouseup.gdf").clearUnselectable();
        $("body").removeClass("gdfHResizing");
        delete $.gridify.columInResize;

        //save columns dimension
        storeGridState();

      });
    }

  }).on("dblclick.gdf", function () {
    //console.debug("dblclick.gdf")
    var col = $(this);

    if (!col.is(".gdfResizable"))
      return;

    var idx = $("th", col.parents("table")).index(col);
    var columnTd = $("td:nth-child(" + (idx + 1) + ")", table);
    var w = 0;
    columnTd.each(function () {
      var td = $(this);
      var content = td.children("input").length ? td.children("input").val() : td.html();
      var tmp = $("<div/>").addClass("columnWidthTest").html(content).css({position: "absolute"});
      $("body").append(tmp);
      w = Math.max(w, tmp.width() + parseFloat(td.css("padding-left")));
      tmp.remove();
    });

    w = w + 5;
    col.outerWidth(w);
    col.data("fTh").width(w);

    //save columns dimension
    storeGridState();
    return false;

  }).addClass("gdfied unselectable").attr("unselectable", "true");


  function storeGridState() {
    //console.debug("storeGridState");
    if (localStorage) {
      var gridState = {};

      var colSizes = [];
      $(".gdfTable .gdfColHeader").each(function () {
        colSizes.push($(this).outerWidth());
      });

      gridState.colSizes = colSizes;

      localStorage.setObject("TWPGanttGridState", gridState);
    }
  }

  function loadGridState() {
    //console.debug("loadGridState")
    if (localStorage) {
      if (localStorage.getObject("TWPGanttGridState")) {
        var gridState = localStorage.getObject("TWPGanttGridState");
        if (gridState.colSizes) {
          box.find(".gdfTable .gdfColHeader").each(function (i) {
            $(this).width(gridState.colSizes[i]);
          });
        }
      }
    }
  }

  loadGridState();
  return box;
};




$.splittify = {
  init: function (where, first, second, perc) {

    //perc = perc || 50;

    var element = $("<div>").addClass("splitterContainer");
    var firstBox = $("<div>").addClass("splitElement splitBox1");
    var splitterBar = $("<div>").addClass("splitElement vSplitBar").attr("unselectable", "on").css("padding-top", where.height() / 2 + "px");
    var secondBox = $("<div>").addClass("splitElement splitBox2");


    var splitter = new Splitter(element, firstBox, secondBox, splitterBar);
    splitter.perc =  perc;

    //override with saved one
    loadPosition();

    var toLeft = $("<div>").addClass("toLeft").html("{").click(function () {splitter.resize(0.001, 300);});
    splitterBar.append(toLeft);

    var toCenter = $("<div>").addClass("toCenter").html("&#xa9;").click(function () {splitter.resize(50, 300);});
    splitterBar.append(toCenter);

    var toRight = $("<div>").addClass("toRight").html("}").click(function () {splitter.resize(99.9999, 300);});
    splitterBar.append(toRight);


    firstBox.append(first);
    secondBox.append(second);

    element.append(firstBox).append(secondBox).append(splitterBar);

    where.append(element);

    var totalW = where.innerWidth();
    var splW = splitterBar.width();
    var fbw = totalW * perc / 100 - splW;
    fbw = fbw > totalW - splW - splitter.secondBoxMinWidth ? totalW - splW - splitter.secondBoxMinWidth : fbw;
    firstBox.width(fbw).css({left: 0});
    splitterBar.css({left: firstBox.width()});
    secondBox.width(totalW - fbw - splW).css({left: firstBox.width() + splW});

    splitterBar.on("mousedown.gdf", function (e) {

      e.preventDefault();
      $("body").addClass("gdfHResizing");

      $.splittify.splitterBar = $(this);
      //on event for start resizing
      //console.debug("start splitting");
      $("body").unselectable().on("mousemove.gdf", function (e) {
        //manage resizing
        e.preventDefault();

        var sb = $.splittify.splitterBar;
        var pos = e.pageX - sb.parent().offset().left;
        var w = sb.parent().width();
        var fbw = firstBox;

        pos = pos > splitter.firstBoxMinWidth ? pos : splitter.firstBoxMinWidth;
        //pos = pos < realW - 10 ? pos : realW - 10;
        pos = pos > totalW - splW - splitter.secondBoxMinWidth ? totalW - splW - splitter.secondBoxMinWidth : pos;
        sb.css({left: pos});
        firstBox.width(pos);
        secondBox.css({left: pos + sb.width(), width: w - pos - sb.width()});
        splitter.perc = (firstBox.width() / splitter.element.width()) * 100;

        //on mouse up on body to stop resizing
      }).on("mouseup.gdf", function () {
        //console.debug("stop splitting");
        $(this).off("mousemove.gdf").off("mouseup.gdf").clearUnselectable();
        delete $.splittify.splitterBar;

        $("body").removeClass("gdfHResizing");

        storePosition();
      });
    });


    // keep both side in synch when scroll
    var stopScroll = false;
    var fs = firstBox.add(secondBox);
    var lastScrollTop=0;
    fs.scroll(function (e) {
      var el = $(this);
      var top = el.scrollTop();

      var firstBoxHeader = firstBox.find(".ganttFixHead");
      var secondBoxHeader = secondBox.find(".ganttFixHead");

      if (el.is(".splitBox1") && stopScroll != "splitBox2") {
        stopScroll = "splitBox1";
        secondBox.scrollTop(top);
      } else if (el.is(".splitBox2") && stopScroll != "splitBox1") {
        stopScroll = "splitBox2";
        firstBox.scrollTop(top);
      }


      if (Math.abs(top-lastScrollTop)>10) {
	    firstBoxHeader.css('top', top).hide();
	    secondBoxHeader.css('top', top).hide();
      }
      lastScrollTop=top;

      where.stopTime("reset").oneTime(100, "reset", function () {

	      stopScroll = "";
	      top = el.scrollTop();

	      firstBoxHeader.css('top', top).fadeIn();
	      secondBoxHeader.css('top', top).fadeIn();

      });

    });


    firstBox.on('mousewheel MozMousePixelScroll', function (event) {

      event.preventDefault();

      var deltaY = event.originalEvent.wheelDeltaY;
      if (!deltaY)
        deltaY = event.originalEvent.wheelDelta;
      var deltaX = event.originalEvent.wheelDeltaX;

      if (event.originalEvent.axis) {
        deltaY = event.originalEvent.axis == 2 ? -event.originalEvent.detail : null;
        deltaX = event.originalEvent.axis == 1 ? -event.originalEvent.detail : null;
      }

      deltaY = Math.abs(deltaY) < 40 ? 40 * (Math.abs(deltaY) / deltaY) : deltaY;
      deltaX = Math.abs(deltaX) < 40 ? 40 * (Math.abs(deltaX) / deltaX) : deltaX;

      var scrollToY = secondBox.scrollTop() - deltaY;
      var scrollToX = firstBox.scrollLeft() - deltaX;

//			console.debug( firstBox.scrollLeft(), Math.abs(deltaX), Math.abs(deltaY));

      if (deltaY) secondBox.scrollTop(scrollToY);
      if (deltaX) firstBox.scrollLeft(scrollToX);

      return false;
    });


    function Splitter(element, firstBox, secondBox, splitterBar) {
      this.element = element;
      this.firstBox = firstBox;
      this.secondBox = secondBox;
      this.splitterBar = splitterBar;
      this.perc = 0;
      this.firstBoxMinWidth = 0;
      this.secondBoxMinWidth = 30;

      this.resize = function (newPerc, anim) {
        var animTime = anim ? anim : 0;
        this.perc = newPerc ? newPerc : this.perc;
        var totalW = this.element.width();
        var splW = this.splitterBar.width();
        var newW = totalW * this.perc / 100;
        newW = newW > this.firstBoxMinWidth ? newW : this.firstBoxMinWidth;
        newW = newW > totalW - splW - splitter.secondBoxMinWidth ? totalW - splW - splitter.secondBoxMinWidth : newW;
        this.firstBox.animate({width: newW}, animTime, function () {$(this).css("overflow-x", "auto")});
        this.splitterBar.animate({left: newW}, animTime);
        this.secondBox.animate({left: newW + this.splitterBar.width(), width: totalW - newW - splW}, animTime, function () {$(this).css("overflow", "auto")});

        storePosition();
      };

      var self = this;
      this.splitterBar.on("dblclick", function () {
        self.resize(50, true);
      })
    }


    function storePosition () {
      //console.debug("storePosition",splitter.perc);
      if (localStorage) {
        localStorage.setItem("TWPGanttSplitPos",splitter.perc);
      }
    }

    function loadPosition () {
      //console.debug("loadPosition");
      if (localStorage) {
        if (localStorage.getItem("TWPGanttSplitPos")) {
          splitter.perc=parseFloat(localStorage.getItem("TWPGanttSplitPos"));
        }
      }
    }



    return splitter;
  }

};


//<%------------------------------------------------------------------------  UTILITIES ---------------------------------------------------------------%>
// same dates returns 1
function getDurationInUnits(start,end){
  return start.distanceInWorkingDays(end)+1; // working in days
}

//con due date uguali ritorna 0: usata per cancolare la distanza effettiva tra due date
function getDistanceInUnits(date1,date2){
  return date1.distanceInWorkingDays(date2); // working in days
}

function incrementDateByUnits(date,duration){
  date.incrementDateByWorkingDays(duration); // working in days
  return date;
}


function computeStart(start) {
  return computeStartDate(start).getTime();
}

/**
 * @param start
 * @returns {Date} the closes start date
 */
function computeStartDate(start) {
  var d;
  d = new Date(start + 3600000 * 12);
  d.setHours(0, 0, 0, 0);
  //move to next working day
  while (isHoliday(d)) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeEnd(end) {
  return computeEndDate(end).getTime()
}

/**
 * @param end
 * @returns {Date} the closest end date
 */
function computeEndDate(end) {
  var d = new Date(end - 3600000 * 12);
  d.setHours(23, 59, 59, 999);
  //move to next working day
  while (isHoliday(d)) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

function computeEndByDuration(start, duration) {
//console.debug("computeEndByDuration start ",d,duration)
  var d = new Date(start);
  var q = duration - 1;
  while (q > 0) {
    d.setDate(d.getDate() + 1);
    if (!isHoliday(d))
      q--;
  }
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}


function incrementDateByWorkingDays(date, days) {
  var d = new Date(date);
  d.incrementDateByWorkingDays(days);
  return d.getTime();
}


function recomputeDuration(start, end) {
  //console.debug("recomputeDuration");
  return getDurationInUnits(new Date(start),new Date(end));
}

function resynchDates(leavingField, startField, startMilesField, durationField, endField, endMilesField) {
  //console.debug("resynchDates",leavingField.prop("name"), "start. "+startField.val(),"durationField: "+ durationField.val(), "endField: "+endField.val());

  function resynchDatesSetFields(command) {
    //console.debug("resynchDatesSetFields",command);
    var duration = stringToDuration(durationField.val());
    var start = computeStart(Date.parseString(startField.val()).getTime());

    var end = endField.val();
    if (end.length > 0) {
      end = Date.parseString(end);
      end.setHours(23, 59, 59, 999); //this is necessary because compute end get the closest end, and parseString returns 00:00
      end = computeEnd(end.getTime());
    }

    var date = new Date();
    if ("CHANGE_END" == command) {
      date.setTime(start);
      var workingUnits = duration-1; // if we do not decremet a task lasting two days starting on 10 will end on 12 (at 00:00) instead of on (at 23:59)
      incrementDateByUnits(date,workingUnits);
      date.setHours(23, 59, 59, 999); //this is necessary because compute end get the closest end, and parseString returns 00:00
      end = computeEnd(date.getTime()); // not strictly necessary
    } else if ("CHANGE_START" == command) {
      date.setTime(end);
      var workingUnits = duration - 1; // if we do not decremet a task lasting two days starting on 10 will end on 12 (at 00:00) instead of on (at 23:59)
      incrementDateByUnits(date,-workingUnits);
      date.setHours(0, 0, 0, 0); //this is necessary because decreasing end we are at 23:50
      start = computeStart(date.getTime()); //not strictly necessary
    } else if ("CHANGE_DURATION" == command) {
      duration = getDurationInUnits(new Date(start),new Date(end)) + 1;
    }

    startField.val(new Date(start).format());
    endField.val(new Date(end).format());
    durationField.val(durationToString(duration));

    return {start: start, end: end, duration: duration};
  }

  var leavingFieldName = leavingField.prop("name");
  var durIsFilled = durationField.val().length > 0;
  var startIsFilled = startField.val().length > 0;
  var endIsFilled = endField.val().length > 0;
  var startIsMilesAndFilled = startIsFilled && (startMilesField.prop("checked") || startField.is("[readOnly]"));
  var endIsMilesAndFilled = endIsFilled && (endMilesField.prop("checked") || endField.is("[readOnly]"));

  if (durIsFilled) {
    durationField.val(durationToString(stringToDuration(durationField.val())));
  }

  if (leavingFieldName.indexOf("Milestone") > 0) {
    if (startIsMilesAndFilled && endIsMilesAndFilled) {
      durationField.prop("readOnly", true);
    } else {
      durationField.prop("readOnly", false);
    }
    return;
  }

  //need at least two values to resynch the third
  if ((durIsFilled ? 1 : 0) + (startIsFilled ? 1 : 0) + (endIsFilled ? 1 : 0) < 2)
    return;

  var ret;
  if (leavingFieldName == 'start' && startIsFilled) {
    if (endIsMilesAndFilled && durIsFilled) {
      ret = resynchDatesSetFields("CHANGE_DURATION");
    } else if (durIsFilled) {
      ret = resynchDatesSetFields("CHANGE_END");
    }

  } else if (leavingFieldName == 'duration' && durIsFilled && !(endIsMilesAndFilled && startIsMilesAndFilled)) {
    if (endIsMilesAndFilled && !startIsMilesAndFilled) {
      ret = resynchDatesSetFields("CHANGE_START");
    } else if (!endIsMilesAndFilled) {
      //document.title=('go and change end!!');
      ret = resynchDatesSetFields("CHANGE_END");
    }

  } else if (leavingFieldName == 'end' && endIsFilled) {
    ret = resynchDatesSetFields("CHANGE_DURATION");
  }
  return ret;
}


//This prototype is provided by the Mozilla foundation and
//is distributed under the MIT license.
//http://www.ibiblio.org/pub/Linux/LICENSES/mit.license

if (!Array.prototype.filter) {
  Array.prototype.filter = function (fun) {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    var res = new Array();
    var thisp = arguments[1];
    for (var i = 0; i < len; i++) {
      if (i in this) {
        var val = this[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, this))
          res.push(val);
      }
    }
    return res;
  };
}

function durationToString(d) {
  return d;
}

function stringToDuration(durStr) {
  var duration = NaN;
  duration = daysFromString(durStr, true) || 1;
  return duration;
}

function goToPage(url) {
  if (!canILeave()) return;
  window.location.href = url;
}
