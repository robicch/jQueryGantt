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
function Ganttalendar(zoom, startmillis, endMillis, master, minGanttSize) {
  this.master = master; // is the a GantEditor instance
  this.element; // is the jquery element containing gantt
  this.highlightBar;

  this.svg; // instance of svg object containing gantt
  this.tasksGroup; //instance of svg group containing tasks
  this.linksGroup; //instance of svg group containing links

  this.zoom = zoom;
  this.minGanttSize = minGanttSize;
  this.includeToday = true; //when true today is always visible. If false boundaries comes from tasks periods
  this.showCriticalPath = false; //when true critical path is highlighted

  this.zoomLevels = ["d", "w", "m", "q", "s", "y"];

  this.element = this.create(zoom, startmillis, endMillis);

  this.linkOnProgress = false; //set to true when creating a new link

  this.rowHeight = 30; // todo get it from css?
  this.taskHeight=20;
  this.taskVertOffset=(this.rowHeight-this.taskHeight)/2

}

Ganttalendar.prototype.zoomGantt = function (isPlus) {
  var curLevel = this.zoom;
  var pos = this.zoomLevels.indexOf(curLevel + "");

  var newPos = pos;
  if (isPlus) {
    newPos = pos <= 0 ? 0 : pos - 1;
  } else {
    newPos = pos >= this.zoomLevels.length - 1 ? this.zoomLevels.length - 1 : pos + 1;
  }
  if (newPos != pos) {
    curLevel = this.zoomLevels[newPos];
    this.zoom = curLevel;
    this.refreshGantt();
  }
};


