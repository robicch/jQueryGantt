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
function GanttMaster(){
    this.tasks = [];
    this.deletedTaskIds=[];
    this.links = [];

    this.editor = ""; //element for editor
    this.gantt = ""; //element for gantt

    this.element = "";
    this.resInfo="";
    this.utility = "";
    this.pageClass = "";
    this.rgrid = "";


    this.resources = ""; //list of resources
    this.roles = "";  //list of roles

    this.minEditableDate = 0;
    this.maxEditableDate = Infinity;

    this.canWriteOnParent=true;
    this.canWrite=true;

    this.firstDayOfWeek = Date.firstDayOfWeek;

    this.currentTask =""; // task currently selected;

    this.__currentTransaction="";  // a transaction object holds previous state during changes

    this.__undoStack = [];
    this.__redoStack = [];

    var self = this;
}

GanttMaster.prototype.init = function(place, resInfo, renderInfo) {
    this.element = place;
    this.resInfo =resInfo;
    var self=this;

    //load templates
    $("#gantEditorTemplates").loadTemplates().remove();
    //create editor
    this.editor = new GridEditor(this, renderInfo["ICON_INFO"]);
    this.editor.element.width(place.width() * 0.4 - 10);
    place.append(this.editor.element);

    var table = $("<div id='UGrid'>");
    var calcwidth = (place.width()* 0.6)+(2*$("#siebui-gdfColHeader").width());
    table.addClass("siebui-ganttTable").css({ width: calcwidth });

    this.rgrid = $("<div id='RGrid'>");
    this.rgrid.width(place.width() * 0.4);
    this.rgrid.addClass("siebui-gdfTable");

    this.gantt = new Ganttalendar(this, calcwidth, renderInfo);
    this.utility = table;
    //setup splitter
    var splitter = $.splittify.init(place, this.editor.element, this.rgrid, this.gantt.element, this.utility, 40);
    //splitter.secondBox.css("overflow-y", "auto").scroll(function() {//SAMPREDD
//    splitter.thirdBox.scroll(function() {
//        splitter.firstBox.scrollTop(splitter.thirdBox.scrollTop());
//    });


    //prepend buttons
    //place.before($.JST.createFromTemplate({}, "GANTBUTTONS"));


    //bindings
    place.bind("refreshTasks.gantt", function() {
        self.redrawTasks();
    }).bind("refreshTask.gantt", function(e, task) {
        self.drawTask(task);

    }).bind("deleteCurrentTask.gantt", function(e) {
        var row = self.currentTask.getRow();
        if (self.currentTask && (row>0 || self.currentTask.isNew()))
        {
            self.beginTransaction();

            self.currentTask.deleteTask();

            self.currentTask = undefined;
            //recompute depends string
            self.updateDependsStrings();

            //redraw
            self.redraw();

            //focus next row
            row = row > self.tasks.length - 1 ? self.tasks.length - 1 : row;
            if (row >= 0)
            {
                self.currentTask = self.tasks[row];
                self.currentTask.rowElement.click();
                self.currentTask.rowElement.find("[name=name]").focus();
            }
            self.endTransaction();
        }


    }).bind("addAboveCurrentTask.gantt", function() {
        self.beginTransaction();
        var ch;
        var row = 0;
        if (self.currentTask)
        {
            //cannot add brothers to root
            if (self.currentTask.level<=0)
            {
                return;
            }

            ch = new Task("tmp_" + new Date().getTime(), "", "", self.currentTask.level, self.currentTask.start, 1);
            row = self.currentTask.getRow();
        }
        else
        {
            ch = new Task("tmp_" + new Date().getTime(), "", "", 0, new Date().getTime(), 1);
        }
        var task = self.addTask(ch, row);
        if (task) {
            task.rowElement.click();
            task.rowElement.find("[name=name]").focus();
        }
        self.endTransaction();

    }).bind("addBelowCurrentTask.gantt", function() {
        self.beginTransaction();
        var ch;
        var row = 0;
        if (self.currentTask)
        {
            ch = new Task("tmp_" + new Date().getTime(), "", "", self.currentTask.level + 1, self.currentTask.start, 1);
            row = self.currentTask.getRow() + 1;
        }
        else
        {
            ch = new Task("tmp_" + new Date().getTime(), "", "", 0, new Date().getTime(), 1);
        }
        var task = self.addTask(ch, row);
        if (task)
        {
            task.rowElement.click();
            task.rowElement.find("[name=name]").focus();
        }
        self.endTransaction();


    }).bind("indentCurrentTask.gantt", function() {
        if (self.currentTask)
        {
            self.beginTransaction();
            self.currentTask.indent();
            self.endTransaction();
        }

    }).bind("outdentCurrentTask.gantt", function() {
        if (self.currentTask)
        {
            self.beginTransaction();
            self.currentTask.outdent();
            self.endTransaction();
        }

    }).bind("moveUpCurrentTask.gantt", function() {
        if (self.currentTask)
        {
            self.beginTransaction();
            self.currentTask.moveUp();
            self.endTransaction();
        }
    }).bind("moveDownCurrentTask.gantt", function() {
        if (self.currentTask)
        {
            self.beginTransaction();
            self.currentTask.moveDown();
            self.endTransaction();
        }

    }).bind("zoomPlus.gantt", function() {
        self.gantt.zoomGantt(true);
    }).bind("zoomMinus.gantt", function() {
        self.gantt.zoomGantt(false);

    }).bind("undo.gantt", function() {
        self.undo();
    }).bind("redo.gantt", function() {
        self.redo();
    });
};

