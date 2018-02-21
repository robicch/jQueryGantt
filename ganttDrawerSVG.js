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


 todo For compatibility with IE and SVGElements.getElementsByClassName not implemented changed every find starting from SVGElement (the other works fine)
 .find(".classname"))  -> .find("[class*=classname])
 */
function Ganttalendar(startMillis, endMillis, master, minGanttSize) {
  this.master = master; // is the a GantEditor instance
  this.element; // is the jquery element containing gantt

  this.svg; // instance of svg object containing gantt
  this.tasksGroup; //instance of svg group containing tasks
  this.linksGroup; //instance of svg group containing links

  this.minGanttSize = minGanttSize;
  this.includeToday = false; //when true today is always visible. If false boundaries comes from tasks periods
  this.showCriticalPath = false; //when true critical path is highlighted

  this.initZoomlevels(); // initialite the zoom level definitions

  this.originalStartMillis=startMillis;
  this.originalEndMillis=endMillis;
  this.gridChanged=true; //witness for boundaries changed. Force to redraw gantt grid
  this.element = this.createGanttGrid(); // fake

  this.linkOnProgress = false; //set to true when creating a new link

  this.taskHeight=20;
  this.resizeZoneWidth=5;
  this.taskVertOffset = (this.master.rowHeight - this.taskHeight) / 2;
}


Ganttalendar.prototype.zoomGantt = function (isPlus) {
  var curLevel = this.zoom;
  var pos = this.zoomLevels.indexOf(curLevel + "");

  var centerMillis=this.getCenterMillis();
  var newPos = pos;
  if (isPlus) {
    newPos = pos <= 0 ? 0 : pos - 1;
  } else {
    newPos = pos >= this.zoomLevels.length - 1 ? this.zoomLevels.length - 1 : pos + 1;
  }
  if (newPos != pos) {
    curLevel = this.zoomLevels[newPos];
    this.gridChanged=true;
    this.zoom = curLevel;

    this.storeZoomLevel();
    this.redraw();
    this.goToMillis(centerMillis);
  }
};



Ganttalendar.prototype.getStoredZoomLevel = function () {
  if (localStorage  && localStorage.getObject("TWPGanttSavedZooms")) {
    var savedZooms = localStorage.getObject("TWPGanttSavedZooms");
    return savedZooms[this.master.tasks[0].id];
  }
  return false;
};

Ganttalendar.prototype.storeZoomLevel = function () {
  //console.debug("storeZoomLevel: "+this.zoom);
  if (localStorage) {
    var savedZooms;
    if (!localStorage.getObject("TWPGanttSavedZooms"))
      savedZooms = {};
    else
      savedZooms = localStorage.getObject("TWPGanttSavedZooms");

    savedZooms[this.master.tasks[0].id]=this.zoom;

    localStorage.setObject("TWPGanttSavedZooms", savedZooms);
  }
};

Ganttalendar.prototype.createHeadCell=function(level,zoomDrawer,rowCtx,lbl, span, additionalClass,start, end) {
  var x = (start.getTime() - self.startMillis)* zoomDrawer.computedScaleX;
  var th = $("<th>").html(lbl).attr("colSpan", span);
  if (level>1) { //set width on second level only
    var w = (end.getTime() - start.getTime()) * zoomDrawer.computedScaleX;
    th.width(w);
  }
  if (additionalClass)
    th.addClass(additionalClass);
  rowCtx.append(th);
};

Ganttalendar.prototype.createBodyCell=function(zoomDrawer,tr,span, isEnd, additionalClass) {
  var ret = $("<td>").html("").attr("colSpan", span).addClass("ganttBodyCell");
  if (isEnd)
    ret.addClass("end");
  if (additionalClass)
    ret.addClass(additionalClass);
  tr.append(ret);
};


Ganttalendar.prototype.createGanttGrid = function () {
  //console.debug("Gantt.createGanttGrid zoom: "+this.zoom +"  " + new Date(this.originalStartMillis).format() + " - " + new Date(this.originalEndMillis).format());
  //var prof = new Profiler("ganttDrawer.createGanttGrid");
  var self = this;

  // get the zoomDrawer
  // if the desired level is not there uses the largest one (last one)
  var zoomDrawer=self.zoomDrawers[self.zoom] || self.zoomDrawers[self.zoomLevels[self.zoomLevels.length-1]];

  //get best dimension for gantt
  var adjustedStartDate= new Date(this.originalStartMillis);
  var adjustedEndDate=new Date(this.originalEndMillis);
  zoomDrawer.adjustDates(adjustedStartDate,adjustedEndDate);

  self.startMillis = adjustedStartDate.getTime(); //real dimension of gantt
  self.endMillis = adjustedEndDate.getTime();

    //this is computed by hand in order to optimize cell size
  var computedTableWidth= (self.endMillis - self.startMillis) * zoomDrawer.computedScaleX;

    //set a minimal width
    computedTableWidth = Math.max(computedTableWidth, self.minGanttSize);

    var table = $("<table cellspacing=0 cellpadding=0>");

    //loop for header1
  var start = new Date(self.startMillis);
    var tr1 = $("<tr>").addClass("ganttHead1");
  while (start.getTime() <= self.endMillis) {
      zoomDrawer.row1(start,tr1);
      }

    //loop for header2  e tbody
  start = new Date(self.startMillis);
    var tr2 = $("<tr>").addClass("ganttHead2");
    var trBody = $("<tr>").addClass("ganttBody");
  while (start.getTime() <= self.endMillis) {
    zoomDrawer.row2(start,tr2,trBody);
    }

  table.append(tr1).append(tr2);   // removed as on FF there are rounding issues  //.css({width:computedTableWidth});

    var head = table.clone().addClass("ganttFixHead");

    table.append(trBody).addClass("ganttTable");


    var height = self.master.editor.element.height();
    table.height(height);

    var box = $("<div>");
    box.addClass("gantt unselectable").attr("unselectable", "true").css({position:"relative", width:computedTableWidth});
    box.append(table);
    box.append(head);

    //create the svg
    box.svg({settings:{class:"ganttSVGBox"},
      onLoad:         function (svg) {
        //console.debug("svg loaded", svg);

        //creates gradient and definitions
        var defs = svg.defs('myDefs');

        //create backgound
        var extDep = svg.pattern(defs, "extDep", 0, 0, 10, 10, 0, 0, 10, 10, {patternUnits:'userSpaceOnUse'});
        var img=svg.image(extDep, 0, 0, 10, 10, self.master.resourceUrl +"hasExternalDeps.png",{opacity:.3});

        self.svg = svg;
        $(svg).addClass("ganttSVGBox");

        //creates grid group
        var gridGroup = svg.group("gridGroup");

        //creates links group
        self.linksGroup = svg.group("linksGroup");

        //creates tasks group
        self.tasksGroup = svg.group("tasksGroup");

        //compute scalefactor fx
        //self.fx = computedTableWidth / (endPeriod - startPeriod);
        self.fx = zoomDrawer.computedScaleX;

      }
    });

    return box;
};


//<%-------------------------------------- GANT TASK GRAPHIC ELEMENT --------------------------------------%>
Ganttalendar.prototype.drawTask = function (task) {
	//console.debug("drawTask", task.name,this.master.showBaselines,this.taskHeight);
  var self = this;
  //var prof = new Profiler("ganttDrawTask");

	if (self.master.showBaselines) {
		var baseline = self.master.baselines[task.id];
		if (baseline) {
			//console.debug("baseLine",baseline)
			var baseTask = $(_createBaselineSVG(task, baseline));
			baseTask.css("opacity", .5);
			task.ganttBaselineElement = baseTask;
		}
	}

	var taskBox = $(_createTaskSVG(task));
  task.ganttElement = taskBox;


  if (self.showCriticalPath && task.isCritical)
    taskBox.addClass("critical");

  if (this.master.permissions.canWrite || task.canWrite) {

    //bind all events on taskBox
    taskBox
      .click(function (e) { // manages selection
        e.stopPropagation();// to avoid body remove focused
        self.element.find("[class*=focused]").removeClass("focused");
        $(".ganttSVGBox .focused").removeClass("focused");
        var el = $(this);
        if (!self.resDrop)
          el.addClass("focused");
        self.resDrop = false; //hack to avoid select

        $("body").off("click.focused").one("click.focused", function () {
          $(".ganttSVGBox .focused").removeClass("focused");
        })

      }).dblclick(function () {
        if (self.master.permissions.canSeePopEdit)
          self.master.editor.openFullEditor(task,false);
      }).mouseenter(function () {
        //bring to top
        var el = $(this);
        if (!self.linkOnProgress) {
          $("[class*=linkHandleSVG]").hide();
          el.find("[class*=linkHandleSVG]").stopTime("hideLink").show();
        } else {
          el.addClass("linkOver");
        }
      }).mouseleave(function () {
        var el = $(this);
        el.removeClass("linkOver").find("[class*=linkHandleSVG]").oneTime(500,"hideLink",function(){$(this).hide()});

      }).mouseup(function (e) {
        $(":focus").blur(); // in order to save grid field when moving task
      }).mousedown(function () {
        var task = self.master.getTask($(this).attr("taskid"));
        task.rowElement.click();
      }).dragExtedSVG($(self.svg.root()), {
        canResize:  this.master.permissions.canWrite || task.canWrite,
        canDrag:    !task.depends && (this.master.permissions.canWrite || task.canWrite),
        resizeZoneWidth:self.resizeZoneWidth,
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
						var d = getDurationInUnits(computeStartDate(st), computeEndDate(en));
          var text = taskBox.data("textDur");
          text.attr("x", parseInt(taskbox.attr("x")) + parseInt(taskbox.attr("width")) + 8).html(durationToString(d));

          $("[from=" + task.id + "],[to=" + task.id + "]").trigger("update");
        },
        stopResize: function (e) {
          self.resDrop = true; //hack to avoid select
          var textBox = taskBox.data("textDur");
          if (textBox)
            textBox.remove();
          var taskbox = $(this);
          var task = self.master.getTask(taskbox.attr("taskid"));
          var st = Math.round((parseFloat(taskbox.attr("x")) / self.fx) + self.startMillis);
          var en = Math.round(((parseFloat(taskbox.attr("x")) + parseFloat(taskbox.attr("width"))) / self.fx) + self.startMillis);

          //in order to avoid rounding issue if the movement is less than 1px we keep the same start and end dates
          if (Math.abs(st-task.start)<1/self.fx) {
            st = task.start;
          }
          if (Math.abs(en-task.end)<1/self.fx) {
            en = task.end;
          }

          self.master.beginTransaction();
          self.master.changeTaskDates(task, new Date(st), new Date(en));
          self.master.endTransaction();
        }
      });

    //binding for creating link
    taskBox.find("[class*=linkHandleSVG]").mousedown(function (e) {
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


	function _createTaskSVG(task) {
    var svg = self.svg;

		var dimensions = {
			x     : Math.round((task.start - self.startMillis) * self.fx),
			y     : task.rowElement.position().top + task.rowElement.offsetParent().scrollTop() + self.taskVertOffset,
			width : Math.max(Math.round((task.end - task.start) * self.fx), 1),
			height: (self.master.showBaselines ? self.taskHeight / 1.3 : self.taskHeight)
		};
    var taskSvg = svg.svg(self.tasksGroup, dimensions.x, dimensions.y, dimensions.width, dimensions.height, {class:"taskBox taskBoxSVG taskStatusSVG", status:task.status, taskid:task.id,fill:task.color||"#eee" });

    //svg.title(taskSvg, task.name);
    //external box
    var layout = svg.rect(taskSvg, 0, 0, "100%", "100%", {class:"taskLayout", rx:"2", ry:"2"});
    //external dep
    if (task.hasExternalDep)
      svg.rect(taskSvg, 0, 0, "100%", "100%", {fill:"url(#extDep)"});

    //progress
    if (task.progress > 0) {
      var progress = svg.rect(taskSvg, 0, "20%", (task.progress > 100 ? 100 : task.progress) + "%", "60%", {rx:"2", ry:"2",fill:"rgba(0,0,0,.4)"});
      if (dimensions.width > 50) {
        var textStyle = {fill:"#888", "font-size":"10px",class:"textPerc teamworkIcons",transform:"translate(5)"};
        if (task.progress > 100)
          textStyle["font-weight"]="bold";
        if (task.progress > 90)
          textStyle.transform = "translate(-40)";
        svg.text(taskSvg, (task.progress > 90 ? 100 : task.progress) + "%", (self.master.rowHeight - 5) / 2, (task.progress > 100 ? "!!! " : "") + task.progress + "%", textStyle);
      }
    }

		if (task.isParent())
      svg.rect(taskSvg, 0, 0, "100%", 3, {fill:"#000"});

    if (task.startIsMilestone) {
      svg.image(taskSvg, -9, dimensions.height/2-9, 18, 18, self.master.resourceUrl +"milestone.png")
    }

    if (task.endIsMilestone) {
      svg.image(taskSvg, "100%",dimensions.height/2-9, 18, 18, self.master.resourceUrl +"milestone.png", {transform:"translate(-9)"})
    }

    //task label
    svg.text(taskSvg, "100%", 18, task.name, {class:"taskLabelSVG", transform:"translate(20,-5)"});

    //link tool
    if (task.level>0){
      svg.circle(taskSvg, -self.resizeZoneWidth,  dimensions.height/2,dimensions.height/3, {class:"taskLinkStartSVG linkHandleSVG", transform:"translate("+(-dimensions.height/3+1)+")"});
      svg.circle(taskSvg, dimensions.width+self.resizeZoneWidth,dimensions.height/2,dimensions.height/3, {class:"taskLinkEndSVG linkHandleSVG", transform:"translate("+(dimensions.height/3-1)+")"});
    }
    return taskSvg
  }


	function _createBaselineSVG(task, baseline) {
		var svg = self.svg;

		var dimensions = {
			x     : Math.round((baseline.startDate - self.startMillis) * self.fx),
			y     : task.rowElement.position().top + task.rowElement.offsetParent().scrollTop() + self.taskVertOffset + self.taskHeight / 2,
			width : Math.max(Math.round((baseline.endDate - baseline.startDate) * self.fx), 1),
			height: (self.master.showBaselines ? self.taskHeight / 1.5 : self.taskHeight)
		};
		var taskSvg = svg.svg(self.tasksGroup, dimensions.x, dimensions.y, dimensions.width, dimensions.height, {class: "taskBox taskBoxSVG taskStatusSVG baseline", status: baseline.status, taskid: task.id, fill: task.color || "#eee" });

		//tooltip
		var label = "<b>" + task.name + "</b>";
		label += "<br>";
		label += "@" + new Date(self.master.baselineMillis).format();
		label += "<br><br>";
		label += "<b>Status:</b> " + baseline.status;
		label += "<br><br>";
		label += "<b>Start:</b> " + new Date(baseline.startDate).format();
		label += "<br>";
		label += "<b>End:</b> " + new Date(baseline.endDate).format();
		label += "<br>";
		label += "<b>Duration:</b> " + baseline.duration;
		label += "<br>";
		label += "<b>Progress:</b> " + baseline.progress + "%";

		$(taskSvg).attr("data-label", label).on("click", function (event) {
			showBaselineInfo(event, this);
			//bind hide
		});

		//external box
		var layout = svg.rect(taskSvg, 0, 0, "100%", "100%", {class: "taskLayout", rx: "2", ry: "2"});


		//progress

		if (baseline.progress > 0) {
			var progress = svg.rect(taskSvg, 0, "20%", (baseline.progress > 100 ? 100 : baseline.progress) + "%", "60%", {rx: "2", ry: "2", fill: "rgba(0,0,0,.4)"});
			/*if (dimensions.width > 50) {
			 var textStyle = {fill:"#888", "font-size":"10px",class:"textPerc teamworkIcons",transform:"translate(5)"};
			 if (baseline.progress > 100)
			 textStyle["font-weight"]="bold";
			 if (baseline.progress > 90)
			 textStyle.transform = "translate(-40)";
			 svg.text(taskSvg, (baseline.progress > 90 ? 100 : baseline.progress) + "%", (self.master.rowHeight - 5) / 2, (baseline.progress > 100 ? "!!! " : "") + baseline.progress + "%", textStyle);
			 }*/
    }

		//if (task.isParent())
		//  svg.rect(taskSvg, 0, 0, "100%", 3, {fill:"#000"});


		//task label
		//svg.text(taskSvg, "100%", 18, task.name, {class:"taskLabelSVG", transform:"translate(20,-5)"});


    return taskSvg
  }

};


Ganttalendar.prototype.addTask = function (task) {
  //currently do nothing
};


//<%-------------------------------------- GANT DRAW LINK SVG ELEMENT --------------------------------------%>
//'from' and 'to' are tasks already drawn
Ganttalendar.prototype.drawLink = function (from, to, type) {
  //console.debug("drawLink")
  var self = this;
  var peduncolusSize = 10;

  /**
   * Given an item, extract its rendered position
   * width and height into a structure.
   */
  function buildRectFromTask(task) {
    var self=task.master.gantt;
    var editorRow = task.rowElement;
    var top = editorRow.position().top + editorRow.offsetParent().scrollTop();
    var x = Math.round((task.start - self.startMillis) * self.fx);
    var rect = {left: x, top: top + self.taskVertOffset, width: Math.max(Math.round((task.end - task.start) * self.fx),1), height: self.taskHeight};
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

      var rectFrom = buildRectFromTask(from);
      var rectTo = buildRectFromTask(to);

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
    svg.image(group, 0, 0, 5, 10, self.master.resourceUrl +"linkArrow.png");
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
    var rectFrom = buildRectFromTask(from);
    var rectTo = buildRectFromTask(to);
  }

  var link;
  // Dispatch to the correct renderer
  if (type == 'start-to-start') {
    link = drawStartToStart(from, to, peduncolusSize);
  } else {
    link = drawStartToEnd(from, to, peduncolusSize);
  }

  // in order to create a dependency you will need permissions on both tasks
  if (this.master.permissions.canWrite || ( from.canWrite && to.canWrite)) {
    link.click(function (e) {
      var el = $(this);
      e.stopPropagation();// to avoid body remove focused
      self.element.find("[class*=focused]").removeClass("focused");
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
  this.element.oneTime(10, "ganttlnksredr", function () {

    //var prof=new Profiler("gd_drawLink_real");

    //remove all links
    $("#linksGroup").empty();

    var collapsedDescendant = [];

    //[expand]
    var collapsedDescendant = self.master.getCollapsedDescendant();
    for (var i = 0; i < self.master.links.length; i++) {
      var link = self.master.links[i];

      if (collapsedDescendant.indexOf(link.from) >= 0 || collapsedDescendant.indexOf(link.to) >= 0) continue;

      var rowA=link.from.getRow();
      var rowB=link.to.getRow();

      //if link is out of visible screen continue
      if(Math.max(rowA,rowB)<self.master.firstVisibleTaskIndex || Math.min(rowA,rowB)>self.master.lastVisibleTaskIndex) continue;

      self.drawLink(link.from, link.to);
    }
    //prof.stop();
  });
};


Ganttalendar.prototype.reset = function () {
  //var prof= new Profiler("ganttDrawerSVG.reset");
  this.element.find("[class*=linkGroup]").remove();
  this.element.find("[taskid]").remove();
  //prof.stop()
};


Ganttalendar.prototype.redrawTasks = function (drawAll) {
  //console.debug("redrawTasks ");
  var self=this;
  //var prof = new Profiler("ganttRedrawTasks");

  self.element.find("table.ganttTable").height(self.master.editor.element.height());

  var collapsedDescendant = this.master.getCollapsedDescendant();

  var startRowAdd=self.master.firstScreenLine-self.master.rowBufferSize;
  var endRowAdd =self.master.firstScreenLine+self.master.numOfVisibleRows+self.master.rowBufferSize;

  $("#linksGroup,#tasksGroup").empty();
  var gridGroup=$("#gridGroup").empty().get(0);

  //add missing ones
  var row=0;
  self.master.firstVisibleTaskIndex=-1;
  for (var i=0;i<self.master.tasks.length;i++){
    var task=self.master.tasks[i];
    if (collapsedDescendant.indexOf(task)>=0){
      continue;
    }
    if (drawAll || (row>=startRowAdd && row<endRowAdd)) {
    this.drawTask(task);
      self.master.firstVisibleTaskIndex=self.master.firstVisibleTaskIndex==-1?i:self.master.firstVisibleTaskIndex;
      self.master.lastVisibleTaskIndex = i;
    }
    row++
  }

  //creates rows grid
  for (var i = 40; i <= self.master.editor.element.height(); i += self.master.rowHeight)
    self.svg.rect(gridGroup, 0, i, "100%", self.master.rowHeight, {class: "ganttLinesSVG"});

  // drawTodayLine
  if (new Date().getTime() > self.startMillis && new Date().getTime() < self.endMillis) {
    var x = Math.round(((new Date().getTime()) - self.startMillis) * self.fx);
    self.svg.line(gridGroup, x, 0, x, "100%", {class: "ganttTodaySVG"});
  }


  //prof.stop();
};


Ganttalendar.prototype.shrinkBoundaries = function () {
  //console.debug("shrinkBoundaries")
  var start = Infinity;
  var end =  -Infinity;
  for (var i = 0; i < this.master.tasks.length; i++) {
    var task = this.master.tasks[i];
    if (start > task.start)
      start = task.start;
    if (end < task.end)
      end = task.end;
  }

  //if include today synch extremes
  if (this.includeToday) {
    var today = new Date().getTime();
    start = start > today ? today : start;
    end = end< today ? today : end;
  }

  //mark boundaries as changed
  this.gridChanged=this.gridChanged || this.originalStartMillis!=start || this.originalEndMillis!=end;

  this.originalStartMillis=start;
  this.originalEndMillis=end;
};

Ganttalendar.prototype.setBestFittingZoom = function () {
  //console.debug("setBestFittingZoom");

  if (this.getStoredZoomLevel()) {
    this.zoom = this.getStoredZoomLevel();
    return;
  }


  //if zoom is not defined get the best fitting one
  var dur = this.originalEndMillis -this.originalStartMillis;
  var minDist = Number.MAX_VALUE;
  var i = 0;
  for (; i < this.zoomLevels.length; i++) {
    var dist = Math.abs(dur - millisFromString(this.zoomLevels[i]));
    if (dist <= minDist) {
      minDist = dist;
    } else {
      break;
    }
    this.zoom = this.zoomLevels[i];
  }

  this.zoom=this.zoom||this.zoomLevels[this.zoomLevels.length-1];

};

Ganttalendar.prototype.redraw = function () {
  //console.debug("redraw",this.zoom, this.originalStartMillis, this.originalEndMillis);
  //var prof= new Profiler("Ganttalendar.redraw");

  if (this.showCriticalPath) {
    this.master.computeCriticalPath();
  }

  if (this.gridChanged) {
    this.gridChanged=false;
  var par = this.element.parent();

  //try to maintain last scroll
  var scrollY = par.scrollTop();
  var scrollX = par.scrollLeft();

  this.element.remove();

    var domEl = this.createGanttGrid();
  this.element = domEl;
  par.append(domEl);
  this.redrawTasks();

  //set old scroll  
  par.scrollTop(scrollY);
  par.scrollLeft(scrollX);

  } else {
    this.redrawTasks();
  }


  //set current task
  this.synchHighlight();

  //prof.stop();
  //Profiler.displayAll();
  //Profiler.reset()

};


Ganttalendar.prototype.fitGantt = function () {
  delete this.zoom;
  this.redraw();
};

Ganttalendar.prototype.synchHighlight = function () {
  //console.debug("synchHighlight",this.master.currentTask);
  if (this.master.currentTask ){
    // take care of collapsed rows
    var ganttHighLighterPosition=this.master.editor.element.find(".taskEditRow:visible").index(this.master.currentTask.rowElement);
    this.master.gantt.element.find(".ganttLinesSVG").removeClass("rowSelected").eq(ganttHighLighterPosition).addClass("rowSelected");
  } else {
    $(".rowSelected").removeClass("rowSelected"); // todo non c'era
  }
};


Ganttalendar.prototype.getCenterMillis= function () {
  return parseInt((this.element.parent().scrollLeft()+this.element.parent().width()/2)/this.fx+this.startMillis);
};

Ganttalendar.prototype.goToMillis= function (millis) {
  var x = Math.round(((millis) - this.startMillis) * this.fx) -this.element.parent().width()/2;
  this.element.parent().scrollLeft(x);
};

Ganttalendar.prototype.centerOnToday = function () {
  this.goToMillis(new Date().getTime());
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
  var offsetMouseRect;

  var options = {
    canDrag:        true,
    canResize:      true,
    resizeZoneWidth:5,
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
      el.bind("mousedown.deSVG",function (e) {
          //console.debug("mousedown.deSVG");
          if ($(e.target).is("image")) {
            e.preventDefault();
          }

          target = $(this);
          var x1 = parseFloat(el.find("[class*=taskLayout]").offset().left);
          var x2 = x1 + parseFloat(el.attr("width"));
          var posx = e.pageX;

          $("body").unselectable();

          //start resize end
          if (options.canResize && Math.abs(posx-x2)<=options.resizeZoneWidth) {
            //store offset mouse x2
            offsetMouseRect = x2 - e.pageX;
            target.attr("oldw", target.attr("width"));
            var one = true;

            //bind event for start resizing
            $(svg).bind("mousemove.deSVG", function (e) {
              //hide link circle
              $("[class*=linkHandleSVG]").hide();

              if (one) {
                //trigger startResize
                options.startResize.call(target.get(0), e);
                one = false;
              }

              //manage resizing
              var nW =  e.pageX - x1 + offsetMouseRect;

              target.attr("width", nW < options.minSize ? options.minSize : nW);
              //callback
              options.resize.call(target.get(0), e);
            });

            //bind mouse up on body to stop resizing
            $("body").one("mouseup.deSVG", stopResize);


          //start resize start
          } else  if (options.canResize && Math.abs(posx-x1)<=options.resizeZoneWidth) {
            //store offset mouse x1
            offsetMouseRect = parseFloat(target.attr("x"));
            target.attr("oldw", target.attr("width")); //todo controllare se è ancora usato oldw

            var one = true;

            //bind event for start resizing
            $(svg).bind("mousemove.deSVG", function (e) {
              //hide link circle
              $("[class*=linkHandleSVG]").hide();

              if (one) {
                //trigger startResize
                options.startResize.call(target.get(0), e);
                one = false;
              }

              //manage resizing
              var nx1= offsetMouseRect-(posx-e.pageX);
              var nW = (x2-x1) + (posx-e.pageX);
              nW=nW < options.minSize ? options.minSize : nW;
              target.attr("x",nx1);
              target.attr("width", nW);
              //callback
              options.resize.call(target.get(0), e);
            });

            //bind mouse up on body to stop resizing
            $("body").one("mouseup.deSVG", stopResize);


            // start drag
          } else if (options.canDrag) {
            //store offset mouse x1
            offsetMouseRect = parseFloat(target.attr("x")) - e.pageX;
            target.attr("oldx", target.attr("x"));

            var one = true;
            //bind event for start dragging
            $(svg).bind("mousemove.deSVG",function (e) {
              //hide link circle
              $("[class*=linkHandleSVG]").hide();
              if (one) {
                //trigger startDrag
                options.startDrag.call(target.get(0), e);
                one = false;
              }

              //manage resizing
              target.attr("x", offsetMouseRect + e.pageX);
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
          var x1 = el.find("[class*=taskLayout]").offset().left;
          var x2 = x1 + parseFloat(el.attr("width"));
          var posx = e.pageX;

          //set cursor handle
          //if (options.canResize && (x2-x1)>3*options.resizeZoneWidth &&((posx<=x2 &&  posx >= x2- options.resizeZoneWidth) || (posx>=x1 && posx<=x1+options.resizeZoneWidth))) {
          if (options.canResize && (Math.abs(posx-x1)<=options.resizeZoneWidth || Math.abs(posx-x2)<=options.resizeZoneWidth)) {
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
    if (target && target.attr("oldw")!=target.attr("width"))
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