Ganttalendar.prototype.create = function (zoom, originalStartmillis, originalEndMillis) {
  //console.debug("Gantt.create " + new Date(originalStartmillis) + " - " + new Date(originalEndMillis));

  var self = this;

  function getPeriod(zoomLevel, stMil, endMillis) {
    var start = new Date(stMil);
    var end = new Date(endMillis);


    //reset hours
    if (zoomLevel == "d") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      start.setFirstDayOfThisWeek();
      end.setFirstDayOfThisWeek();
      end.setDate(end.getDate() + 6);


      //reset day of week
    } else if (zoomLevel == "w") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      start.setFirstDayOfThisWeek();
      end.setFirstDayOfThisWeek();
      end.setDate(end.getDate() + 6);

      //reset day of month
    } else if (zoomLevel == "m") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      start.setDate(1);
      end.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);

      //reset to quarter
    } else if (zoomLevel == "q") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      start.setDate(1);
      start.setMonth(Math.floor(start.getMonth() / 3) * 3);
      end.setDate(1);
      end.setMonth(Math.floor(end.getMonth() / 3) * 3 + 3);
      end.setDate(end.getDate() - 1);

      //reset to semester
    } else if (zoomLevel == "s") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      start.setDate(1);

      start.setMonth(Math.floor(start.getMonth() / 6) * 6);
      end.setDate(1);
      end.setMonth(Math.floor(end.getMonth() / 6) * 6 + 6);
      end.setDate(end.getDate() - 1);

      //reset to year - > gen
    } else if (zoomLevel == "y") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      start.setDate(1);
      start.setMonth(0);

      end.setDate(1);
      end.setMonth(12);
      end.setDate(end.getDate() - 1);
    }
    return {start:start.getTime(), end:end.getTime()};
  }

  function createHeadCell(lbl, span, additionalClass, width) {
    var th = $("<th>").html(lbl).attr("colSpan", span);
    if (width)
      th.width(width);
    if (additionalClass)
      th.addClass(additionalClass);
    return th;
  }

  function createBodyCell(span, isEnd, additionalClass) {
    var ret = $("<td>").html("").attr("colSpan", span).addClass("ganttBodyCell");
    if (isEnd)
      ret.addClass("end");
    if (additionalClass)
      ret.addClass(additionalClass);
    return ret;
  }

  function createGantt(zoom, startPeriod, endPeriod) {
    var tr1 = $("<tr>").addClass("ganttHead1");
    var tr2 = $("<tr>").addClass("ganttHead2");
    var trBody = $("<tr>").addClass("ganttBody");

    function iterate(renderFunction1, renderFunction2) {
      var start = new Date(startPeriod);
      //loop for header1
      while (start.getTime() <= endPeriod) {
        renderFunction1(start);
      }

      //loop for header2
      start = new Date(startPeriod);
      while (start.getTime() <= endPeriod) {
        renderFunction2(start);
      }
    }

    //this is computed by hand in order to optimize cell size
    var computedTableWidth;

    // year
    if (zoom == "y") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 180)) * 100); //180gg = 1 sem = 100px
      iterate(function (date) {
        tr1.append(createHeadCell(date.format("yyyy"), 2));
        date.setFullYear(date.getFullYear() + 1);
      }, function (date) {
        var sem = (Math.floor(date.getMonth() / 6) + 1);
        tr2.append(createHeadCell(GanttMaster.messages["GANTT_SEMESTER_SHORT"] + sem, 1, null, 100));
        trBody.append(createBodyCell(1, sem == 2));
        date.setMonth(date.getMonth() + 6);
      });

      //semester
    } else if (zoom == "s") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 90)) * 100); //90gg = 1 quarter = 100px
      iterate(function (date) {
        var end = new Date(date.getTime());
        end.setMonth(end.getMonth() + 6);
        end.setDate(end.getDate() - 1);
        tr1.append(createHeadCell(date.format("MMM") + " - " + end.format("MMM yyyy"), 2));
        date.setMonth(date.getMonth() + 6);
      }, function (date) {
        var quarter = ( Math.floor(date.getMonth() / 3) + 1);
        tr2.append(createHeadCell(GanttMaster.messages["GANTT_QUARTER_SHORT"] + quarter, 1, null, 100));
        trBody.append(createBodyCell(1, quarter % 2 == 0));
        date.setMonth(date.getMonth() + 3);
      });

      //quarter
    } else if (zoom == "q") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 30)) * 300); //1 month= 300px
      iterate(function (date) {
        var end = new Date(date.getTime());
        end.setMonth(end.getMonth() + 3);
        end.setDate(end.getDate() - 1);
        tr1.append(createHeadCell(date.format("MMM") + " - " + end.format("MMM yyyy"), 3));
        date.setMonth(date.getMonth() + 3);
      }, function (date) {
        var lbl = date.format("MMM");
        tr2.append(createHeadCell(lbl, 1, null, 300));
        trBody.append(createBodyCell(1, date.getMonth() % 3 == 2));
        date.setMonth(date.getMonth() + 1);
      });

      //month
    } else if (zoom == "m") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 1)) * 25); //1 day= 20px
      iterate(function (date) {
        var sm = date.getTime();
        date.setMonth(date.getMonth() + 1);
        var daysInMonth = Math.round((date.getTime() - sm) / (3600000 * 24));
        tr1.append(createHeadCell(new Date(sm).format("MMMM yyyy"), daysInMonth)); //spans mumber of dayn in the month
      }, function (date) {
        tr2.append(createHeadCell(date.format("d"), 1, isHoliday(date) ? "holyH" : null, 25));
        var nd = new Date(date.getTime());
        nd.setDate(date.getDate() + 1);
        trBody.append(createBodyCell(1, nd.getDate() == 1, isHoliday(date) ? "holy" : null));
        date.setDate(date.getDate() + 1);
      });

      //week
    } else if (zoom == "w") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24)) * 40); //1 day= 40px
      iterate(function (date) {
        var end = new Date(date.getTime());
        end.setDate(end.getDate() + 6);
        tr1.append(createHeadCell(date.format("MMM d") + " - " + end.format("MMM d'yy"), 7));
        date.setDate(date.getDate() + 7);
      }, function (date) {
        tr2.append(createHeadCell(date.format("EEEE").substr(0, 1), 1, isHoliday(date) ? "holyH" : null, 40));
        trBody.append(createBodyCell(1, date.getDay() % 7 == (self.master.firstDayOfWeek + 6) % 7, isHoliday(date) ? "holy" : null));
        date.setDate(date.getDate() + 1);
      });

      //days
    } else if (zoom == "d") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24)) * 100); //1 day= 100px
      iterate(function (date) {
        var end = new Date(date.getTime());
        end.setDate(end.getDate() + 6);
        tr1.append(createHeadCell(date.format("MMMM d") + " - " + end.format("MMMM d yyyy"), 7));
        date.setDate(date.getDate() + 7);
      }, function (date) {
        tr2.append(createHeadCell(date.format("EEE d"), 1, isHoliday(date) ? "holyH" : null, 100));
        trBody.append(createBodyCell(1, date.getDay() % 7 == (self.master.firstDayOfWeek + 6) % 7, isHoliday(date) ? "holy" : null));
        date.setDate(date.getDate() + 1);
      });

    } else {
      console.error("Wrong level " + zoom);
    }

    //set a minimal width
    computedTableWidth = Math.max(computedTableWidth, self.minGanttSize);

    var table = $("<table cellspacing=0 cellpadding=0>");
    table.append(tr1).append(tr2).css({width:computedTableWidth});

    var head = table.clone().addClass("fixHead");

    table.append(trBody).addClass("ganttTable");


    var height = self.master.editor.element.height();
    table.height(height);

    var box = $("<div>");
    box.addClass("gantt unselectable").attr("unselectable", "true").css({position:"relative", width:computedTableWidth});
    box.append(table);

    box.append(head);


    //highlightBar
    var hlb = $("<div>").addClass("ganttHighLight");
    box.append(hlb);
    self.highlightBar = hlb;

    //create the svg
    box.svg({settings:{class:"ganttSVGBox"},
      onLoad:         function (svg) {
        //console.debug("svg loaded", svg);

        //creates gradient and definitions
        var defs = svg.defs('myDefs');


        //create backgound
        var extDep = svg.pattern(defs, "extDep", 0, 0, 10, 10, 0, 0, 10, 10, {patternUnits:'userSpaceOnUse'});
        var img=svg.image(extDep, 0, 0, 10, 10, "res/hasExternalDeps.png",{opacity:.3});

        self.svg = svg;
        $(svg).addClass("ganttSVGBox");

        //creates grid group
        var gridGroup = svg.group("gridGroup");

        //creates rows grid
        for (var i = 40; i <= height; i += self.rowHeight)
          svg.line(gridGroup, 0, i, "100%", i, {class:"ganttLinesSVG"});

        //creates links group
        self.linksGroup = svg.group("linksGroup");

        //creates tasks group
        self.tasksGroup = svg.group("tasksGroup");

        //compute scalefactor fx
        self.fx = computedTableWidth / (endPeriod - startPeriod);

        // drawTodayLine
        if (new Date().getTime() > self.startMillis && new Date().getTime() < self.endMillis) {
          var x = Math.round(((new Date().getTime()) - self.startMillis) * self.fx);
          svg.line(gridGroup, x, 0, x, "100%", {class:"ganttTodaySVG"});
        }

      }
    });

    return box;
  }

  //if include today synch extremes
  if (this.includeToday) {
    var today = new Date().getTime();
    originalStartmillis = originalStartmillis > today ? today : originalStartmillis;
    originalEndMillis = originalEndMillis < today ? today : originalEndMillis;
  }


  //get best dimension fo gantt
  var period = getPeriod(zoom, originalStartmillis, originalEndMillis); //this is enlarged to match complete periods basing on zoom level

  //console.debug(new Date(period.start) + "   " + new Date(period.end));
  self.startMillis = period.start; //real dimension of gantt
  self.endMillis = period.end;
  self.originalStartMillis = originalStartmillis; //minimal dimension required by user or by task duration
  self.originalEndMillis = originalEndMillis;

  var table = createGantt(zoom, period.start, period.end);

  return table;
};


