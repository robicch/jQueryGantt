/*
  Copyright (c) 2012-2014 Open Lab
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

$.splittify = {
    init: function (where, first, rgrid, second, third, perc) {

        perc = perc || 50;

        var splitter = $("<div>").addClass("siebui-splitterContainer"),
            diaryHeight = $(".siebui-ganttControl").height(),
            diaryWidth = $(".siebui-ganttControl").width(),
            headerhght = 20 * 3,
            headerPerc = (headerhght / diaryHeight) * 100,
            firstBox = $("<div>").addClass("siebui-splitBox0 siebui-splitElement"),
            rgridBox = $("<div>").addClass("siebui-splitBox1 siebui-splitElement").css({ height: (100 - headerPerc) + "%", top: headerPerc + 0.585+ "%" }),
            resourceContainer = $("<div>").addClass("siebui-resourceContainer siebui-unselectable"),
            splitterBar = $("<div>").addClass("siebui-vSplitBar siebui-splitElement siebui-unselectable"),
            secondBox = $("<div>").addClass("siebui-splitBox2 siebui-splitElement siebui-unselectable").css({ height: headerPerc + "%" }),
            thirdBox = $("<div>").addClass("siebui-splitBox3 siebui-splitElement siebui-unselectable").css({ height: (100 - headerPerc) + "%", top: headerPerc+ 0.3 + "%" });
            splitterBar.attr("ot","div").attr("rn","SplitBar").attr("un","SplitBar");

        firstBox.append(first);
        rgridBox.append(rgrid);
        secondBox.append(second);
        thirdBox.append(third);
        resourceContainer.append(firstBox);
        resourceContainer.append(rgridBox);
        splitter.append(resourceContainer);
        splitter.append(secondBox);
        splitter.append(thirdBox);
        splitter.append(splitterBar);

        where.append(splitter);

//        var w = where.innerWidth();
//        var leftperc = parseFloat(((headerColumnWidth / w) * 100)*0.4, 2);
//        var spltboxper = parseFloat((((headerColumnWidth + splitterBar.width()) / w) * 100)*0.4, 2);

//        splitterBar.css({ left: leftperc + "%" });
//        secondBox.css({ left: spltboxper + "%", width: (100 - spltboxper) + "%" });
//        thirdBox.css({ left: spltboxper + "%", width: (100 - spltboxper) + "%" });

        /*splitterBar.bind("mousedown.gdf", function (e) {
            $.splittify.splitterBar = $(this);
            //bind event for start resizing
            //console.debug("start splitting");
            $("body").unselectable().bind("mousemove.gdf", function (e) {
                //manage resizing
                //console.debug(e.pageX - $.gridify.columInResize.offset().left)
                var sb = $.splittify.splitterBar;
                var pos = e.pageX - sb.parent().offset().left;
                var w = sb.parent().width();
                var headerColWdth = $("#siebui-gdfColHeader").width();
                var headerWidth = $(".siebui-splitBox0").width();
                if (pos > 0 && pos < headerWidth) {
                    var leftperc = parseFloat(((pos / w) * 100), 2);
                    var spltboxper = parseFloat(((pos + sb.width()) / w) * 100, 2);
                    var widthperc = parseFloat(((w - (pos + sb.width())) / w) * 100, 2);
                    sb.css({ left: leftperc + "%" });
                    secondBox.css({ left: spltboxper + "%", width: widthperc + "%" });
                    thirdBox.css({ left: spltboxper + "%", width: widthperc + "%" });
                }

                //bind mouse up on body to stop resizing
            }).bind("mouseup.gdf", function () {
                //console.debug("stop splitting");
                $(this).unbind("mousemove.gdf").unbind("mouseup.gdf").clearUnselectable();
                delete $.splittify.splitterBar;

            });
        });*/

        return { firstBox: firstBox, secondBox: secondBox, thirdBox: thirdBox, splitterBar: splitterBar };
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
