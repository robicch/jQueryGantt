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
function Task(id, name, code, level, start, duration) {
  this.id = id;
  this.name = name;
  this.code = code;
  this.level = level;
  this.status = "STATUS_UNDEFINED";

  this.start = computeStart(start);  //set at the beginning of the day
  this.duration = duration;
  this.end = computeEndByDuration(this.start, this.duration); // to be computed

  this.startIsMilestone = false;
  this.endIsMilestone = false;


  this.rowElement; //row editor html element
  this.ganttElement; //gantt html element
  this.master;


  this.assigs = [];
}

Task.prototype.clone = function() {
  var ret = {};
  for (var key in this) {
    if (typeof(this[key])!="function")
      ret[key] = this[key];
  }
  return ret;
};

Task.prototype.getAssigsString = function() {
  var ret = "";
  for (var i=0;i<this.assigs.length;i++) {
    var ass = this.assigs[i];
    var res = this.master.getResource(ass.resourceId);
    if (res)
      ret = ret + (ret == "" ? "" : ", ") + res.name;
  }
  return ret;
};

Task.prototype.createAssignment = function(id, resourceId, roleId, effort) {
  var assig = new Assignment(id, resourceId, roleId, effort);
  this.assigs.push(assig);
  return assig;
};


//<%---------- SET PERIOD ---------------------- --%>
Task.prototype.setPeriod = function(start, end) {
  //console.debug("setPeriod ",this.name,new Date(start),new Date(end));
  //var profilerSetPer = new Profiler("gt_setPeriodJS");

  if (start instanceof Date)
    start = start.getTime();
  if (end instanceof Date)
    end = end.getTime();

  var originalPeriod = {start:this.start,end:this.end,duration:this.duration};
  var somethingChanged = false;

  //console.debug("setStart",date,date instanceof Date);
  var wantedStartMillis = start;

  //cannot start after end
  if (start > end)
    start = end;

  //set a legal start
  start = computeStart(start);

  //if depends -> start is set to max end + lag of superior
  var sups = this.getSuperiors();
  if (sups && sups.length > 0) {

    var supEnd = 0;
    for (var i=0;i<sups.length;i++) {
      var link = sups[i];
      supEnd = Math.max(supEnd, incrementDateByWorkingDays(link.from.end, link.lag));
    }
    //if changed by depends move it
    if (computeStart(supEnd) != start) {
      return this.moveTo(supEnd + 1, false);
    }
  }

  //move date to closest day
  var date = new Date(start);

  if (this.start != start || this.start != wantedStartMillis) {
    this.start = start;
    somethingChanged = true;
  }

  //set end
  var wantedEndMillis = end;

  end = computeEnd(end);

  if (this.end != end || this.end != wantedEndMillis) {
    this.end = end;
    somethingChanged = true;
  }

  this.duration = recomputeDuration(this.start, this.end);

  //profilerSetPer.stop();

  var todoOk = true;
  if (somethingChanged) {

    if (this.hasExternalDep) {
      this.master.setErrorOnTransaction(GanttMaster.messages["TASK_HAS_EXTERNAL_DEPS"] + "\n" + this.name, this);
      todoOk = false;
    } else {


      //I'm restricting
      var deltaPeriod = originalPeriod.duration - this.duration;
      var restricting = deltaPeriod > 0;
      var restrictingStart = restricting && (originalPeriod.start < this.start);
      var restrictingEnd = restricting && (originalPeriod.end > this.end);

      //console.debug( " originalPeriod.duration "+ originalPeriod.duration +" deltaPeriod "+deltaPeriod+" "+"restricting "+restricting);

      if (restricting) {
        //loops children to get boundaries
        var children = this.getChildren();
        var bs = Infinity;
        var be = 0;
        for (var i=0;i<children.length;i++) {

          ch = children[i];
          //console.debug("restricting: test child "+ch.name+" "+ch.end)
          if (restrictingEnd) {
            be = Math.max(be, ch.end);
          } else {
            bs = Math.min(bs, ch.start);
          }
        }

        if (restrictingEnd) {
          //console.debug("restricting end ",be, this.end);
          this.end = Math.max(be, this.end);
        } else {
          //console.debug("restricting start");
          this.start = Math.min(bs, this.start);
        }

         this.duration = recomputeDuration(this.start, this.end);
      } else {

        //check global boundaries
        if (this.start < this.master.minEditableDate || this.end > this.master.maxEditableDate) {
          this.master.setErrorOnTransaction(GanttMaster.messages["CHANGE_OUT_OF_SCOPE"], this);
          todoOk = false;
        }

        //console.debug("set period: somethingChanged",this);
        if (todoOk && !updateTree(this)) {
          todoOk = false;
        }
      }
    }

    if (todoOk) {
      //and now propagate to inferiors
      var infs = this.getInferiors();
      if (infs && infs.length > 0) {
        for (var i=0;i<infs.length;i++) {
          var link = infs[i];
          todoOk = link.to.moveTo(end, false); //this is not the right date but moveTo checks start
          if (!todoOk)
            break;
        }
      }
    }
  }
  return todoOk;
};