//<%-------------------------------------- GANT TASK GRAPHIC ELEMENT --------------------------------------%>
Ganttalendar.prototype.drawTask = function (task) {
  //console.debug("drawTask", task.name,new Date(task.start));
  var self = this;
  //var prof = new Profiler("ganttDrawTask");
  editorRow = task.rowElement;
  //var top = editorRow.position().top + self.master.editor.element.parent().scrollTop();
  var top = editorRow.position().top + editorRow.offsetParent().scrollTop();
  var x = Math.round((task.start - self.startMillis) * self.fx);
  task.hasChild = task.isParent();

  var taskBox = $(_createTaskSVG(task, {x:x, y:top+self.taskVertOffset, width:Math.round((task.end - task.start) * self.fx),height:self.taskHeight}));
  task.ganttElement = taskBox;
  if (self.showCriticalPath && task.isCritical)
    taskBox.addClass("critical");

  if (this.master.canWrite && task.canWrite) {

    //bind all events on taskBox
    taskBox
      .click(function (e) { // manages selection
        e.stopPropagation();// to avoid body remove focused
        self.element.find(".focused").removeClass("focused");
        $(".ganttSVGBox .focused").removeClass("focused");
        var el = $(this);
        if (!self.resDrop)
          el.addClass("focused");
        self.resDrop = false; //hack to avoid select

        $("body").off("click.focused").one("click.focused", function () {
          $(".ganttSVGBox .focused").removeClass("focused");
        })

      }).dblclick(function () {
        self.master.showTaskEditor($(this).attr("taskid"));
      }).mouseenter(function () {
        //bring to top
        var el = $(this);
        if (!self.linkOnProgress) {
          el.find(".linkHandleSVG").show();
        } else {
          el.addClass("linkOver");
          //el.find(".linkHandleSVG"+(self.linkFromEnd?".taskLinkStartSVG ":".taskLinkEndSVG")).show()
        }
      }).mouseleave(function () {
        var el = $(this);
        el.removeClass("linkOver").find(".linkHandleSVG").hide();

      }).mouseup(function (e) {
        $(":focus").blur(); // in order to save grid field when moving task
      }).mousedown(function () {
        var task = self.master.getTask($(this).attr("taskId"));
        task.rowElement.click();
      }).dragExtedSVG($(self.svg.root()), {
        canResize:  this.master.canWrite && task.canWrite,
        canDrag:    !task.depends && this.master.canWrite && task.canWrite,
        startDrag:  function (e) {
          $(".ganttSVGBox .focused").removeClass("focused");
        },
        drag:       function (e) {
          $("[from=" + task.id + "],[to=" + task.id + "]").trigger("update");
        },
        drop:       function (e) {
          self.resDrop = true; //hack to avoid select
          var taskbox = $(this);
          var task = self.master.getTask(taskbox.attr("taskid"));
          var s = Math.round((parseFloat(taskbox.attr("x")) / self.fx) + self.startMillis);
          self.master.beginTransaction();
          self.master.moveTask(task, new Date(s));
          self.master.endTransaction();
        },
        startResize:function (e) {
          //console.debug("startResize");
          $(".ganttSVGBox .focused").removeClass("focused");
          var taskbox = $(this);
          var text = $(self.svg.text(parseInt(taskbox.attr("x")) + parseInt(taskbox.attr("width") + 8), parseInt(taskbox.attr("y")), "", {"font-size":"10px", "fill":"red"}));
          taskBox.data("textDur", text);
        },
        resize:     function (e) {
          //find and update links from, to
          var taskbox = $(this);
          var st = Math.round((parseFloat(taskbox.attr("x")) / self.fx) + self.startMillis);
          var en = Math.round(((parseFloat(taskbox.attr("x")) + parseFloat(taskbox.attr("width"))) / self.fx) + self.startMillis);
          var d = computeStartDate(st).distanceInWorkingDays(computeEndDate(en));
          var text = taskBox.data("textDur");
          text.attr("x", parseInt(taskbox.attr("x")) + parseInt(taskbox.attr("width")) + 8).html(d);

          $("[from=" + task.id + "],[to=" + task.id + "]").trigger("update");
        },
        stopResize: function (e) {
          self.resDrop = true; //hack to avoid select
          //console.debug(ui)
          var textBox = taskBox.data("textDur");
          if (textBox)
            textBox.remove();
          var taskbox = $(this);
          var task = self.master.getTask(taskbox.attr("taskid"));
          var st = Math.round((parseFloat(taskbox.attr("x")) / self.fx) + self.startMillis);
          var en = Math.round(((parseFloat(taskbox.attr("x")) + parseFloat(taskbox.attr("width"))) / self.fx) + self.startMillis);
          self.master.beginTransaction();
          self.master.changeTaskDates(task, new Date(st), new Date(en));
          self.master.endTransaction();
        }
      });

    //binding for creating link
    taskBox.find(".linkHandleSVG").mousedown(function (e) {
      e.preventDefault();
      e.stopPropagation();
      var taskBox = $(this).closest(".taskBoxSVG");
      var svg = $(self.svg.root());
      var offs = svg.offset();
      self.linkOnProgress = true;
      self.linkFromEnd = $(this).is(".taskLinkEndSVG");
      svg.addClass("linkOnProgress");

      // create the line
      var startX = parseFloat(taskBox.attr("x")) + (self.linkFromEnd ? parseFloat(taskBox.attr("width")) : 0);
      var startY = parseFloat(taskBox.attr("y")) + parseFloat(taskBox.attr("height")) / 2;
      var line = self.svg.line(startX, startY, e.pageX - offs.left - 5, e.pageY - offs.top - 5, {class:"linkLineSVG"});
      var circle = self.svg.circle(startX, startY, 5, {class:"linkLineSVG"});

      //bind mousemove to draw a line
      svg.bind("mousemove.linkSVG", function (e) {
        var offs = svg.offset();
        var nx = e.pageX - offs.left;
        var ny = e.pageY - offs.top;
        var c = Math.sqrt(Math.pow(nx - startX, 2) + Math.pow(ny - startY, 2));
        nx = nx - (nx - startX) * 10 / c;
        ny = ny - (ny - startY) * 10 / c;
        self.svg.change(line, { x2:nx, y2:ny});
        self.svg.change(circle, { cx:nx, cy:ny});
      });

      //bind mouseup un body to stop
      $("body").one("mouseup.linkSVG", function (e) {
        $(line).remove();
        $(circle).remove();
        self.linkOnProgress = false;
        svg.removeClass("linkOnProgress");

        $(self.svg.root()).unbind("mousemove.linkSVG");
        var targetBox = $(e.target).closest(".taskBoxSVG");
        //console.debug("create link from " + taskBox.attr("taskid") + " to " + targetBox.attr("taskid"));

        if (targetBox && targetBox.attr("taskid") != taskBox.attr("taskid")) {
          var taskTo;
          var taskFrom;
          if (self.linkFromEnd) {
            taskTo = self.master.getTask(targetBox.attr("taskid"));
            taskFrom = self.master.getTask(taskBox.attr("taskid"));
          } else {
            taskFrom = self.master.getTask(targetBox.attr("taskid"));
            taskTo = self.master.getTask(taskBox.attr("taskid"));
          }

          if (taskTo && taskFrom) {
            var gap = 0;
            var depInp = taskTo.rowElement.find("[name=depends]");
            depInp.val(depInp.val() + ((depInp.val() + "").length > 0 ? "," : "") + (taskFrom.getRow() + 1) + (gap != 0 ? ":" + gap : ""));
            depInp.blur();
          }
        }
      })
    });
  }
  //ask for redraw link
  self.redrawLinks();

  //prof.stop();


  function _createTaskSVG(task, dimensions) {
    var svg = self.svg;
    var taskSvg = svg.svg(self.tasksGroup, dimensions.x, dimensions.y, dimensions.width, dimensions.height, {class:"taskBox taskBoxSVG taskStatusSVG", status:task.status, taskid:task.id });

    //svg.title(taskSvg, task.name);
    //external box
    var layout = svg.rect(taskSvg, 0, 0, "100%", "100%", {class:"taskLayout", rx:"2", ry:"2"});

    svg.rect(taskSvg, 0, 0, "100%", "100%", {fill:"rgba(255,255,255,.3)"});

    //external dep
    if (task.hasExternalDep)
      svg.rect(taskSvg, 0, 0, "100%", "100%", {fill:"url(#extDep)"});

    //progress
    if (task.progress > 0) {
      var progress = svg.rect(taskSvg, 0, 0, (task.progress > 100 ? 100 : task.progress) + "%", "100%", {rx:"2", ry:"2"});
      if (dimensions.width > 50) {
        var textStyle = {fill:"#888", "font-size":"10px",class:"textPerc teamworkIcons",transform:"translate(5)"};
        if (task.progress > 100)
          textStyle["font-weight"]="bold";
        if (task.progress > 90)
          textStyle.transform = "translate(-40)";
        svg.text(taskSvg, (task.progress > 90 ? 100 : task.progress) + "%", (self.rowHeight-5)/2, (task.progress>100?"!!! ":"")+ task.progress + "%", textStyle);
      }
    }

    if (task.hasChild)
      svg.rect(taskSvg, 0, 0, "100%", 3, {fill:"#000"});

    if (task.startIsMilestone) {
      svg.image(taskSvg, -9, dimensions.height/2-9, 18, 18, "res/milestone.png")
    }

    if (task.endIsMilestone) {
      svg.image(taskSvg, "100%",dimensions.height/2-9, 18, 18, "res/milestone.png", {transform:"translate(-9)"})
    }

    //task label
    svg.text(taskSvg, "100%", 18, task.name, {class:"taskLabelSVG", transform:"translate(20,-5)"});

    //link tool
    if (task.level>0){
      svg.circle(taskSvg, "0",  dimensions.height/2,dimensions.height/3, {class:"taskLinkStartSVG linkHandleSVG", transform:"translate("+(-dimensions.height/3-1)+")"});
      svg.circle(taskSvg, "100%",dimensions.height/2,dimensions.height/3, {class:"taskLinkEndSVG linkHandleSVG", transform:"translate("+(dimensions.height/3+1)+")"});
    }
    return taskSvg
  }

};


