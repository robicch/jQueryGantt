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
function GanttMaster() {
  this.tasks = [];
  this.deletedTaskIds = [];
  this.links = [];

  this.editor; //element for editor
  this.gantt; //element for gantt
  this.splitter; //element for splitter

  this.element;


  this.resources; //list of resources
  this.roles;  //list of roles

  this.minEditableDate = 0;
  this.maxEditableDate = Infinity;

  this.canWriteOnParent = true;
  this.canWrite = true;

  this.firstDayOfWeek = Date.firstDayOfWeek;

  this.currentTask; // task currently selected;

  this.__currentTransaction;  // a transaction object holds previous state during changes
  this.__undoStack = [];
  this.__redoStack = [];
  this.__inUndoRedo = false; // a control flag to avoid Undo/Redo stacks reset when needed

  var self = this;
}



GanttMaster.prototype.init = function (place) {
  this.element = place;
  var self = this;
  //load templates
  $("#gantEditorTemplates").loadTemplates().remove();

  //create editor
  this.editor = new GridEditor(this);
  place.append(this.editor.gridified);

  //create gantt
  this.gantt = new Ganttalendar("m", new Date().getTime() - 3600000 * 24 * 2, new Date().getTime() + 3600000 * 24 * 15, this, place.width() * .6);

  //setup splitter
  self.splitter = $.splittify.init(place, this.editor.gridified, this.gantt.element, 60);
  self.splitter.firstBoxMinWidth=30;

  //prepend buttons
  place.before($.JST.createFromTemplate({}, "GANTBUTTONS"));


  //bindings
  place.bind("refreshTasks.gantt",function () {
    self.redrawTasks();
  }).bind("refreshTask.gantt",function (e, task) {
      self.drawTask(task);

    }).bind("deleteCurrentTask.gantt",function (e) {
      self.deleteCurrentTask();
    }).bind("addAboveCurrentTask.gantt",function () {
      self.addAboveCurrentTask();
    }).bind("addBelowCurrentTask.gantt",function () {
      self.addBelowCurrentTask();
    }).bind("indentCurrentTask.gantt",function () {
      self.indentCurrentTask();
    }).bind("outdentCurrentTask.gantt",function () {
      self.outdentCurrentTask();

    }).bind("moveUpCurrentTask.gantt",function () {
      self.moveUpCurrentTask();

    }).bind("moveDownCurrentTask.gantt",function () {
      self.moveDownCurrentTask();

    }).bind("zoomPlus.gantt",function () {
      self.gantt.zoomGantt(true);
    }).bind("zoomMinus.gantt",function () {
      self.gantt.zoomGantt(false);

    }).bind("undo.gantt",function () {
      if(!self.canWrite)
        return;
      self.undo();
    }).bind("redo.gantt", function () {
      if(!self.canWrite)
        return;
      self.redo();
    }).bind("resize.gantt", function () {
      self.resize();
    });

    //keyboard management bindings
  $("body").bind("keydown.body", function (e) {
    //console.debug(e.keyCode+ " "+e.target.nodeName)

    //manage only events for body -> not from inputs
    if (e.target.nodeName.toLowerCase() == "body" || e.target.nodeName.toLowerCase() == "svg") { // chrome,ff receive "body" ie "svg"
      //something focused?
      //console.debug(e.keyCode, e.ctrlKey)
      var eventManaged=true;
      switch (e.keyCode) {
        case 46: //del
        case 8: //backspace
          var focused = self.gantt.element.find(".focused.focused");// orrible hack for chrome that seems to keep in memory a cached object
          if (focused.is(".taskBox")) { // remove task
            self.deleteCurrentTask();
          } else if (focused.is(".linkGroup")) {
            self.removeLink(focused.data("from"), focused.data("to"));
          }
          break;

        case 38: //up
          if (self.currentTask) {
            if (self.currentTask.ganttElement.is(".focused")) {
              self.moveUpCurrentTask();
              self.gantt.element.oneTime(100, function () {self.currentTask.ganttElement.addClass("focused");});

            } else {
              self.currentTask.rowElement.prev().click();
            }
          }
          break;

        case 40: //down
          if (self.currentTask) {
            if (self.currentTask.ganttElement.is(".focused")) {
              self.moveDownCurrentTask();
              self.gantt.element.oneTime(100, function () {self.currentTask.ganttElement.addClass("focused");});
            } else {
              self.currentTask.rowElement.next().click();
            }
          }
          break;

        case 39: //right
          if (self.currentTask) {
            if (self.currentTask.ganttElement.is(".focused")) {
              self.indentCurrentTask();
              self.gantt.element.oneTime(100, function () {self.currentTask.ganttElement.addClass("focused");});
            }
          }
          break;

        case 37: //left
          if (self.currentTask) {
            if (self.currentTask.ganttElement.is(".focused")) {
              self.outdentCurrentTask();
              self.gantt.element.oneTime(100, function () {self.currentTask.ganttElement.addClass("focused");});
            }
          }
          break;


        case 89: //Y
          if (e.ctrlKey) {
            self.redo();
          }
          break;

        case 90: //Z
          if (e.ctrlKey) {
            self.undo();
          }
          break;

        default :{
          eventManaged=false;
        }

      }
      if (eventManaged){
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
};

GanttMaster.messages = {
  "CANNOT_WRITE":                  "CANNOT_WRITE",
  "CHANGE_OUT_OF_SCOPE":                  "NO_RIGHTS_FOR_UPDATE_PARENTS_OUT_OF_EDITOR_SCOPE",
  "START_IS_MILESTONE":                   "START_IS_MILESTONE",
  "END_IS_MILESTONE":                     "END_IS_MILESTONE",
  "TASK_HAS_CONSTRAINTS":                 "TASK_HAS_CONSTRAINTS",
  "GANTT_ERROR_DEPENDS_ON_OPEN_TASK":     "GANTT_ERROR_DEPENDS_ON_OPEN_TASK",
  "GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK":"GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK",
  "TASK_HAS_EXTERNAL_DEPS":               "TASK_HAS_EXTERNAL_DEPS",
  "GANTT_ERROR_LOADING_DATA_TASK_REMOVED":"GANTT_ERROR_LOADING_DATA_TASK_REMOVED",
  "CIRCULAR_REFERENCE":                   "CIRCULAR_REFERENCE",
  "ERROR_SETTING_DATES":                  "ERROR_SETTING_DATES",
  "CANNOT_DEPENDS_ON_ANCESTORS":          "CANNOT_DEPENDS_ON_ANCESTORS",
  "CANNOT_DEPENDS_ON_DESCENDANTS":        "CANNOT_DEPENDS_ON_DESCENDANTS",
  "INVALID_DATE_FORMAT":                  "INVALID_DATE_FORMAT",
  "GANTT_QUARTER_SHORT": "GANTT_QUARTER_SHORT",
  "GANTT_SEMESTER_SHORT":"GANTT_SEMESTER_SHORT",
  "CANNOT_CLOSE_TASK_IF_OPEN_ISSUE":"CANNOT_CLOSE_TASK_IF_OPEN_ISSUE"
};


GanttMaster.prototype.createTask = function (id, name, code, level, start, duration) {
  var factory = new TaskFactory();
  return factory.build(id, name, code, level, start, duration);
};


GanttMaster.prototype.createResource = function (id, name) {
  var res = new Resource(id, name);
  return res;
};


//update depends strings
GanttMaster.prototype.updateDependsStrings = function () {
  //remove all deps
  for (var i = 0; i < this.tasks.length; i++) {
    this.tasks[i].depends = "";
  }

  for (var i = 0; i < this.links.length; i++) {
    var link = this.links[i];
    var dep = link.to.depends;
    link.to.depends = link.to.depends + (link.to.depends == "" ? "" : ",") + (link.from.getRow() + 1) + (link.lag ? ":" + link.lag : "");
  }

};

GanttMaster.prototype.removeLink = function (fromTask,toTask) {
  //console.debug("removeLink");
  if (!this.canWrite || (!fromTask.canWrite && !toTask.canWrite))
    return;

  this.beginTransaction();
  var found = false;
  for (var i = 0; i < this.links.length; i++) {
    if (this.links[i].from == fromTask && this.links[i].to == toTask) {
      this.links.splice(i, 1);
      found = true;
      break;
    }
  }

  if (found) {
    this.updateDependsStrings();
    if (this.updateLinks(toTask))
      this.changeTaskDates(toTask, toTask.start, toTask.end); // fake change to force date recomputation from dependencies
  }
  this.endTransaction();
};

GanttMaster.prototype.removeAllLinks = function (task,openTrans) {
  //console.debug("removeLink");
  if (!this.canWrite || (!task.canWrite && !task.canWrite))
    return;

  if (openTrans)
    this.beginTransaction();
  var found = false;
  for (var i = 0; i < this.links.length; i++) {
    if (this.links[i].from == task || this.links[i].to == task) {
      this.links.splice(i, 1);
      found = true;
    }
  }

  if (found) {
    this.updateDependsStrings();
  }
  if (openTrans)
    this.endTransaction();
};

//------------------------------------  ADD TASK --------------------------------------------
GanttMaster.prototype.addTask = function (task, row) {
  //console.debug("master.addTask",task,row,this);
  task.master = this; // in order to access controller from task

  //replace if already exists
  var pos = -1;
  for (var i = 0; i < this.tasks.length; i++) {
    if (task.id == this.tasks[i].id) {
      pos = i;
      break;
    }
  }

  if (pos >= 0) {
    this.tasks.splice(pos, 1);
    row = parseInt(pos);
  }

  //add task in collection
  if (typeof(row) != "number") {
    this.tasks.push(task);
  } else {
    this.tasks.splice(row, 0, task);

    //recompute depends string
    this.updateDependsStrings();
  }

  //add Link collection in memory
  var linkLoops = !this.updateLinks(task);

  //set the status according to parent
  if (task.getParent())
    task.status = task.getParent().status;
  else
    task.status = "STATUS_ACTIVE";

  var ret = task;
  if (linkLoops || !task.setPeriod(task.start, task.end)) {
    //remove task from in-memory collection
    //console.debug("removing task from memory",task);
    this.tasks.splice(task.getRow(), 1);
    ret = undefined;
  } else {
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
  //console.debug("loadProject",project)
  this.beginTransaction();
  this.resources = project.resources;
  this.roles = project.roles;
  this.canWrite = project.canWrite;
  this.canWriteOnParent = project.canWriteOnParent;
  this.cannotCloseTaskIfIssueOpen = project.cannotCloseTaskIfIssueOpen;

  if (project.minEditableDate)
    this.minEditableDate = computeStart(project.minEditableDate);
  else
    this.minEditableDate = -Infinity;

  if (project.maxEditableDate)
    this.maxEditableDate = computeEnd(project.maxEditableDate);
  else
    this.maxEditableDate = Infinity;

  this.loadTasks(project.tasks, project.selectedRow);
  this.deletedTaskIds = [];
  
  //recover saved splitter position
  if (project.splitterPosition)
    this.splitter.resize(project.splitterPosition);

  //recover saved zoom level
  if (project.zoom)
    this.gantt.zoom=project.zoom;


  //[expand]
  this.gantt.refreshGantt();

  this.endTransaction();
  var self = this;
  this.gantt.element.oneTime(200, function () {self.gantt.centerOnToday()});
};


GanttMaster.prototype.loadTasks = function (tasks, selectedRow) {
  var factory = new TaskFactory();
  //reset
  this.reset();

  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];
    if (!(task instanceof Task)) {
      var t = factory.build(task.id, task.name, task.code, task.level, task.start, task.duration, task.collapsed);
      for (var key in task) {
        if (key != "end" && key != "start")
          t[key] = task[key]; //copy all properties
      }
      task = t;
    }
    task.master = this; // in order to access controller from task
    this.tasks.push(task);  //append task at the end
  }

  //var prof=new Profiler("gm_loadTasks_addTaskLoop");
  for (var i = 0; i < this.tasks.length; i++) {
    var task = this.tasks[i];


    var numOfError=this.__currentTransaction&&this.__currentTransaction.errors?this.__currentTransaction.errors.length:0;
    //add Link collection in memory
    while (!this.updateLinks(task)){  // error on update links while loading can be considered as "warning". Can be displayed and removed in order to let transaction commits.
      if (this.__currentTransaction && numOfError!=this.__currentTransaction.errors.length){
        var msg = "";
        while (numOfError<this.__currentTransaction.errors.length) {
          var err = this.__currentTransaction.errors.pop();
          msg = msg + err.msg + "\n\n";
        }
        alert(msg);
      }
      this.removeAllLinks(task,false);
    }

    if (!task.setPeriod(task.start, task.end)) {
      alert(GanttMaster.messages.GANNT_ERROR_LOADING_DATA_TASK_REMOVED + "\n" + task.name + "\n" +GanttMaster.messages.ERROR_SETTING_DATES);
        //remove task from in-memory collection
      this.tasks.splice(task.getRow(), 1);
    } else {
      //append task to editor
      this.editor.addTask(task, null, true);
      //append task to gantt
      this.gantt.addTask(task);
    }
  }

  this.editor.fillEmptyLines();
  //prof.stop();

  // re-select old row if tasks is not empty
  if (this.tasks && this.tasks.length > 0) {
    selectedRow = selectedRow ? selectedRow : 0;
    this.tasks[selectedRow].rowElement.click();
  }
};


GanttMaster.prototype.getTask = function (taskId) {
  var ret;
  for (var i = 0; i < this.tasks.length; i++) {
    var tsk = this.tasks[i];
    if (tsk.id == taskId) {
      ret = tsk;
      break;
    }
  }
  return ret;
};


GanttMaster.prototype.getResource = function (resId) {
  var ret;
  for (var i = 0; i < this.resources.length; i++) {
    var res = this.resources[i];
    if (res.id == resId) {
      ret = res;
      break;
    }
  }
  return ret;
};


GanttMaster.prototype.changeTaskDates = function (task, start, end) {
  return task.setPeriod(start, end);
};


GanttMaster.prototype.moveTask = function (task, newStart) {
  return task.moveTo(newStart, true);
};


GanttMaster.prototype.taskIsChanged = function () {
  //console.debug("taskIsChanged");
  var master = this;

  //refresh is executed only once every 50ms
  this.element.stopTime("gnnttaskIsChanged");
  //var profilerext = new Profiler("gm_taskIsChangedRequest");
  this.element.oneTime(50, "gnnttaskIsChanged", function () {
    //console.debug("task Is Changed real call to redraw");
    //var profiler = new Profiler("gm_taskIsChangedReal");
    master.editor.redraw();
    master.gantt.refreshGantt();
    //profiler.stop();
  });
  //profilerext.stop();
};


GanttMaster.prototype.redraw = function () {
  this.editor.redraw();
  this.gantt.refreshGantt();
};

GanttMaster.prototype.reset = function () {
  this.tasks = [];
  this.links = [];
  this.deletedTaskIds = [];
  if (!this.__inUndoRedo) {
    this.__undoStack = [];
    this.__redoStack = [];
  } else { // don't reset the stacks if we're in an Undo/Redo, but restart the inUndoRedo control
    this.__inUndoRedo = false;
  }
  delete this.currentTask;

  this.editor.reset();
  this.gantt.reset();
};


GanttMaster.prototype.showTaskEditor = function (taskId) {
  var task = this.getTask(taskId);
  task.rowElement.find(".edit").click();
};

GanttMaster.prototype.saveProject = function () {
  return this.saveGantt(false);
};

GanttMaster.prototype.saveGantt = function (forTransaction) {
  //var prof = new Profiler("gm_saveGantt");
  var saved = [];
  for (var i = 0; i < this.tasks.length; i++) {
    var task = this.tasks[i];
    var cloned = task.clone();
    delete cloned.master;
    delete cloned.rowElement;
    delete cloned.ganttElement;

    saved.push(cloned);
  }

  var ret = {tasks:saved};
  if (this.currentTask) {
    ret.selectedRow = this.currentTask.getRow();
  }

  ret.deletedTaskIds = this.deletedTaskIds;  //this must be consistent with transactions and undo

  if (!forTransaction) {
    ret.resources = this.resources;
    ret.roles = this.roles;
    ret.canWrite = this.canWrite;
    ret.canWriteOnParent = this.canWriteOnParent;
    ret.splitterPosition=this.splitter.perc;
    ret.zoom=this.gantt.zoom;
  }

  //prof.stop();
  return ret;
};


GanttMaster.prototype.updateLinks = function (task) {
  //console.debug("updateLinks",task);
  //var prof= new Profiler("gm_updateLinks");

  // defines isLoop function
  function isLoop(task, target, visited) {
    //var prof= new Profiler("gm_isLoop");
    //console.debug("isLoop :"+task.name+" - "+target.name);
    if (target == task) {
      return true;
    }

    var sups = task.getSuperiors();

    //my parent' superiors are my superiors too
    var p= task.getParent();
    while (p){
      sups=sups.concat(p.getSuperiors());
      p= p.getParent();
    }

    //my children superiors are my superiors too
    var chs=task.getChildren();
    for (var i=0;i<chs.length;i++){
      sups=sups.concat(chs[i].getSuperiors());
    }


    var loop = false;
    //check superiors
    for (var i = 0; i < sups.length; i++) {
      var supLink = sups[i];
      if (supLink.from == target) {
        loop = true;
        break;
      } else {
        if (visited.indexOf(supLink.from.id+"x"+target.id) <= 0) {
          visited.push(supLink.from.id+"x"+target.id);
          if (isLoop(supLink.from, target, visited)) {
            loop = true;
            break;
          }
        }
      }
    }

    //check target parent
    var tpar=target.getParent();
    if (tpar ){
      if (visited.indexOf(task.id+"x"+tpar.id) <= 0) {
        visited.push(task.id+"x"+tpar.id);
        if (isLoop(task,tpar, visited)) {
          loop = true;
        }
      }
    }

    //prof.stop();
    return loop;
  }

  //remove my depends
  this.links = this.links.filter(function (link) {
    return link.to != task;
  });

  var todoOk = true;
  if (task.depends) {

    //cannot depend from an ancestor
    var parents = task.getParents();
    //cannot depend from descendants
    var descendants = task.getDescendant();

    var deps = task.depends.split(",");
    var newDepsString = "";

    var visited = [];
    for (var j = 0; j < deps.length; j++) {
      var dep = deps[j]; // in the form of row(lag) e.g. 2:3,3:4,5
      var par = dep.split(":");
      var lag = 0;

      if (par.length > 1) {
        lag = parseInt(par[1]);
      }

      var sup = this.tasks[parseInt(par[0] - 1)];

      if (sup) {
        if (parents && parents.indexOf(sup) >= 0) {
          this.setErrorOnTransaction(task.name + "\n" + GanttMaster.messages.CANNOT_DEPENDS_ON_ANCESTORS + "\n" + sup.name);
          todoOk = false;

        } else if (descendants && descendants.indexOf(sup) >= 0) {
          this.setErrorOnTransaction(task.name + "\n" + GanttMaster.messages.CANNOT_DEPENDS_ON_DESCENDANTS + "\n" + sup.name);
          todoOk = false;

        } else if (isLoop(sup, task, visited)) {
          todoOk = false;
          this.setErrorOnTransaction(GanttMaster.messages.CIRCULAR_REFERENCE + "\n" + task.name + " -> " + sup.name);
        } else {
          this.links.push(new Link(sup, task, lag));
          newDepsString = newDepsString + (newDepsString.length > 0 ? "," : "") + dep;
        }
      }
    }

    task.depends = newDepsString;

  }

  //prof.stop();

  return todoOk;
};


GanttMaster.prototype.moveUpCurrentTask=function(){
  var self=this;
  //console.debug("moveUpCurrentTask",self.currentTask)
  if(!self.canWrite )
    return;

  if (self.currentTask) {
    self.beginTransaction();
    self.currentTask.moveUp();
    self.endTransaction();
  }
};

GanttMaster.prototype.moveDownCurrentTask=function(){
  var self=this;
  //console.debug("moveDownCurrentTask",self.currentTask)
  if(!self.canWrite)
    return;

  if (self.currentTask) {
    self.beginTransaction();
    self.currentTask.moveDown();
    self.endTransaction();
  }
};

GanttMaster.prototype.outdentCurrentTask=function(){
  var self=this;
  if(!self.canWrite|| !self.currentTask.canWrite)
    return;

  if (self.currentTask) {
    var par = self.currentTask.getParent();

    self.beginTransaction();
    self.currentTask.outdent();
    self.endTransaction();

    //[expand]
    if(par) self.editor.refreshExpandStatus(par);
  }
};

GanttMaster.prototype.indentCurrentTask=function(){
  var self=this;
  if (!self.canWrite|| !self.currentTask.canWrite)
    return;

  if (self.currentTask) {
    self.beginTransaction();
    self.currentTask.indent();
    self.endTransaction();
  }
};

GanttMaster.prototype.addBelowCurrentTask=function(){
  var self=this;
  if (!self.canWrite)
    return;

  var factory = new TaskFactory();
  self.beginTransaction();
  var ch;
  var row = 0;
  if (self.currentTask) {
    ch = factory.build("tmp_" + new Date().getTime(), "", "", self.currentTask.level + 1, self.currentTask.start, 1);
    row = self.currentTask.getRow() + 1;
  } else {
    ch = factory.build("tmp_" + new Date().getTime(), "", "", 0, new Date().getTime(), 1);
  }
  var task = self.addTask(ch, row);
  if (task) {
    task.rowElement.click();
    task.rowElement.find("[name=name]").focus();
  }
  self.endTransaction();
};

GanttMaster.prototype.addAboveCurrentTask=function(){
  var self=this;
  if (!self.canWrite)
    return;
  var factory = new TaskFactory();

  var ch;
  var row = 0;
  if (self.currentTask) {
    //cannot add brothers to root
    if (self.currentTask.level <= 0)
      return;

    ch = factory.build("tmp_" + new Date().getTime(), "", "", self.currentTask.level, self.currentTask.start, 1);
    row = self.currentTask.getRow();
  } else {
    ch = factory.build("tmp_" + new Date().getTime(), "", "", 0, new Date().getTime(), 1);
  }
  self.beginTransaction();
  var task = self.addTask(ch, row);
  if (task) {
    task.rowElement.click();
    task.rowElement.find("[name=name]").focus();
  }
  self.endTransaction();
};

GanttMaster.prototype.deleteCurrentTask=function(){
  var self=this;
  if (!self.currentTask || !self.canWrite || !self.currentTask.canWrite)
    return;
  var row = self.currentTask.getRow();
  if (self.currentTask && (row > 0 || self.currentTask.isNew())) {
    var par = self.currentTask.getParent();
    self.beginTransaction();
    self.currentTask.deleteTask();
    self.currentTask = undefined;

    //recompute depends string
    self.updateDependsStrings();

    //redraw
    self.redraw();
  
    //[expand]
    if(par) self.editor.refreshExpandStatus(par);


    //focus next row
    row = row > self.tasks.length - 1 ? self.tasks.length - 1 : row;
    if (row >= 0) {
      self.currentTask = self.tasks[row];
      self.currentTask.rowElement.click();
      self.currentTask.rowElement.find("[name=name]").focus();
    }
    self.endTransaction();
  }
};



//<%----------------------------- TRANSACTION MANAGEMENT ---------------------------------%>
GanttMaster.prototype.beginTransaction = function () {
  if (!this.__currentTransaction) {
    this.__currentTransaction = {
      snapshot:JSON.stringify(this.saveGantt(true)),
      errors:  []
    };
  } else {
    console.error("Cannot open twice a transaction");
  }
  return this.__currentTransaction;
};


GanttMaster.prototype.endTransaction = function () {
  if (!this.__currentTransaction) {
    console.error("Transaction never started.");
    return true;
  }

  var ret = true;

  //no error -> commit
  if (this.__currentTransaction.errors.length <= 0) {
    //console.debug("committing transaction");

    //put snapshot in undo
    this.__undoStack.push(this.__currentTransaction.snapshot);
    //clear redo stack
    this.__redoStack = [];

    //shrink gantt bundaries
    this.gantt.originalStartMillis = Infinity;
    this.gantt.originalEndMillis = -Infinity;
    for (var i = 0; i < this.tasks.length; i++) {
      var task = this.tasks[i];
      if (this.gantt.originalStartMillis > task.start)
        this.gantt.originalStartMillis = task.start;
      if (this.gantt.originalEndMillis < task.end)
        this.gantt.originalEndMillis = task.end;

    }
    this.taskIsChanged(); //enqueue for gantt refresh


    //error -> rollback
  } else {
    ret = false;
    //console.debug("rolling-back transaction");
    //try to restore changed tasks
    var oldTasks = JSON.parse(this.__currentTransaction.snapshot);
    this.deletedTaskIds = oldTasks.deletedTaskIds;
    this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
    this.redraw();

    //compose error message
    var msg = "";
    for (var i = 0; i < this.__currentTransaction.errors.length; i++) {
      var err = this.__currentTransaction.errors[i];
      msg = msg + err.msg + "\n\n";
    }
    alert(msg);
  }
  //reset transaction
  this.__currentTransaction = undefined;

  //[expand]
  this.editor.refreshExpandStatus(this.currentTask);

  return ret;
};

//this function notify an error to a transaction -> transaction will rollback
GanttMaster.prototype.setErrorOnTransaction = function (errorMessage, task) {
  if (this.__currentTransaction) {
    this.__currentTransaction.errors.push({msg:errorMessage, task:task});
  } else {
    console.error(errorMessage);
  }
};

// inhibit undo-redo
GanttMaster.prototype.checkpoint = function () {
  this.__undoStack = [];
  this.__redoStack = [];
};

//----------------------------- UNDO/REDO MANAGEMENT ---------------------------------%>

GanttMaster.prototype.undo = function () {
  //console.debug("undo before:",this.__undoStack,this.__redoStack);
  if (this.__undoStack.length > 0) {
    var his = this.__undoStack.pop();
    this.__redoStack.push(JSON.stringify(this.saveGantt()));
    var oldTasks = JSON.parse(his);
    this.deletedTaskIds = oldTasks.deletedTaskIds;
    this.__inUndoRedo = true; // avoid Undo/Redo stacks reset
    this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
    //console.debug(oldTasks,oldTasks.deletedTaskIds)
    this.redraw();
    //console.debug("undo after:",this.__undoStack,this.__redoStack);
  }
};

GanttMaster.prototype.redo = function () {
  //console.debug("redo before:",undoStack,redoStack);
  if (this.__redoStack.length > 0) {
    var his = this.__redoStack.pop();
    this.__undoStack.push(JSON.stringify(this.saveGantt()));
    var oldTasks = JSON.parse(his);
    this.deletedTaskIds = oldTasks.deletedTaskIds;
    this.__inUndoRedo = true; // avoid Undo/Redo stacks reset
    this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
    this.redraw();
    //console.debug("redo after:",undoStack,redoStack);
  }
};


GanttMaster.prototype.resize = function () {
  //console.debug("GanttMaster.resize")
  this.splitter.resize();
};


GanttMaster.prototype.getCollapsedDescendant = function(){
    var allTasks = this.tasks;
    var collapsedDescendant = [];
    for (var i = 0; i < allTasks.length; i++) {
       var task = allTasks[i];
       if(collapsedDescendant.indexOf(task) >= 0) continue;
       if(task.collapsed) collapsedDescendant = collapsedDescendant.concat(task.getDescendant());
    }
    return collapsedDescendant;
}


/**
 * Compute the critical path using Backflow algorithm.
 * Translated from Java code supplied by M. Jessup here http://stackoverflow.com/questions/2985317/critical-path-method-algorithm
 *
 * For each task computes:
 * earlyStart, earlyFinish, latestStart, latestFinish, criticalCost
 *
 * A task on the critical path has isCritical=true
 * A task not in critical path can float by latestStart-earlyStart days
 *
 * If you use critical path avoid usage of dependencies between different levels of tasks
 *
 * WARNNG: It ignore milestones!!!!
 * @return {*}
 */
GanttMaster.prototype.computeCriticalPath = function () {

  if (!this.tasks)
    return false;

  // do not consider grouping tasks
  var tasks = this.tasks.filter(function (t) {
    //return !t.isParent()
    return (t.getRow()  > 0) && (!t.isParent() || (t.isParent() && !t.isDependent()));
  });

  // reset values
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    t.earlyStart = -1;
    t.earlyFinish = -1;
    t.latestStart = -1;
    t.latestFinish = -1;
    t.criticalCost = -1;
    t.isCritical=false;
  }

  // tasks whose critical cost has been calculated
  var completed = [];
  // tasks whose critical cost needs to be calculated
  var remaining = tasks.concat(); // put all tasks in remaining


  // Backflow algorithm
  // while there are tasks whose critical cost isn't calculated.
  while (remaining.length > 0) {
    var progress = false;

    // find a new task to calculate
    for (var i = 0; i < remaining.length; i++) {
      var task = remaining[i];
      var inferiorTasks = task.getInferiorTasks();

      if (containsAll(completed, inferiorTasks)) {
        // all dependencies calculated, critical cost is max dependency critical cost, plus our cost
        var critical = 0;
        for (var j = 0; j < inferiorTasks.length; j++) {
          var t = inferiorTasks[j];
          if (t.criticalCost > critical) {
            critical = t.criticalCost;
          }
        }
        task.criticalCost = critical + task.duration;
        // set task as calculated an remove
        completed.push(task);
        remaining.splice(i, 1);

        // note we are making progress
        progress = true;
      }
    }
    // If we haven't made any progress then a cycle must exist in
    // the graph and we wont be able to calculate the critical path
    if (!progress) {
      console.error("Cyclic dependency, algorithm stopped!");
      return false;
    }
  }

  // set earlyStart, earlyFinish, latestStart, latestFinish
  computeMaxCost(tasks);
  var initialNodes = initials(tasks);
  calculateEarly(initialNodes);
  calculateCritical(tasks);



/*
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    console.debug("Task ", t.name, t.duration, t.earlyStart, t.earlyFinish, t.latestStart, t.latestFinish, t.latestStart - t.earlyStart, t.earlyStart == t.latestStart)
  }*/

  return tasks;


  function containsAll(set, targets) {
    for (var i = 0; i < targets.length; i++) {
      if (set.indexOf(targets[i]) < 0)
        return false;
    }
    return true;
  }

  function computeMaxCost(tasks) {
    var max = -1;
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];

      if (t.criticalCost > max)
        max = t.criticalCost;
    }
    //console.debug("Critical path length (cost): " + max);
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      t.setLatest(max);
    }
  }

  function initials(tasks) {
    var initials = [];
    for (var i = 0; i < tasks.length; i++) {      
      if (!tasks[i].depends || tasks[i].depends == "")
        initials.push(tasks[i]);
    }
    return initials;
  }

  function calculateEarly(initials) {
    for (var i = 0; i < initials.length; i++) {
      var initial = initials[i];
      initial.earlyStart = 0;
      initial.earlyFinish = initial.duration;
      setEarly(initial);
    }
  }

  function setEarly(initial) {
    var completionTime = initial.earlyFinish;
    var inferiorTasks = initial.getInferiorTasks();
    for (var i = 0; i < inferiorTasks.length; i++) {
      var t = inferiorTasks[i];
      if (completionTime >= t.earlyStart) {
        t.earlyStart = completionTime;
        t.earlyFinish = completionTime + t.duration;
      }
      setEarly(t);
    }
  }

  function calculateCritical(tasks) {
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      t.isCritical=(t.earlyStart == t.latestStart)
    }
  }


};