//<%---------- MOVE TO ---------------------- --%>
Task.prototype.moveTo = function(start, ignoreMilestones) {
  //console.debug("moveTo ",this,start,ignoreMilestones);
  //var profiler = new Profiler("gt_task_moveTo");

  if (start instanceof Date)
    start = start.getTime();

  var originalPeriod = {start:this.start,end:this.end};
  var somethingChanged = false;
  var wantedStartMillis = start;

  //set a legal start
  start = computeStart(start);

  //if start is milestone cannot be move
  if (!ignoreMilestones && this.startIsMilestone && start!=this.start ) {
    //notify error
    this.master.setErrorOnTransaction(GanttMaster.messages["START_IS_MILESTONE"], this);
    return false;
  } else if (this.hasExternalDep){
    //notify error
    this.master.setErrorOnTransaction(GanttMaster.messages["TASK_HAS_EXTERNAL_DEPS"], this);
    return false;
  }

  //if depends start is set to max end + lag of superior
  var sups = this.getSuperiors();
  if (sups && sups.length > 0) {
    var supEnd = 0;
    for (var i=0;i<sups.length;i++) {
      var link = sups[i];
      supEnd = Math.max(supEnd, incrementDateByWorkingDays(link.from.end, link.lag));
    }
    start = supEnd + 1;
  }
  //set a legal start
  start = computeStart(start);

  var end = computeEndByDuration(start, this.duration);

  if (this.start != start || this.start != wantedStartMillis) {
    //in case of end is milestone it never changes, but recompute duration
    if (!ignoreMilestones && this.endIsMilestone) {
      end = this.end;
      this.duration = recomputeDuration(start, end);
    }
    this.start = start;
    this.end = end;
    somethingChanged = true;
  }

  //profiler.stop();

  var todoOk = true;

  if (somethingChanged) {

    //check global boundaries
    if (this.start < this.master.minEditableDate || this.end > this.master.maxEditableDate) {
      this.master.setErrorOnTransaction(GanttMaster.messages["CHANGE_OUT_OF_SCOPE"], this);
      todoOk = false;
    }

    if (todoOk) {
      var panDelta = originalPeriod.start - this.start;
      //console.debug("panDelta",panDelta);
      //loops children to shift them
      var children = this.getChildren();
      for (var i=0;i<children.length;i++) {
        ch = children[i];
        todoOk = ch.moveTo(ch.start - panDelta, false);
        if (!todoOk)
          break;
      }
    }

    //console.debug("set period: somethingChanged",this);
    if (todoOk && !updateTree(this)) {
      todoOk = false;
    }

    if (todoOk) {
      //and now propagate to inferiors
      var infs = this.getInferiors();
      if (infs && infs.length > 0) {
        for (var i=0;i<infs.length;i++) {
          var link = infs[i];
          todoOk = link.to.moveTo(end, false); //this is not the right date but moveTo checks start
          if (!todoOk)
            break;
        }
      }
    }
  }
  return todoOk;
};