Ganttalendar.prototype.addTask = function (task) {
  //set new boundaries for gantt
  this.originalEndMillis = this.originalEndMillis > task.end ? this.originalEndMillis : task.end;
  this.originalStartMillis = this.originalStartMillis < task.start ? this.originalStartMillis : task.start;
};


//<%-------------------------------------- GANT DRAW LINK SVG ELEMENT --------------------------------------%>
//'from' and 'to' are tasks already drawn
Ganttalendar.prototype.drawLink = function (from, to, type) {
  var self = this;
  //console.debug("drawLink")
  var peduncolusSize = 10;

  /**
   * Given an item, extract its rendered position
   * width and height into a structure.
   */
  function buildRect(item) {
    var p = item.ganttElement.position();
    var rect = {
      left:  parseFloat(item.ganttElement.attr("x")),
      top:   parseFloat(item.ganttElement.attr("y")),
      width: parseFloat(item.ganttElement.attr("width")),
      height:parseFloat(item.ganttElement.attr("height"))
    };
    return rect;
  }

  /**
   * The default rendering method, which paints a start to end dependency.
   */
  function drawStartToEnd(from, to, ps) {
    var svg = self.svg;

    //this function update an existing link
    function update() {
      var group = $(this);
      var from = group.data("from");
      var to = group.data("to");

      var rectFrom = buildRect(from);
      var rectTo = buildRect(to);

      var fx1 = rectFrom.left;
      var fx2 = rectFrom.left + rectFrom.width;
      var fy = rectFrom.height / 2 + rectFrom.top;

      var tx1 = rectTo.left;
      var tx2 = rectTo.left + rectTo.width;
      var ty = rectTo.height / 2 + rectTo.top;


      var tooClose = tx1 < fx2 + 2 * ps;
      var r = 5; //radius
      var arrowOffset = 5;
      var up = fy > ty;
      var fup = up ? -1 : 1;

      var prev = fx2 + 2 * ps > tx1;
      var fprev = prev ? -1 : 1;

      var image = group.find("image");
      var p = svg.createPath();

      if (tooClose) {
        var firstLine = fup * (rectFrom.height / 2 - 2 * r + 2);
        p.move(fx2, fy)
          .line(ps, 0, true)
          .arc(r, r, 90, false, !up, r, fup * r, true)
          .line(0, firstLine, true)
          .arc(r, r, 90, false, !up, -r, fup * r, true)
          .line(fprev * 2 * ps + (tx1 - fx2), 0, true)
          .arc(r, r, 90, false, up, -r, fup * r, true)
          .line(0, (Math.abs(ty - fy) - 4 * r - Math.abs(firstLine)) * fup - arrowOffset, true)
          .arc(r, r, 90, false, up, r, fup * r, true)
          .line(ps, 0, true);
        image.attr({x:tx1 - 5, y:ty - 5 - arrowOffset});

      } else {
        p.move(fx2, fy)
          .line((tx1 - fx2) / 2 - r, 0, true)
          .arc(r, r, 90, false, !up, r, fup * r, true)
          .line(0, ty - fy - fup * 2 * r + arrowOffset, true)
          .arc(r, r, 90, false, up, r, fup * r, true)
          .line((tx1 - fx2) / 2 - r, 0, true);
        image.attr({x:tx1 - 5, y:ty - 5 + arrowOffset});
      }

      group.find("path").attr({d:p.path()});
    }


    // create the group
    var group = svg.group(self.linksGroup, "" + from.id + "-" + to.id);
    svg.title(group, from.name + " -> " + to.name);

    var p = svg.createPath();

    //add the arrow
    svg.image(group, 0, 0, 5, 10, "res/linkArrow.png");
    //create empty path
    svg.path(group, p, {class:"taskLinkPathSVG"});

    //set "from" and "to" to the group, bind "update" and trigger it
    var jqGroup = $(group).data({from:from, to:to }).attr({from:from.id, to:to.id}).on("update", update).trigger("update");

    if (self.showCriticalPath && from.isCritical && to.isCritical)
      jqGroup.addClass("critical");

    jqGroup.addClass("linkGroup");
    return jqGroup;
  }


  /**
   * A rendering method which paints a start to start dependency.
   */
  function drawStartToStart(from, to) {
    console.error("StartToStart not supported on SVG");
    var rectFrom = buildRect(from);
    var rectTo = buildRect(to);
  }

  var link;
  // Dispatch to the correct renderer
  if (type == 'start-to-start') {
    link = drawStartToStart(from, to, peduncolusSize);
  } else {
    link = drawStartToEnd(from, to, peduncolusSize);
  }

  if (this.master.canWrite && (from.canWrite || to.canWrite)) {
    link.click(function (e) {
      var el = $(this);
      e.stopPropagation();// to avoid body remove focused
      self.element.find(".focused").removeClass("focused");
      $(".ganttSVGBox .focused").removeClass("focused");
      var el = $(this);
      if (!self.resDrop)
        el.addClass("focused");
      self.resDrop = false; //hack to avoid select

      $("body").off("click.focused").one("click.focused", function () {
        $(".ganttSVGBox .focused").removeClass("focused");
      })

    });
  }


};

