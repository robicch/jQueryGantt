/*
  Copyright (c) 2012-2013 Open Lab
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
    resizeZoneWidth:10
  };

  $.extend(options, opt);

  var box = $("<div>").addClass("gdfWrapper");
  box.append(table);

  var head = table.clone();
  head.addClass("fixHead");
  //remove non head
  head.find("tbody").remove();
  box.append(head);

  box.append(table);

  var hTh=head.find(".gdfColHeader");
  var cTh=table.find(".gdfColHeader");
  for (var i=0; i<hTh.length;i++){
    hTh.eq(i).data("fTh",cTh.eq(i));
  }

  //--------- set table to 0 to prevent a strange 100%
  table.width(0);
  head.width(0);


  //----------------------  header management start
  head.find("th.gdfColHeader.gdfResizable:not(.gdfied)").mouseover(function () {
    $(this).addClass("gdfColHeaderOver");

  }).bind("mouseout.gdf",function () {
      $(this).removeClass("gdfColHeaderOver");
      if (!$.gridify.columInResize) {
        $("body").removeClass("gdfHResizing");
      }

    }).bind("mousemove.gdf",function (e) {
      if (!$.gridify.columInResize) {
        var colHeader = $(this);
        var mousePos = e.pageX - colHeader.offset().left;

        if (colHeader.width() - mousePos < options.resizeZoneWidth) {
          $("body").addClass("gdfHResizing");
        } else {
          $("body").removeClass("gdfHResizing");
        }
      }

    }).bind("mousedown.gdf",function (e) {
      var colHeader = $(this);
      var mousePos = e.pageX - colHeader.offset().left;
      if (colHeader.width() - mousePos < options.resizeZoneWidth) {
        $("body").unselectable();
        $.gridify.columInResize = $(this);
        //bind event for start resizing
        //console.debug("start resizing");
        $(document).bind("mousemove.gdf",function (e) {
          //manage resizing
          $.gridify.columInResize.width(e.pageX - $.gridify.columInResize.offset().left);
          $.gridify.columInResize.data("fTh").width($.gridify.columInResize.outerWidth());


          //bind mouse up on body to stop resizing
        }).bind("mouseup.gdf", function () {
            //console.debug("stop resizing");
            $(this).unbind("mousemove.gdf").unbind("mouseup.gdf").clearUnselectable();
            $("body").removeClass("gdfHResizing");
            delete $.gridify.columInResize;
          });
      }
    }).addClass("gdfied unselectable").attr("unselectable", "true");


  //----------------------  cell management start wrapping
  table.find("td.gdfCell:not(.gdfied)").each(function () {
    var cell = $(this);
    if (cell.is(".gdfEditable")) {
      var inp = $("<input type='text'>").addClass("gdfCellInput");
      inp.val(cell.text());
      cell.empty().append(inp);
    } else {
      var wrp = $("<div>").addClass("gdfCellWrap");
      wrp.html(cell.html());
      cell.empty().append(wrp);
    }
  }).addClass("gdfied");

  return box;
};

$.splittify = {
  init: function(where, first, second,perc) {

    perc=perc || 50;

    var splitter = $("<div>").addClass("splitterContainer");

    var firstBox = $("<div>").addClass("splitElement splitBox1");
    var splitterBar = $("<div>").addClass("splitElement vSplitBar").attr("unselectable", "on").html("|").css("padding-top",where.height()/2+"px");
    var secondBox = $("<div>").addClass("splitElement splitBox2");


    firstBox.append(first);
    secondBox.append(second);

    splitter.append(firstBox).append(secondBox).append(splitterBar);

    where.append(splitter);

    var w = where.innerWidth();
    var fbw = w *perc/ 100 - splitterBar.width();
    var realW=firstBox.get(0).scrollWidth;
    fbw=fbw>realW?realW:fbw;
    firstBox.width(fbw).css({left:0});
    splitterBar.css({left:firstBox.width()});
    secondBox.width(w -fbw-splitterBar.width() ).css({left:firstBox.width() + splitterBar.width()});

    splitterBar.bind("mousedown.gdf", function(e) {
      $.splittify.splitterBar = $(this);
      //bind event for start resizing
      //console.debug("start splitting");
      var realW=firstBox.get(0).scrollWidth;
      $("body").unselectable().bind("mousemove.gdf", function(e) {
        //manage resizing
        //console.debug(e.pageX - $.gridify.columInResize.offset().left)
        var sb = $.splittify.splitterBar;
        var pos = e.pageX - sb.parent().offset().left;
        var w = sb.parent().width();
        var fbw=firstBox
        if (pos > 10 && pos < realW) {
          sb.css({left:pos});
          firstBox.width(pos);
          secondBox.css({left:pos + sb.width(),width:w - pos - sb.width()});
        }

        //bind mouse up on body to stop resizing
      }).bind("mouseup.gdf", function() {
        //console.debug("stop splitting");
        $(this).unbind("mousemove.gdf").unbind("mouseup.gdf").clearUnselectable();
        delete $.splittify.splitterBar;

      });
    });

    return {firstBox:firstBox,secondBox:secondBox,splitterBar:splitterBar};

  }
};




//<%------------------------------------------------------------------------  UTILITIES ---------------------------------------------------------------%>
  function computeStart(start) {
    var d = new Date(start+3600000*12);
    d.setHours(0, 0, 0, 0);
    //move to next working day
    while (isHoliday(d)) {
      d.setDate(d.getDate() + 1);
    } 
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function computeEnd(end) {
    var d = new Date(end-3600000*12);
    d.setHours(23, 59, 59, 999);
    //move to next working day
    while (isHoliday(d)) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  function computeEndByDuration(start, duration) {
    var d = new Date(start);
    //console.debug("computeEndByDuration start ",d,duration)
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
   return new Date(start).distanceInWorkingDays(new Date(end));
 }



//This prototype is provided by the Mozilla foundation and
//is distributed under the MIT license.
//http://www.ibiblio.org/pub/Linux/LICENSES/mit.license

if (!Array.prototype.filter){
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


/**
 * Allows drag and drop and extesion of task boxes. Only works on x axis
 * @param opt
 * @return {*}
 */