function updateTree(task) {
  //console.debug("updateTree ",task);
  var error;
  var todoOk = true;

  //try to enlarge parent
  var p = task.getParent();
  if (p) {
    var newStart = p.start;
    var newEnd = p.end;

    if (p.start > task.start) {
      if (p.startIsMilestone) {
        task.master.setErrorOnTransaction(GanttMaster.messages["START_IS_MILESTONE"] + "\n" + p.name, task);
        todoOk = false;
      } else if (p.depends) {
        task.master.setErrorOnTransaction(GanttMaster.messages["TASK_HAS_CONSTRAINTS"] + "\n" + p.name, task);
        todoOk = false;
      } else {
        newStart = task.start;
      }
    }
    if (p.end < task.end) {
      if (!p.endIsMilestone) {
        newEnd = task.end;
      } else {
        task.master.setErrorOnTransaction(GanttMaster.messages["END_IS_MILESTONE"] + "\n" + p.name, task);
        todoOk = false;
      }
    }

    if (todoOk) {
      //propagate updates if needed
      if (newStart != p.start || newEnd != p.end) {
        //has external deps ?
        if (p.hasExternalDep) {
          task.master.setErrorOnTransaction(GanttMaster.messages["TASK_HAS_EXTERNAL_DEPS"] + "\n" + p.name, task);
          todoOk = false;
        } else {
          todoOk = p.setPeriod(newStart, newEnd);
        }
      }
    }
  }
  return todoOk;
}


//<%---------- CHANGE STATUS ---------------------- --%>
Task.prototype.changeStatus = function(newStatus) {
  //console.debug("changeStatus: "+this.name+" from "+this.status+" -> "+newStatus);
  //compute descendant for identify a cone where status changes propagate
  var cone = this.getDescendant();

  function propagateStatus(task, newStatus, manuallyChanged, propagateFromParent, propagateFromChildren) {
    var todoOk = true;
    var oldStatus = task.status;

    if(newStatus == oldStatus){
      return true;
    }
    //console.debug("propagateStatus: "+task.name + " from " + task.status + " to " + newStatus + " " + (manuallyChanged?" a manella":"")+(propagateFromParent?" da parent":"")+(propagateFromChildren?" da children":""));

    task.status = newStatus;

    //xxxx -> STATUS_DONE            may activate dependent tasks, both suspended and undefined. Will set to done all descendants.
    //STATUS_FAILED -> STATUS_DONE          do nothing if not forced by hand
    if (newStatus == "STATUS_DONE") {

      if ((manuallyChanged || oldStatus != "STATUS_FAILED")) { //cannot change for cascade when failed

        //can be closed only if superiors are already done
        var sups = task.getSuperiors();
        for (var i=0;i<sups.length;i++) {
          if (cone.indexOf(sups[i].from) < 0) {
            if (sups[i].from.status != "STATUS_DONE") {
              if (manuallyChanged || propagateFromParent)
                task.master.setErrorOnTransaction(GanttMaster.messages["GANTT_ERROR_DEPENDS_ON_OPEN_TASK"] + "\n" + sups[i].from.name + " -> " + task.name);
              todoOk = false;
              break;
            }
          }
        }

        if (todoOk) {
          //todo set progress to 100% if set on config

          var chds = task.getChildren();
          //set children as done
          for (var i=0;i<chds.length;i++)
            propagateStatus(chds[i], "STATUS_DONE", false,true,false);

          //set inferiors as active if outside the cone
          var infs = task.getInferiors();
          //set children as done
          for (var i=0;i<infs.length;i++) {
            if (cone.indexOf(infs[i].to) < 0)
              //infs[i].to.changeStatus("STATUS_ACTIVE");
              propagateStatus(infs[i].to, "STATUS_ACTIVE", false,false,false);
          }
        }
      } else {
        todoOk = false;
      }


      //  STATUS_UNDEFINED -> STATUS_ACTIVE       all children become active, if they have no dependencies.
      //  STATUS_SUSPENDED -> STATUS_ACTIVE       sets to active all children and their descendants that have no inhibiting dependencies.
      //  STATUS_DONE -> STATUS_ACTIVE            all those that have dependencies must be set to suspended.
      //  STATUS_FAILED -> STATUS_ACTIVE          nothing happens: child statuses must be reset by hand.
    } else if (newStatus == "STATUS_ACTIVE") {

      if ((manuallyChanged || oldStatus != "STATUS_FAILED")) { //cannot change for cascade when failed

        //activate parent if closed
        var par=task.getParent();
        if (par && par.status != "STATUS_ACTIVE") {
          todoOk=propagateStatus(par,"STATUS_ACTIVE",false,false,true);
        }

        if(todoOk){
          //can be active only if superiors are already done
          var sups = task.getSuperiors();
          for (var i=0;i<sups.length;i++) {
            if (sups[i].from.status != "STATUS_DONE") {
              if (manuallyChanged || propagateFromChildren)
              task.master.setErrorOnTransaction(GanttMaster.messages["GANTT_ERROR_DEPENDS_ON_OPEN_TASK"] + "\n" + sups[i].from.name + " -> " + task.name);
              todoOk = false;
              break;
            }
          }
        }

        if (todoOk) {
          var chds = task.getChildren();
          if (oldStatus == "STATUS_UNDEFINED" || oldStatus == "STATUS_SUSPENDED") {
            //set children as active
            for (var i=0;i<chds.length;i++)
              if (chds[i].status != "STATUS_DONE" )
                propagateStatus(chds[i], "STATUS_ACTIVE", false,true,false);
          }

          //set inferiors as suspended
          var infs = task.getInferiors();
          for (var i=0;i<infs.length;i++)
            propagateStatus(infs[i].to, "STATUS_SUSPENDED", false,false,false);
        }
      } else {
        todoOk = false;
      }

      // xxxx -> STATUS_SUSPENDED       all active children and their active descendants become suspended. when not failed or forced
      // xxxx -> STATUS_UNDEFINED       all active children and their active descendants become suspended. when not failed or forced
    } else if (newStatus == "STATUS_SUSPENDED" || newStatus == "STATUS_UNDEFINED") {
      if (manuallyChanged || oldStatus != "STATUS_FAILED") { //cannot change for cascade when failed

        //suspend parent if not active
        var par=task.getParent();
        if (par && par.status != "STATUS_ACTIVE") {
          todoOk=propagateStatus(par,newStatus,false,false,true);
        }


        var chds = task.getChildren();
        //set children as active
        for (var i=0;i<chds.length;i++){
          if (chds[i].status != "STATUS_DONE")
            propagateStatus(chds[i], newStatus, false,true,false);
        }

        //set inferiors as STATUS_SUSPENDED or STATUS_UNDEFINED
        var infs = task.getInferiors();
        //set children as done
        for (var i=0;i<infs.length;i++)
          if (cone.indexOf(infs[i].to) < 0)
            propagateStatus(infs[i].to, newStatus, false,false,false);
      } else {
        todoOk = false;
      }

      // xxxx -> STATUS_FAILED children and dependent failed
    } else if (newStatus == "STATUS_FAILED") {
      var chds = task.getChildren();
      //set children as failed
      for (var i=0;i<chds.length;i++)
        propagateStatus(chds[i], "STATUS_FAILED", false,true,false);

      //set inferiors as active
      var infs = task.getInferiors();
      //set children as done
      for (var i=0;i<infs.length;i++)
        if (cone.indexOf(infs[i].to) < 0)
          propagateStatus(infs[i].to, "STATUS_FAILED", false,false,false);
    }
    if (!todoOk){
      task.status = oldStatus;
      //console.debug("status rolled back: "+task.name + " to " + oldStatus);
    }

    return todoOk;
  }


  var todoOk = true;
  var oldStatus = this.status;

  todoOk = propagateStatus(this, newStatus, true,false,false);

  if (!todoOk)
    this.status = oldStatus;

  return todoOk;
};