Ganttalendar.prototype.redrawLinks = function () {
  //console.debug("redrawLinks ");
  var self = this;
  this.element.stopTime("ganttlnksredr");
  this.element.oneTime(60, "ganttlnksredr", function () {

    //var prof=new Profiler("gd_drawLink_real");

    //remove all links
    $("#linksSVG").empty();

    var collapsedDescendant = [];

    //[expand]
    var collapsedDescendant = self.master.getCollapsedDescendant();
    for (var i = 0; i < self.master.links.length; i++) {
      var link = self.master.links[i];

      if (collapsedDescendant.indexOf(link.from) >= 0 || collapsedDescendant.indexOf(link.to) >= 0) continue;

      self.drawLink(link.from, link.to);
    }
    //prof.stop();
  });
};


Ganttalendar.prototype.reset = function () {
  this.element.find(".linkGroup").remove();
  this.element.find("[taskid]").remove();
};


Ganttalendar.prototype.redrawTasks = function () {
  //[expand]
  var collapsedDescendant = this.master.getCollapsedDescendant();
  for (var i = 0; i < this.master.tasks.length; i++) {
    var task = this.master.tasks[i];
    if (collapsedDescendant.indexOf(task) >= 0) continue;
    this.drawTask(task);
  }
};


Ganttalendar.prototype.refreshGantt = function () {
  //console.debug("refreshGantt")

  if (this.showCriticalPath) {
    this.master.computeCriticalPath();
  }


  var par = this.element.parent();

  //try to maintain last scroll
  var scrollY = par.scrollTop();
  var scrollX = par.scrollLeft();

  this.element.remove();
  //guess the zoom level in base of period
  if (!this.zoom) {
    var days = Math.round((this.originalEndMillis - this.originalStartMillis) / (3600000 * 24));
    this.zoom = this.zoomLevels[days < 2 ? 0 : (days < 15 ? 1 : (days < 60 ? 2 : (days < 150 ? 3 : 4  ) ) )];
  }
  var domEl = this.create(this.zoom, this.originalStartMillis, this.originalEndMillis);
  this.element = domEl;
  par.append(domEl);
  this.redrawTasks();

  //set old scroll  
  //console.debug("old scroll:",scrollX,scrollY)
  par.scrollTop(scrollY);
  par.scrollLeft(scrollX);

  //set current task
  this.synchHighlight();

};