GanttMaster.messages = {
   "CHANGE_OUT_OF_SCOPE":"NO_RIGHTS_FOR_UPDATE_PARENTS_OUT_OF_EDITOR_SCOPE",
   "START_IS_MILESTONE":"START_IS_MILESTONE",
   "END_IS_MILESTONE":"END_IS_MILESTONE",
   "TASK_HAS_CONSTRAINTS":"TASK_HAS_CONSTRAINTS",
   "GANTT_ERROR_DEPENDS_ON_OPEN_TASK":"GANTT_ERROR_DEPENDS_ON_OPEN_TASK",
   "GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK":"GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK",
   "TASK_HAS_EXTERNAL_DEPS":"TASK_HAS_EXTERNAL_DEPS",
   "GANNT_ERROR_LOADING_DATA_TASK_REMOVED":"GANNT_ERROR_LOADING_DATA_TASK_REMOVED",
   "CIRCULAR_REFERENCE":"CIRCULAR_REFERENCE",
   "ERROR_SETTING_DATES":"ERROR_SETTING_DATES",
   "CANNOT_DEPENDS_ON_ANCESTORS":"CANNOT_DEPENDS_ON_ANCESTORS",
   "CANNOT_DEPENDS_ON_DESCENDANTS":"CANNOT_DEPENDS_ON_DESCENDANTS",
   "INVALID_DATE_FORMAT":"INVALID_DATE_FORMAT",
   "GANT_QUARTER_SHORT":"GANT_QUARTER_SHORT",
   "GANT_SEMESTER_SHORT":"GANT_SEMESTER_SHORT"
};

GanttMaster.prototype.createTask = function (id, name, code, level, start, duration) {
    var task2 = new Task(id, name, code, level, start, duration);
    return task2;
};


GanttMaster.prototype.createResource = function (id, name) {
    var res = new Resource(id, name);
    return res;
};


//update depends strings
GanttMaster.prototype.updateDependsStrings = function() {
    //remove all deps
    var i;
    for (i=0;i<this.tasks.length;i++)
    {
        this.tasks[i].depends = "";
    }

    for (i=0;i<this.links.length;i++)
    {
        var link = this.links[i];
        var dep = link.to.depends;
        link.to.depends = link.to.depends + (link.to.depends === "" ? "" : ",") + (link.from.getRow() + 1) + (link.lag ? ":" + link.lag : "");
    }

};