Task.prototype.synchronizeStatus=function(){
  var oldS=this.status;
  this.status="";
  return this.changeStatus(oldS);
};

Task.prototype.isLocallyBlockedByDependencies=function(){
  var sups = this.getSuperiors();
  var blocked=false;
  for (var i=0;i<sups.length;i++) {
    if (sups[i].from.status != "STATUS_DONE") {
      blocked=true;
      break;
    }
  }
  return blocked;
};

//<%---------- TASK STRUCTURE ---------------------- --%>
Task.prototype.getRow = function() {
  ret = -1;
  if (this.master)
    ret = this.master.tasks.indexOf(this);
  return ret;
};


Task.prototype.getParents = function() {
  var ret;
  if (this.master) {
    var topLevel = this.level;
    var pos = this.getRow();
    ret = [];
    for (var i = pos; i >= 0; i--) {
      var par = this.master.tasks[i];
      if (topLevel > par.level) {
        topLevel = par.level;
        ret.push(par);
      }
    }
  }
  return ret;
};


Task.prototype.getParent = function() {
  var ret;
  if (this.master) {
    for (var i = this.getRow(); i >= 0; i--) {
      var par = this.master.tasks[i];
      if (this.level > par.level) {
        ret = par;
        break;
      }
    }
  }
  return ret;
};