Ganttalendar.prototype.fitGantt = function () {
  delete this.zoom;
  this.refreshGantt();
};

Ganttalendar.prototype.synchHighlight = function () {
  if (this.master.currentTask && this.master.currentTask.ganttElement){
    this.highlightBar.css("top", (parseInt(this.master.currentTask.ganttElement.attr("y"))-this.taskVertOffset) + "px");
  }
};


Ganttalendar.prototype.centerOnToday = function () {
  var x = Math.round(((new Date().getTime()) - this.startMillis) * this.fx) - 30;
  //console.debug("centerOnToday "+x);
  this.element.parent().scrollLeft(x);
};


/**
 * Allows drag and drop and extesion of task boxes. Only works on x axis
 * @param opt
 * @return {*}
 */
$.fn.dragExtedSVG = function (svg, opt) {

  //doing this can work with one svg at once only
  var target;
  var svgX;
  var rectMouseDx;

  var options = {
    canDrag:        true,
    canResize:      true,
    resizeZoneWidth:15,
    minSize:        10,
    startDrag:      function (e) {},
    drag:           function (e) {},
    drop:           function (e) {},
    startResize:    function (e) {},
    resize:         function (e) {},
    stopResize:     function (e) {}
  };

  $.extend(options, opt);

  this.each(function () {
    var el = $(this);
    svgX = svg.parent().offset().left; //parent is used instead of svg for a Firefox oddity
    if (options.canDrag)
      el.addClass("deSVGdrag");

    if (options.canResize || options.canDrag) {
      el.bind("mousedown.deSVG",
        function (e) {
          if ($(e.target).is("image")) {
            e.preventDefault();
          }

          target = $(this);
          var x1 = parseFloat(el.offset().left);

          //var x1 = parseFloat(el.attr("x"));
          var x2 = x1 + parseFloat(el.attr("width"));
          var posx = e.pageX;

          $("body").unselectable();

          //start resize
          var x = x2 - posx;
          if (options.canResize && (x >= 0 && x <= options.resizeZoneWidth)) {
            //store offset mouse x1
            rectMouseDx = x2 - e.pageX;
            target.attr("oldw", target.attr("width"));

            var one = true;

            //bind event for start resizing
            $(svg).bind("mousemove.deSVG", function (e) {

              if (one) {
                //trigger startResize
                options.startResize.call(target.get(0), e);
                one = false;
              }

              //manage resizing
              var posx = e.pageX;
              var nW = posx - x1 + rectMouseDx;

              target.attr("width", nW < options.minSize ? options.minSize : nW);
              //callback
              options.resize.call(target.get(0), e);
            });

            //bind mouse up on body to stop resizing
            $("body").one("mouseup.deSVG", stopResize);

            // start drag
          } else if (options.canDrag) {
            //store offset mouse x1
            rectMouseDx = parseFloat(target.attr("x")) - e.pageX;
            target.attr("oldx", target.attr("x"));

            var one = true;
            //bind event for start dragging
            $(svg).bind("mousemove.deSVG",function (e) {
              if (one) {
                //trigger startDrag
                options.startDrag.call(target.get(0), e);
                one = false;
              }

              //manage resizing
              target.attr("x", rectMouseDx + e.pageX);
              //callback
              options.drag.call(target.get(0), e);

            }).bind("mouseleave.deSVG", drop);

            //bind mouse up on body to stop resizing
            $("body").one("mouseup.deSVG", drop);

          }
        }

      ).bind("mousemove.deSVG",
        function (e) {
          var el = $(this);
          var x1 = el.offset().left;
          var x2 = x1 + parseFloat(el.attr("width"));
          var posx = e.pageX;


          //console.debug("mousemove", options.canResize && x2 - posx)
          //set cursor handle
          var x = x2 - posx;
          if (options.canResize && (x >= 0 && x <= options.resizeZoneWidth)) {
            el.addClass("deSVGhand");
          } else {
            el.removeClass("deSVGhand");
          }
        }

      ).addClass("deSVG");
    }
  });
  return this;


  function stopResize(e) {
    $(svg).unbind("mousemove.deSVG").unbind("mouseup.deSVG").unbind("mouseleave.deSVG");
    //if (target && target.attr("oldw")!=target.attr("width"))
    if (target)
      options.stopResize.call(target.get(0), e); //callback
    target = undefined;
    $("body").clearUnselectable();
  }

  function drop(e) {
    $(svg).unbind("mousemove.deSVG").unbind("mouseup.deSVG").unbind("mouseleave.deSVG");
    if (target && target.attr("oldx") != target.attr("x"))
      options.drop.call(target.get(0), e); //callback
    target = undefined;
    $("body").clearUnselectable();
  }

};