//------------------------------------  ADD TASK --------------------------------------------
GanttMaster.prototype.addTask = function(task, row) {
    //console.debug("master.addTask",task,row,this);
    task.master = this; // in order to access controller from task

    //replace if already exists
    var pos = -1;
    for (var i=0;i<this.tasks.length;i++)
    {
        if (task.id == this.tasks[i].id)
        {
            pos = i;
            break;
        }
    }

    if (pos >= 0)
    {
        this.tasks.splice(pos, 1);
        row = parseInt(pos, 10);
    }

    //add task in collection
    if (typeof(row) != "number")
    {
        this.tasks.push(task);
    }
    else
    {
        this.tasks.splice(row, 0, task);

        //recompute depends string
        this.updateDependsStrings();
    }

    //add Link collection in memory
    var linkLoops = !this.updateLinks(task);

    //set the status according to parent
    if (task.getParent())
    {
        task.status=task.getParent().status;
    }
    else
    {
        task.status="STATUS_ACTIVE";
    }


    var ret = task;
    if (linkLoops || !task.setPeriod(task.start, task.end))
    {
        //remove task from in-memory collection
        //console.debug("removing task from memory",task);
        this.tasks.splice(task.getRow(), 1);
        ret = undefined;
    }
    else
    {
        //append task to editor
        this.editor.addTask(task, row);
        //append task to gantt
        this.gantt.addTask(task);
    }
    return ret;
};


/**
 * a project contais tasks, resources, roles, and info about permisions
 * @param project
 */
GanttMaster.prototype.loadProject = function (project) {
    //this.beginTransaction(); Ravi Commented
    this.pageClass = project.pageclass;
    this.loadTasks(project.tasks, project.events, project.selectedRow);
    //this.endTransaction(); Ravi Commented
};

GanttMaster.prototype.loadTasks = function (ganttTasks, events, selectedRow) {
    this.editor.addTask(ganttTasks);
    this.utility.append($(events));
};


GanttMaster.prototype.getTask = function(taskId) {
    var ret;
    for (var i=0;i<this.tasks.length;i++)
    {
        var tsk = this.tasks[i];
        if (tsk.id == taskId)
        {
            ret = tsk;
            break;
        }
    }
    return ret;
};


GanttMaster.prototype.getResource = function(resId) {
    var ret;
    for (var i=0;i<this.resources.length;i++)
    {
        var res = this.resources[i];
        if (res.id == resId)
        {
            ret = res;
            break;
        }
    }
    return ret;
};


GanttMaster.prototype.changeTaskDates = function(task, start, end) {
    return task.setPeriod(start, end);
};


GanttMaster.prototype.moveTask = function(task, newStart) {
    return task.moveTo(newStart, true);
};


GanttMaster.prototype.taskIsChanged = function() {
    //console.debug("taskIsChanged");
    var master=this;

    //refresh is executed only once every 50ms
    this.element.stopTime("gnnttaskIsChanged");
    //var profilerext = new Profiler("gm_taskIsChangedRequest");
    this.element.oneTime(50, "gnnttaskIsChanged", function() {
    //console.debug("task Is Changed real call to redraw");
    //var profiler = new Profiler("gm_taskIsChangedReal");
    //master.editor.redraw();
    //shrshett, with these refresh bindevent is not happening for activity classes, so, commenting
    //master.gantt.refreshGantt();
    //profiler.stop();
    });

    if (this.currentTask) {
        this.gantt.highlightBar.css("top", this.currentTask.rowElement.position().top);
    }
    //profilerext.stop();
};


GanttMaster.prototype.redraw = function() {
    this.editor.redraw();
    this.gantt.refreshGantt();
};

GanttMaster.prototype.reset = function() {
    this.tasks = [];
    this.links = [];
    this.deletedTaskIds=[];
    this.__undoStack = [];
    this.__redoStack = [];
    delete this.currentTask;

    this.editor.reset();
    this.gantt.reset();
};


GanttMaster.prototype.showTaskEditor = function(taskId) {
    var task = this.getTask(taskId);
    task.rowElement.find(".edit").click();
};


GanttMaster.prototype.saveProject = function() {
    return this.saveGantt(false);
};