Task.prototype.isParent = function() {
  var ret = false;
  if (this.master) {
    var pos = this.getRow();
    if (pos < this.master.tasks.length - 1)
      ret = this.master.tasks[pos + 1].level > this.level;
  }
  return ret;
};


Task.prototype.getChildren = function() {
  var ret = [];
  if (this.master) {
    var pos = this.getRow();
    for (var i = pos + 1; i < this.master.tasks.length; i++) {
      var ch = this.master.tasks[i];
      if (ch.level == this.level + 1)
        ret.push(ch);
      else if (ch.level <= this.level) // exit loop if parent or brother
        break;
    }
  }
  return ret;
};


Task.prototype.getDescendant = function() {
  var ret = [];
  if (this.master) {
    var pos = this.getRow();
    for (var i = pos + 1; i < this.master.tasks.length; i++) {
      var ch = this.master.tasks[i];
      if (ch.level > this.level)
        ret.push(ch);
      else
        break;
    }
  }
  return ret;
};


Task.prototype.getSuperiors = function() {
  var ret = [];
  var task = this;
  if (this.master) {
    ret = this.master.links.filter(function(link) {
      return link.to == task;
    });
  }
  return ret;
};


Task.prototype.getInferiors = function() {
  var ret = [];
  var task = this;
  if (this.master) {
    ret = this.master.links.filter(function(link) {
      return link.from == task;
    });
  }
  return ret;
};


Task.prototype.deleteTask = function() {
  //delete both dom elements
  this.rowElement.remove();
  this.ganttElement.remove();

  //remove children
  var chd = this.getChildren();
  for (var i=0;i<chd.length;i++) {
    //add removed child in list
    if(!chd[i].isNew())
      this.master.deletedTaskIds.push(chd[i].id);
    chd[i].deleteTask();
  }

  if(!this.isNew())
    this.master.deletedTaskIds.push(this.id);


  //remove from in-memory collection
  this.master.tasks.splice(this.getRow(), 1);

  //remove from links
  var task = this;
  this.master.links = this.master.links.filter(function(link) {
    return link.from != task && link.to != task;
  });
};


Task.prototype.isNew=function(){
  return (this.id+"").indexOf("tmp_")==0;
};

//<%------------------------------------------  INDENT/OUTDENT --------------------------------%>
Task.prototype.indent = function() {
  //console.debug("indent", this);
  var ret = false;
  //a row above must exist
  var row = this.getRow();
  if (row > 0) {
    var taskAbove = this.master.tasks[row - 1];
    var newLev = this.level + 1;
    if (newLev <= taskAbove.level + 1) {
      ret = true;
      //trick to get parents after indent
      this.level++;
      var futureParents = this.getParents();
      this.level--;
      var oldLevel = this.level;
      for (var i = row; i < this.master.tasks.length; i++) {
        var desc = this.master.tasks[i];
        if (desc.level > oldLevel || desc == this) {
          desc.level++;
          //remove links from descendant to my parents
          this.master.links = this.master.links.filter(function(link) {
            var linkToParent = false;
            if (link.to == desc)
              linkToParent = futureParents.indexOf(link.from) >= 0;
            else if (link.from == desc)
              linkToParent = futureParents.indexOf(link.to) >= 0;
            return !linkToParent;
          });
        } else
          break;
      }
      //recompute depends string
      this.master.updateDependsStrings();
      //enlarge parent using a fake set period
      this.setPeriod(this.start + 1, this.end + 1);

      //force status check
      this.synchronizeStatus();
    }
  }
  return ret;
};


Task.prototype.outdent = function() {
  //console.debug("outdent", this);
  var ret = false;
  //a level must be >1 -> cannot escape from root
  var oldLevel = this.level;
  if (this.level > 1) {
    ret = true;
    var row = this.getRow();
    for (var i = row; i < this.master.tasks.length; i++) {
      var desc = this.master.tasks[i];
      if (desc.level > oldLevel || desc == this) {
        desc.level--;
      } else
        break;
    }

    var task = this;
    var chds = this.getChildren();
    //remove links from me to my new children
    this.master.links = this.master.links.filter(function(link) {
      var linkExist = (link.to == task && chds.indexOf(link.from) >= 0 || link.from == task && chds.indexOf(link.to) >= 0);
      return !linkExist;
    });


    //enlarge me if inherited children are larger
    for (var i=0;i<chds.length;i++) {
      //remove links from me to my new children
      chds[i].setPeriod(chds[i].start + 1, chds[i].end + 1);
    }

    //enlarge parent using a fake set period
    this.setPeriod(this.start + 1, this.end + 1);

    //force status check
    this.synchronizeStatus();
  }
  return ret;
};


