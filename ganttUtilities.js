/*
  Copyright (c) 2012 Open Lab
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

$.fn.gridify = function(options) {
    this.options = {
        colResizeZoneWidht:10
    };

    $.extend(this.options, options);
    $.gridify.init($(this), this.options);
    return this;
};

$.gridify = {
    init: function(elems, opt) {
        elems.each(function() {
            var table = $(this);

            //----------------------  header management start
            table.find("th.siebui-gdfColHeader.gdfResizable:not(.gdfied)").mouseover(function() {
                $(this).addClass("siebui-gdfColHeaderOver");

            }).bind("mouseout.gdf", function() {
                $(this).removeClass("siebui-gdfColHeaderOver");
                if (!$.gridify.columInResize)
                {
                    $("body").removeClass("siebui-gdfHResizing");
                }

            }).bind("mousemove.gdf", function(e) {
                if (!$.gridify.columInResize)
                {
                    var colHeader = $(this);
                    var mousePos = e.pageX - colHeader.offset().left;

                    if (colHeader.width() - mousePos < opt.colResizeZoneWidht)
                    {
                        $("body").addClass("siebui-gdfHResizing");
                    }
                    else
                    {
                        $("body").removeClass("siebui-gdfHResizing");
                    }
                }

            }).bind("mousedown.gdf", function(e) {
                var colHeader = $(this);
                var mousePos = e.pageX - colHeader.offset().left;
                if (colHeader.width() - mousePos < opt.colResizeZoneWidht)
                {
                    $.gridify.columInResize = $(this);
                    //bind event for start resizing
                    //console.debug("start resizing");
                    $(document).bind("mousemove.gdf", function(e) {
                        //manage resizing
                        //console.debug(e.pageX - $.gridify.columInResize.offset().left)
                        $.gridify.columInResize.width(e.pageX - $.gridify.columInResize.offset().left);


                        //bind mouse up on body to stop resizing
                    }).bind("mouseup.gdf", function() {
                        //console.debug("stop resizing");
                        $(this).unbind("mousemove.gdf").unbind("mouseup.gdf");
                        $("body").removeClass("siebui-gdfHResizing");
                        delete $.gridify.columInResize;
                    });
                }
            }).addClass("gdfied siebui-unselectable").attr("unselectable","true");


            //----------------------  cell management start wrapping
            table.find("td.siebui-gdfCell:not(.gdfied)").each(function() {
                var cell = $(this);
                if (cell.is(".gdfEditable"))
                {
                    var inp = $("<input type='text'>").addClass("siebui-gdfCellInput");
                    inp.val(cell.text());
                    cell.empty().append(inp);
                }
                else
                {
                    var wrp = $("<div>").addClass("siebui-gdfCellWrap");
                    wrp.html(cell.html());
                    cell.empty().append(wrp);
                }
            }).addClass("gdfied");

        });
    }
};

$.splittify = {
    init: function(where, first, second,third,perc) {

        perc=perc || 50;

        var splitter = $("<div>").addClass("siebui-splitterContainer");
        var diaryHeight = $(".siebui-ganttControl").height();
        var diaryWidth = $(".siebui-ganttControl").width();

        var firstBox = $("<div>").addClass("siebui-splitElement siebui-splitBox1").css({height:diaryHeight});
        var splitterBar = $("<div>").addClass("siebui-splitElement siebui-vSplitBar");
        var secondBox = $("<div>").addClass("siebui-splitElement siebui-splitBox2").css({height:diaryHeight});
        var thirdBox = $("<div>").addClass("siebui-splitElement siebui-splitBox3").css({height:diaryHeight});

        firstBox.append(first);
        secondBox.append(second);
        thirdBox.append(third);

        splitter.append(firstBox);
        splitter.append(splitterBar);
        splitter.append(secondBox);

        splitter.append(thirdBox);

        where.append(splitter);

        var w = where.innerWidth();
        firstBox.width(w *perc/ 100 - splitterBar.width());
        var headerColumnWidth = $("#siebui-gdfColHeader").width();
        splitterBar.css({ left: headerColumnWidth + 17, height: diaryHeight }); //SAMPREDD :left:headerColumnWidth+14
        //secondBox.width(w -firstBox.width()-splitterBar.width() ).css({left:firstBox.width() + splitterBar.width()});//SAMPREDD
        secondBox.width(diaryWidth-headerColumnWidth).css({left:headerColumnWidth+ splitterBar.width()+17});
        thirdBox.width(diaryWidth-headerColumnWidth).css({left:headerColumnWidth+ splitterBar.width()-2, top: "63px",position:"relative"});
        secondBox.height(63);
        thirdBox.height(diaryHeight - 63);

        splitterBar.bind("mousedown.gdf", function(e) {
            $.splittify.splitterBar = $(this);
            //bind event for start resizing
            //console.debug("start splitting");
            $("body").unselectable().bind("mousemove.gdf", function(e) {
            //manage resizing
            //console.debug(e.pageX - $.gridify.columInResize.offset().left)
            var sb = $.splittify.splitterBar;
            var pos = e.pageX - sb.parent().offset().left;
            var w = sb.parent().width();
            if (pos > 10 && pos < w - 20)
            {
                sb.css({left:pos});
                firstBox.width(pos);
                secondBox.css({left:pos + sb.width(),width:w - pos - sb.width()});
                thirdBox.css({left:pos + sb.width()-20,width:w - pos - sb.width()});
            }

            //bind mouse up on body to stop resizing
            }).bind("mouseup.gdf", function() {
                //console.debug("stop splitting");
                $(this).unbind("mousemove.gdf").unbind("mouseup.gdf").clearUnselectable();
                delete $.splittify.splitterBar;

            });
        });

        return {firstBox:firstBox,secondBox:secondBox,thirdBox:thirdBox,splitterBar:splitterBar};
    }
};




//<%------------------------------------------------------------------------  UTILITIES ---------------------------------------------------------------%>
function computeStart(start) {
    var d = new Date(start+3600000*12);
    d.setHours(0, 0, 0, 0);
    //move to next working day
    while (isHoliday(d))
    {
        d.setDate(d.getDate() + 1);
    }
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function computeEnd(end) {
    var d = new Date(end-3600000*12);
    d.setHours(23, 59, 59, 999);
    //move to next working day
    while (isHoliday(d))
    {
        d.setDate(d.getDate() + 1);
    }
    d.setHours(23, 59, 59, 999);
    return d.getTime();
}

function computeEndByDuration(start, duration) {
    var d = new Date(start);
    //console.debug("computeEndByDuration start ",d,duration)
    var q = duration - 1;
    while (q > 0)
    {
        d.setDate(d.getDate() + 1);
        if (!isHoliday(d))
        {
            q--;
        }
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
    Array.prototype.filter = function(fun )
    {
        var len = this.length;
        if (typeof fun != "function")
        {
            throw new TypeError();
        }

        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; i++)
        {
            if (i in this)
            {
                var val = this[i]; // in case fun mutates this
                if (fun.call(thisp, val, i, this))
                {
                    res.push(val);
                }
            }
        }
        return res;
    };
}