GanttMaster.prototype.saveGantt = function(forTransaction) {
    //var prof = new Profiler("gm_saveGantt");
    var saved = [];
    for (var i=0;i<this.tasks.length;i++)
    {
        var task = this.tasks[i];
        var cloned = task.clone();
        delete cloned.master;
        delete cloned.rowElement;
        delete cloned.ganttElement;

        saved.push(cloned);
    }

    var ret = {tasks:saved};
    if (this.currentTask)
    {
        ret.selectedRow = this.currentTask.getRow();
    }

    ret.deletedTaskIds=this.deletedTaskIds;  //this must be consistent with transactions and undo

    if (!forTransaction)
    {
        ret.resources = this.resources;
        ret.roles = this.roles;
        ret.canWrite = this.canWrite;
        ret.canWriteOnParent = this.canWriteOnParent;
    }

    //prof.stop();
    return ret;
};


GanttMaster.prototype.updateLinks = function(task) {
  //console.debug("updateLinks");
  //var prof= new Profiler("gm_updateLinks");

  // defines isLoop function
  function isLoop(task, target, visited) {
    if (target == task)
    {
      return true;
    }
    var sups = task.getSuperiors();
    var loop = false;
    for (var i=0;i<sups.length;i++) {
      var supLink = sups[i];
      if (supLink.from == target) {
        loop = true;
        break;
      } else {
        if (visited.indexOf(supLink.from) <= 0) {
          visited.push(supLink.from);
          if (isLoop(supLink.from, target, visited)) {
            loop = true;
            break;
          }
        }
      }
    }
    return loop;
  }

  //remove my depends
  this.links = this.links.filter(function(link) {
    return link.to != task;
  });

  var todoOk = true;
  if (task.depends) {

    //cannot depend from an ancestor
    var parents = task.getParents();
    //cannot depend from descendants
    var descendants=task.getDescendant();

    var deps = task.depends.split(",");
    var newDepsString = "";

    var visited = [];
    for (var j=0;j<deps.length;j++) {
      var dep = deps[j]; // in the form of row(lag) e.g. 2:3,3:4,5
      var par = dep.split(":");
      var lag = 0;
      if (par.length > 1)
      {
        lag = parseInt(par[1], 10);
      }
      var sup = this.tasks[parseInt(par[0] - 1, 10)];

      if (sup) {
        if (parents && parents.indexOf(sup) >= 0) {
          this.setErrorOnTransaction(task.name + "\n"+GanttMaster.messages.CANNOT_DEPENDS_ON_ANCESTORS+"\n" + sup.name);
          todoOk = false;

        } else if (descendants && descendants.indexOf(sup) >= 0) {
          this.setErrorOnTransaction(task.name + "\n"+GanttMaster.messages.CANNOT_DEPENDS_ON_DESCENDANTS+"\n" + sup.name);
          todoOk = false;

        } else if (isLoop(sup, task, visited)) {
          todoOk = false;
          this.setErrorOnTransaction(GanttMaster.messages.CIRCULAR_REFERENCE+"\n" + task.name + " -> " + sup.name);
        } else {
          this.links.push(new Link(sup, task, lag));
          newDepsString = newDepsString + (newDepsString.length > 0 ? "," : "") + dep;
        }
      }
    }
    if (todoOk) {
      task.depends = newDepsString;

    }

  }

  //prof.stop();

  return todoOk;
};


//<%----------------------------- TRANSACTION MANAGEMENT ---------------------------------%>
GanttMaster.prototype.beginTransaction = function() {
    if (!this.__currentTransaction) {
        this.__currentTransaction = {
            snapshot:JSON.stringify(this.saveGantt(true)),
            errors:[]
        };
    }
    else
    {
        console.error("Cannot open twice a transaction");
    }
    return this.__currentTransaction;
};