$.fn.dragExtedSVG = function (opt) {

  //doing this can work with one svg at once only
  var target;
  var svgX;
  var rectMouseDx;

  var options = {
    canDrag:        true,
    canResize:      true,
    resizeZoneWidth:10,
    minSize:10,
    drag:           function (e) {},
    drop:           function (e) {},
    resize:         function (e) {},
    stopResize:     function (e) {}
  };

  $.extend(options, opt);

  this.each(function () {
    var el = $(this);

    var svg = el.parents("svg:first");
    svgX=svg.parent().offset().left; //parent is used instead of svg for a Firefox oddity

    if (options.canDrag)
      el.addClass("deSVGdrag");

    if (options.canResize || options.canDrag) {
      el.bind("mousedown.deSVG",
        function (e) {
          target = $(this);
          var x1 = parseFloat(el.offset().left);

          //var x1 = parseFloat(el.attr("x"));
          var x2 = x1 + parseFloat(el.attr("width"));
          var posx =  e.pageX;

          $("body").unselectable();


          //start resize
          if (options.canResize && x2 - posx < options.resizeZoneWidth ){
            //store offset mouse x1
            rectMouseDx=x2-e.pageX;
            target.attr("oldw",target.attr("width"));

            //bind event for start resizing
            el.parents("svg:first").bind("mousemove.deSVG",function (e) {
              //manage resizing
              var posx =  e.pageX;
              var nW = posx - x1 +rectMouseDx;

              target.attr("width",nW<options.minSize?options.minSize:nW);
              //callback
              options.resize.call(target.get(0),e);

            }).bind("mouseleave.deSVG",stopResize);

            //bind mouse up on body to stop resizing
            $("body").one("mouseup.deSVG", stopResize );

            // start drag
          }else if (options.canDrag ) {
            //store offset mouse x1
            rectMouseDx=parseFloat(target.attr("x"))-e.pageX;
            target.attr("oldx",target.attr("x"));

            //bind event for start resizing
            el.parents("svg:first").bind("mousemove.deSVG",function (e) {
              //manage resizing
              target.attr("x",rectMouseDx+ e.pageX);
              //callback
              options.drag.call(target.get(0),e);

            }).bind("mouseleave.deSVG",drop);

            //bind mouse up on body to stop resizing
            $("body").one("mouseup.deSVG", drop );

          }
        }

      ).bind("mousemove.deSVG",
        function (e) {
          var el = $(this);
          var x1 = el.offset().left;
          var x2 = x1 + parseFloat(el.attr("width"));
          var posx =  e.pageX;


          //console.debug("mousemove", x1,x2,svgX,posx, e.pageX)
          //set cursor handle
          if (options.canResize && x2 - posx < options.resizeZoneWidth ){//|| posx - x1 < options.resizeZoneWidth  )
            el.addClass("deSVGhand");
          }else{
            el.removeClass("deSVGhand");
          }
        }

      ).addClass("deSVG unselectable").attr("unselectable", "true");
    }
  });
  return this;


  function stopResize(e){
    target.parents("svg:first").unbind("mousemove.deSVG").unbind("mouseup.deSVG").unbind("mouseleave.deSVG");
    if (target.attr("oldw")!=target.attr("width"))
      options.stopResize.call(target.get(0),e); //callback
    target=undefined;
    $("body").clearUnselectable();
  }

  function drop(e){
    target.parents("svg:first").unbind("mousemove.deSVG").unbind("mouseup.deSVG").unbind("mouseleave.deSVG");
    if (target.attr("oldx")!=target.attr("x"))
      options.drop.call(target.get(0),e); //callback
    target=undefined;
    $("body").clearUnselectable();
  }

}