//<%------------------------------------------  MOVE UP / MOVE DOWN --------------------------------%>
Task.prototype.moveUp = function() {
  //console.debug("moveUp", this);
  var ret = false;

  //a row above must exist
  var row = this.getRow();
  if (row > 0) {

    //find new row
    var newRow;
    for (newRow = row - 1; newRow >= 0; newRow--) {
      if (this.master.tasks[newRow].level <= this.level)
        break;
    }

    //is a parent or a brother
    if (this.master.tasks[newRow].level == this.level) {
      ret = true;
      //compute descendant
      var descNumber = 0;
      for (var i = row + 1; i < this.master.tasks.length; i++) {
        var desc = this.master.tasks[i];
        if (desc.level > this.level) {
          descNumber++;
        } else {
          break;
        }
      }
      //move in memory
      var blockToMove = this.master.tasks.splice(row, descNumber + 1);
      var top = this.master.tasks.splice(0, newRow);
      this.master.tasks = [].concat(top, blockToMove, this.master.tasks);
      //move on dom
      var rows = this.master.editor.element.find("tr[taskId]");
      var domBlockToMove = rows.slice(row, row + descNumber + 1);
      rows.eq(newRow).before(domBlockToMove);

      //recompute depends string
      this.master.updateDependsStrings();
    } else {
      this.master.setErrorOnTransaction(GanttMaster.messages["TASK_MOVE_INCONSISTENT_LEVEL"], this);
      ret = false;
    }
  }
  return ret;
};


Task.prototype.moveDown = function() {
  //console.debug("moveDown", this);
  var ret = false;

  //a row above must exist
  var row = this.getRow();
  if (row < this.master.tasks.length - 1) {

    //find nearest brother
    var newRow;
    for (newRow = row + 1; newRow < this.master.tasks.length; newRow++) {
      if (this.master.tasks[newRow].level <= this.level)
        break;
    }

    //is brother
    if (this.master.tasks[newRow].level == this.level) {
      ret = true;
      //find last desc
      for (newRow = newRow + 1; newRow < this.master.tasks.length; newRow++) {
        if (this.master.tasks[newRow].level <= this.level)
          break;
      }

      //compute descendant
      var descNumber = 0;
      for (var i = row + 1; i < this.master.tasks.length; i++) {
        var desc = this.master.tasks[i];
        if (desc.level > this.level) {
          descNumber++;
        } else {
          break;
        }
      }

      //move in memory
      var blockToMove = this.master.tasks.splice(row, descNumber + 1);
      var top = this.master.tasks.splice(0, newRow - descNumber - 1);
      this.master.tasks = [].concat(top, blockToMove, this.master.tasks);


      //move on dom
      var rows = this.master.editor.element.find("tr[taskId]");
      var aft = rows.eq(newRow - 1);
      var domBlockToMove = rows.slice(row, row + descNumber + 1);
      aft.after(domBlockToMove);

      //recompute depends string
      this.master.updateDependsStrings();
    }
  }
  return ret;
};


//<%------------------------------------------------------------------------  LINKS OBJECT ---------------------------------------------------------------%>
function Link(taskFrom, taskTo, lagInWorkingDays) {
  this.from = taskFrom;
  this.to = taskTo;
  this.lag = lagInWorkingDays;
}


//<%------------------------------------------------------------------------  ASSIGNMENT ---------------------------------------------------------------%>
function Assignment(id, resourceId, roleId, effort) {
  this.id = id;
  this.resourceId = resourceId;
  this.roleId = roleId;
  this.effort = effort;
}


//<%------------------------------------------------------------------------  RESOURCE ---------------------------------------------------------------%>
function Resource(id, name) {
  this.id = id;
  this.name = name;
}


//<%------------------------------------------------------------------------  ROLE ---------------------------------------------------------------%>
function Role(id, name) {
  this.id = id;
  this.name = name;
}