GanttMaster.prototype.endTransaction = function() {
    var ret = true;
    var i;
    if (this.__currentTransaction) {
        //no error -> commit
        if (this.__currentTransaction.errors.length <= 0)
        {
            //console.debug("committing transaction");

            //put snapshot in undo
            this.__undoStack.push(this.__currentTransaction.snapshot);
            //clear redo stack
            this.__redoStack = [];

            //shrink gantt bundaries
            this.gantt.originalStartMillis = Infinity;
            this.gantt.originalEndMillis = -Infinity;
            for (i=0;i<this.tasks.length;i++)
            {
                var task = this.tasks[i];
                if (this.gantt.originalStartMillis > task.start)
                {
                    this.gantt.originalStartMillis = task.start;
                }
                if (this.gantt.originalEndMillis < task.end)
                {
                    this.gantt.originalEndMillis = task.end;
                }
            }
            this.taskIsChanged(); //enqueue for gantt refresh
        }
        else
        {
            ret = false;
            //console.debug("rolling-back transaction");
            //try to restore changed tasks
            var oldTasks = JSON.parse(this.__currentTransaction.snapshot);
            this.deletedTaskIds=oldTasks.deletedTaskIds;
            this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
            this.redraw();

            //compose error message
            var msg = "";
            for (i=0;i<this.__currentTransaction.errors.length;i++)
            {
                var err = this.__currentTransaction.errors[i];
                msg = msg + err.msg + "\n\n";
            }
            alert(msg);
        }
        //reset transaction
        this.__currentTransaction = undefined;
    }
    else
    {
        console.error("Transaction never started.");
    }
    return ret;
};

//this function notify an error to a transaction -> transaction will rollback
GanttMaster.prototype.setErrorOnTransaction = function(errorMessage, task) {
    if (this.__currentTransaction)
    {
        this.__currentTransaction.errors.push({msg:errorMessage,task:task});
    }
    else
    {
        console.error(errorMessage);
    }
};

// inhibit undo-redo
GanttMaster.prototype.checkpoint= function() {
    this.__undoStack=[];
    this.__redoStack = [];
};

//----------------------------- UNDO/REDO MANAGEMENT ---------------------------------%>

GanttMaster.prototype.undo = function() {
    //console.debug("undo before:",undoStack,redoStack);
    if (this.__undoStack.length > 0)
    {
        var his = this.__undoStack.pop();
        this.__redoStack.push(JSON.stringify(this.saveGantt()));
        var oldTasks = JSON.parse(his);
        this.deletedTaskIds=oldTasks.deletedTaskIds;
        this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
        //console.debug(oldTasks,oldTasks.deletedTaskIds)
        this.redraw();
        //console.debug("undo after:",undoStack,redoStack);
    }
};

GanttMaster.prototype.redo = function() {
    //console.debug("redo before:",undoStack,redoStack);
    if (this.__redoStack.length > 0)
    {
        var his = this.__redoStack.pop();
        this.__undoStack.push(JSON.stringify(this.saveGantt()));
        var oldTasks = JSON.parse(his);
        this.deletedTaskIds=oldTasks.deletedTaskIds;
        this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
        this.redraw();
        //console.debug("redo after:",undoStack,redoStack);
    }
};

GanttMaster.prototype.getResInfo = function(resID) {
    var mapDynamicRes = this.resInfo;
    if(mapDynamicRes && mapDynamicRes[resID])
    {
        return mapDynamicRes[resID].INFO;
    }
    else
    {
        return;
    }
};

GanttMaster.prototype.getResColumnInfo = function(resID, index) {
    var mapDynamicRes = this.resInfo;
    if (mapDynamicRes && mapDynamicRes[resID] && mapDynamicRes[resID].COLUMNS) {
        return mapDynamicRes[resID].COLUMNS[index];
    }
    else {
        return;
    }
};


GanttMaster.prototype.gettaskSeqEvents = function(resID) {
    var mapDynamicRes = this.resInfo;
    if (mapDynamicRes && mapDynamicRes[resID] && mapDynamicRes[resID].BOOKINGS) {
        return mapDynamicRes[resID].BOOKINGS;
    }
    else {
        return;
    }
};

GanttMaster.prototype.getEvent = function(resID, bookingId) {
    var mapDynamicRes = this.resInfo;
    if (mapDynamicRes && mapDynamicRes[resID] && mapDynamicRes[resID].EVENTS) {
        return mapDynamicRes[resID].EVENTS[bookingId];
    }
    else {
        return;
    }
};

GanttMaster.prototype.getNoOfColumns = function(resID) {
    var mapDynamicRes = this.resInfo;
    if (mapDynamicRes && mapDynamicRes[resID] && mapDynamicRes[resID].COLUMNS) {
        return mapDynamicRes[resID].COLUMNS.length;
    }
    else {
        return 0;
    }
};
GanttMaster.prototype.getfx = function() {
    return this.gantt.fx;
};
