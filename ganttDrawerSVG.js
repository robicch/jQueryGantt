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
function Ganttalendar(zoom, startmillis, endMillis, master, minGanttSize) {
  this.master = master; // is the a GantEditor instance
  this.element; // is the jquery element containing gantt
  this.highlightBar;
  this.svg; // instance of svg object containing gantt
  this.zoom = zoom;
  this.minGanttSize = minGanttSize;
  this.includeToday=true; //when true today is always visible. If false boundaries comes from tasks periods

  //this.zoomLevels = ["d","w","m","q","s","y"];
  this.zoomLevels = ["w","m","q","s","y"];

  this.element = this.create(zoom, startmillis, endMillis);

}

Ganttalendar.prototype.zoomGantt = function(isPlus) {
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


Ganttalendar.prototype.create = function(zoom, originalStartmillis, originalEndMillis) {
  //console.debug("Gantt.create " + new Date(originalStartmillis) + " - " + new Date(originalEndMillis));

  var self = this;

  function getPeriod(zoomLevel, stMil, endMillis) {
    var start = new Date(stMil);
    var end = new Date(endMillis);


    //reset hours
    if (zoomLevel == "d") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

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
    return {start:start.getTime(),end:end.getTime()};
  }

  function createHeadCell(lbl, span, additionalClass,width) {
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
      iterate(function(date) {
        tr1.append(createHeadCell(date.format("yyyy"), 2));
        date.setFullYear(date.getFullYear() + 1);
      }, function(date) {
        var sem = (Math.floor(date.getMonth() / 6) + 1);
        tr2.append(createHeadCell(GanttMaster.messages["GANTT_SEMESTER_SHORT"] + sem, 1,null,100));
        trBody.append(createBodyCell(1, sem == 2));
        date.setMonth(date.getMonth() + 6);
      });

      //semester
    } else if (zoom == "s") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 90)) * 100); //90gg = 1 quarter = 100px
      iterate(function(date) {
        var end = new Date(date.getTime());
        end.setMonth(end.getMonth() + 6);
        end.setDate(end.getDate() - 1);
        tr1.append(createHeadCell(date.format("MMM") + " - " + end.format("MMM yyyy"), 2));
        date.setMonth(date.getMonth() + 6);
      }, function(date) {
        var quarter = ( Math.floor(date.getMonth() / 3) + 1);
        tr2.append(createHeadCell(GanttMaster.messages["GANTT_QUARTER_SHORT"] + quarter, 1,null,100));
        trBody.append(createBodyCell(1, quarter % 2 == 0));
        date.setMonth(date.getMonth() + 3);
      });

      //quarter
    } else if (zoom == "q") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 30)) * 300); //1 month= 300px
      iterate(function(date) {
        var end = new Date(date.getTime());
        end.setMonth(end.getMonth() + 3);
        end.setDate(end.getDate() - 1);
        tr1.append(createHeadCell(date.format("MMM") + " - " + end.format("MMM yyyy"), 3));
        date.setMonth(date.getMonth() + 3);
      }, function(date) {
        var lbl = date.format("MMM");
        tr2.append(createHeadCell(lbl, 1,null,300));
        trBody.append(createBodyCell(1, date.getMonth() % 3 == 2));
        date.setMonth(date.getMonth() + 1);
      });

      //month
    } else if (zoom == "m") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24 * 1)) * 25); //1 day= 20px
      iterate(function(date) {
        var sm = date.getTime();
        date.setMonth(date.getMonth() + 1);
        var daysInMonth = Math.round((date.getTime() - sm) / (3600000 * 24));
        tr1.append(createHeadCell(new Date(sm).format("MMMM yyyy"), daysInMonth)); //spans mumber of dayn in the month
      }, function(date) {
        tr2.append(createHeadCell(date.format("d"), 1, isHoliday(date) ? "holyH" : null,25));
        var nd = new Date(date.getTime());
        nd.setDate(date.getDate() + 1);
        trBody.append(createBodyCell(1, nd.getDate() == 1, isHoliday(date) ? "holy" : null));
        date.setDate(date.getDate() + 1);
      });

      //week
    } else if (zoom == "w") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24)) * 30); //1 day= 30px
      iterate(function(date) {
        var end = new Date(date.getTime());
        end.setDate(end.getDate() + 6);
        tr1.append(createHeadCell(date.format("MMM d") + " - " + end.format("MMM d'yy"), 7));
        date.setDate(date.getDate() + 7);
      }, function(date) {
        tr2.append(createHeadCell(date.format("EEEE").substr(0, 1), 1, isHoliday(date) ? "holyH" : null,30));
        trBody.append(createBodyCell(1, date.getDay() % 7 == (self.master.firstDayOfWeek + 6) % 7, isHoliday(date) ? "holy" : null));
        date.setDate(date.getDate() + 1);
      });

      //days
    } else if (zoom == "d") {
      computedTableWidth = Math.floor(((endPeriod - startPeriod) / (3600000 * 24)) * 200); //1 day= 200px
      iterate(function(date) {
        tr1.append(createHeadCell(date.format("EEEE d MMMM yyyy"), 4, isHoliday(date) ? "holyH" : null));
        date.setDate(date.getDate() + 1);
      }, function(date) {
        tr2.append(createHeadCell(date.format("HH"), 1, isHoliday(date) ? "holyH" : null),200);
        trBody.append(createBodyCell(1, date.getHours() > 17, isHoliday(date) ? "holy" : null));
        date.setHours(date.getHours() + 6);
      });

    } else {
      console.error("Wrong level " + zoom);
    }

    //set a minimal width
    computedTableWidth = Math.max(computedTableWidth, self.minGanttSize);

    var table = $("<table cellspacing=0 cellpadding=0>");
    table.append(tr1).append(tr2).css({width:computedTableWidth});

    var head=table.clone().addClass("fixHead");

    table.append(trBody).addClass("ganttTable");


    var height = self.master.editor.element.height();
    table.height(height);

    var box = $("<div>");
    box.addClass("gantt unselectable").attr("unselectable","true").css({position:"relative",width:computedTableWidth});
    box.append(table);

    box.append(head);


    //highlightBar
    var hlb = $("<div>").addClass("ganttHighLight");
    box.append(hlb);
    self.highlightBar = hlb;



    var rowHeight=30; // todo prenderla da css?
    //create the svg
    box.svg({settings:{class:"ganttSVGBox"},
      onLoad:function (svg) {
      console.debug("svg loaded",svg);

      //creates gradient and definitions
      var defs = svg.defs('myDefs');
      svg.linearGradient(defs, 'taskGrad',[[0, '#ddd'],[.5, '#fff'],[1, '#ddd']], 0, 0, 0,"100%");


        self.svg=svg;
      $(svg).addClass("ganttSVGBox");

      //creates rows grid
      for (var i=40; i<=height; i+=rowHeight)
        svg.line(0,i,"100%",i,{class:"ganttLinesSVG"});


      //creates tasks group
      svg.group("tasksSVG");

      //creates links group
      svg.group("linksSVG");

      //compute scalefactor fx
      self.fx = computedTableWidth / (endPeriod - startPeriod);

      // drawTodayLine
      if (new Date().getTime() > self.startMillis && new Date().getTime() < self.endMillis) {
        var x = Math.round(((new Date().getTime()) - self.startMillis) * self.fx);
        svg.line(x,0,x,"100%",{class:"ganttTodaySVG"});
      }

    }
    });

    return box;
  }

  //if include today synch extremes
  if (this.includeToday){
    var today=new Date().getTime();
    originalStartmillis=originalStartmillis>today ? today:originalStartmillis;
    originalEndMillis=originalEndMillis<today ? today:originalEndMillis;
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
  //var editorRow = self.master.editor.element.find("tr[taskId=" + task.id + "]");
  editorRow = task.rowElement;
  var top = editorRow.position().top+self.master.editor.element.parent().scrollTop();
  var x = Math.round((task.start - self.startMillis) * self.fx);

  task.hasChild=task.isParent();

  var taskBox=$(_createTaskSVG(self.svg,task,{x:x,y:top,width:Math.round((task.end - task.start) * self.fx)}));
  task.ganttElement=taskBox;

  taskBox.dblclick(function() {
    self.master.showTaskEditor($(this).attr("taskid"));
  }).mouseenter(function(){
      //bring to top
      var el = $(this);
      el.find(".taskLinkHandleSVG").show();
      el.parents("svg:first").append(el);
  }).mouseleave(function(){
      $(this).find(".taskLinkHandleSVG").hide();

  }).mouseup(function(){
      $(":focus").blur(); // in order to save grid field when moving task
  }).mousedown(function() {
      var task = self.master.getTask($(this).attr("taskId"));
      task.rowElement.click();
  }).dragExtedSVG({
      canResize:this.master.canWrite,
      canDrag:!task.depends && this.master.canWrite,
      drag:function(){
        $("[from="+task.id+"],[to="+task.id+"]").trigger("update");
      },
      drop:function(){
        var taskbox=$(this);
        var task = self.master.getTask(taskbox.attr("taskid"));
        var s = Math.round((parseFloat(taskbox.attr("x")) / self.fx) + self.startMillis);

        self.master.beginTransaction();
        self.master.moveTask(task, new Date(s));
        self.master.endTransaction();

      },
      resize:function(){
        //todo gestione label
        // $(".taskLabel[taskId=" + ui.helper.attr("taskId") + "]").css("width", ui.position.left);
        $("[from="+task.id+"],[to="+task.id+"]").trigger("update");
        //self.redrawLinks();
      },
      stopResize:function(){
        //console.debug(ui)
        var taskbox=$(this);
        var task = self.master.getTask(taskbox.attr("taskid"));
        var s = Math.round((parseFloat(taskbox.attr("x")) / self.fx) + self.startMillis);
        var e = Math.round(((parseFloat(taskbox.attr("x")) + parseFloat(taskbox.attr("width"))) / self.fx) + self.startMillis);

        self.master.beginTransaction();
        self.master.changeTaskDates(task, new Date(s), new Date(e));
        self.master.endTransaction();

      }
    });

  //binding for creating link
  taskBox.find(".taskLinkHandleSVG").mousedown(function(e){
    e.preventDefault();
    e.stopPropagation();
    var taskBox=$(this).closest(".taskBoxSVG");
    var svg = taskBox.parents("svg:first");
    var offs=svg.offset();

    // ccreate the line
    var line=self.svg.line(parseFloat(taskBox.attr("x"))+parseFloat(taskBox.attr("width")),parseFloat(taskBox.attr("y"))+parseFloat(taskBox.attr("height"))/2, e.pageX-offs.left-5,e.pageY-offs.top-5,{class:"linkLineSVG"});

    //bind mousemove to draw a line
    svg.bind("mousemove.linkSVG",function(e){
      var offs=svg.offset();
      self.svg.change(line,{ x2:e.pageX-offs.left-5,y2:e.pageY-offs.top-5});
    });

    //bind mouseup un body to stop
    $("body").one("mouseup.linkSVG",function(e){
      line.remove();
      taskBox.parents("svg:first").unbind("mousemove.linkSVG");
      var targetBox=$(e.target).closest(".taskBoxSVG");
      console.debug("create link from "+taskBox.attr("taskid")+" to "+ targetBox.attr("taskid"));
      //self.master.createLink(tas)

    })
  });

  //ask for redraw link
  self.redrawLinks();

  //prof.stop();



  function _createTaskSVG(svg,task,dimensions){
    var taskSvg = svg.svg(dimensions.x,dimensions.y, dimensions.width,25,{class:"taskBoxSVG",taskid:task.id});

    //external box
    var layout=svg.rect(taskSvg,0,0,"100%","100%",{class:"taskLayout", rx:"6",ry:"6"});
    layout.style.fill="url(#taskGrad)";

    //status
    svg.rect(taskSvg,6,6,13,13,{stroke:1,rx:"2", ry:"2",status:task.status,class:"taskStatusSVG"} );

    //progress
    if (task.progress>0){
      var progress=svg.rect(taskSvg,0,0,(task.progress>100?100:task.progress)+"%","100%",{fill:(task.progress>100?"red":"rgb(153,255,51)"),rx:"6",ry:"6",opacity:.4});
      svg.text(taskSvg, (task.progress>90?90:task.progress)+"%",18,task.progress+"%",{stroke:"#888","font-size":"12px"});
    }
    if (task.hasChild)
      svg.rect(taskSvg,0,0,"100%",3,{fill:"#000"});

    if (task.startIsMilestone){
      svg.image(taskSvg,-9,4,18,18,"milestone.png")
    }

    if (task.endIsMilestone){
      svg.image(taskSvg,"100%",4,18,18,"milestone.png",{transform:"translate(-9)"})
    }

    //link tool
    svg.circle(taskSvg,"100%",12,8,{class:"taskLinkHandleSVG",transform:"translate(6)"});

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
Ganttalendar.prototype.drawLink = function (svg,from, to, type) {
  //console.debug("drawLink")
  var peduncolusSize = 10;

  /**
   * Given an item, extract its rendered position
   * width and height into a structure.
   */
  function buildRect(item) {
    const p = item.ganttElement.position();
    var rect = {
      left:parseFloat(item.ganttElement.attr("x")),
      top:parseFloat(item.ganttElement.attr("y")),
      width: parseFloat(item.ganttElement.attr("width")),
      height :parseFloat(item.ganttElement.attr("height"))
    };
    return rect;
  }

  /**
   * The default rendering method, which paints a start to end dependency.
   */
  function drawStartToEnd(svg,from, to, ps) {

    //this function update an existing link
    function update() {
      var group=$(this);
      var from=group.data("from");
      var to=group.data("to");

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

      var image=group.find("image");
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
        //svg.image(group, tx1 - 5, ty - 5 - arrowOffset, 5, 10, "linkArrow.png");
        image.attr({x:tx1 - 5,y:ty - 5 - arrowOffset});

      } else {
        p.move(fx2, fy)
          .line((tx1 - fx2) / 2 - r, 0, true)
          .arc(r, r, 90, false, !up, r, fup * r, true)
          .line(0, ty - fy - fup * 2 * r + arrowOffset, true)
          .arc(r, r, 90, false, up, r, fup * r, true)
          .line((tx1 - fx2) / 2 - r, 0, true);
        //svg.image(group, tx1 - 5, ty - 5 + arrowOffset, 5, 10, "linkArrow.png");
        image.attr({x:tx1 - 5,y:ty - 5 + arrowOffset});
      }

      group.find("path").attr({d:p.path(),"stroke-width": 0});
      //svg.change(group.find("path").get(0),{d:p.path()});
      //svg.change(group.find("line").get(0),{x1:fx2,y1:fy,x2:tx2,y2:ty});
      group.find("path").attr({"stroke-width": 2});


    }


    // create the group
    var group = svg.group(""+from.id+"-"+to.id);
    var p = svg.createPath();

    //add the arrow
    svg.image(group,0,0,5,10,"linkArrow.png");
    //create empty path
    svg.path(group,p,{class:"taskLinkPathSVG"});
    //svg.line(group,0,0,0,0,{fill: 'none', stroke: '#9999ff', strokeWidth: 2});


    //set "from" and "to" to the group, bind "update" and trigger it
    var jqGroup=$(group).data({from: from, to: to }).attr({from:from.id,to:to.id}).on("update",update).trigger("update");

    return jqGroup;
  }


  /**
   * A rendering method which paints a start to start dependency.
   */
  function drawStartToStart(from, to) {
    console.error("StartToStart not supported on SVG")
    var rectFrom = buildRect(from);
    var rectTo = buildRect(to);
  }

  // Dispatch to the correct renderer
  if (type == 'start-to-start') {
    drawStartToStart(svg,from, to, peduncolusSize);
  } else {
    drawStartToEnd(svg, from, to, peduncolusSize);
  }
};

Ganttalendar.prototype.redrawLinks = function() {
  //console.debug("redrawLinks ");
  var self = this;
  this.element.stopTime("ganttlnksredr");
  this.element.oneTime(60, "ganttlnksredr", function() {

    //var prof=new Profiler("gd_drawLink_real");

    //remove all links
    $("#linksSVG").empty();

    for (var i=0;i<self.master.links.length;i++) {
      var link = self.master.links[i];
      self.drawLink(self.svg,link.from, link.to);
    }
    //prof.stop();
  });
};


Ganttalendar.prototype.reset = function() {
  this.element.find(".ganttLinks").empty();
  this.element.find("[taskId]").remove();
};


Ganttalendar.prototype.redrawTasks = function() {
  for (var i=0;i<this.master.tasks.length;i++) {
    var task = this.master.tasks[i];
    this.drawTask(task);
  }
};


Ganttalendar.prototype.refreshGantt = function() {
  //console.debug("refreshGantt")
  var par = this.element.parent();

  //try to maintain last scroll
  var scrollY=par.scrollTop();
  var scrollX=par.scrollLeft();

  this.element.remove();
  //guess the zoom level in base of period
  if (!this.zoom ){
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
  if (this.master.currentTask) {
    this.highlightBar.css("top", this.master.currentTask.ganttElement.attr("y")+"px");
  }
};


Ganttalendar.prototype.fitGantt = function() {
  delete this.zoom;
  this.refreshGantt();
};

Ganttalendar.prototype.centerOnToday = function() {
  var x = Math.round(((new Date().getTime()) - this.startMillis) * this.fx)-30;
  //console.debug("centerOnToday "+x);
  this.element.parent().scrollLeft(x);
};



