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
function GridEditor(master) {
  this.master = master; // is the a GantEditor instance
  var gridEditor = $.JST.createFromTemplate({}, "TASKSEDITHEAD");
  gridEditor.gridify();
  this.element = gridEditor;
}


GridEditor.prototype.fillEmptyLines = function() {
  var factory = new TaskFactory();

  //console.debug("GridEditor.fillEmptyLines");
  var rowsToAdd = 30 - this.element.find(".taskEditRow").size();

  //fill with empty lines
  for (var i = 0; i < rowsToAdd; i++) {
    var emptyRow = $.JST.createFromTemplate({}, "TASKEMPTYROW");
    //click on empty row create a task and fill above
    var master = this.master;
    emptyRow.click(function(ev) {
      master.beginTransaction();
      var emptyRow = $(this);
      var lastTask;
      var start = new Date().getTime();
      var level = 0;
      if (master.tasks[0]) {
        start = master.tasks[0].start;
        level = master.tasks[0].level + 1;
      }

      //fill all empty previouses
      emptyRow.prevAll(".emptyRow").andSelf().each(function() {
        var ch = factory.build("tmp_fk" + new Date().getTime(), "", "", level, start, 1);
        var task = master.addTask(ch);
        lastTask = ch;
      });
      master.endTransaction();
      lastTask.rowElement.click();
      lastTask.rowElement.find("[name=name]").focus()//focus to "name" input
              .blur(function() { //if name not inserted -> undo -> remove just added lines
        var imp = $(this);
        if (!imp.isValueChanged())
          master.undo();
      });
    });
    this.element.append(emptyRow);
  }
};


GridEditor.prototype.addTask = function(task, row) {
  //console.debug("GridEditor.addTask",task,row);
  //var prof = new Profiler("editorAddTaskHtml");

  //remove extisting row
  this.element.find("[taskId=" + task.id + "]").remove();

  var taskRow = $.JST.createFromTemplate(task, "TASKROW");
  //save row element on task
  task.rowElement = taskRow;

  this.bindRowEvents(task, taskRow);

  if (typeof(row) != "number") {
    var emptyRow = this.element.find(".emptyRow:first"); //tries to fill an empty row
    if (emptyRow.size() > 0)
      emptyRow.replaceWith(taskRow);
    else
      this.element.append(taskRow);
  } else {
    var tr = this.element.find("tr.taskEditRow").eq(row);
    if (tr.size() > 0) {
      tr.before(taskRow);
    } else {
      this.element.append(taskRow);
    }

  }
  this.element.find(".taskRowIndex").each(function(i, el) {
    $(el).html(i + 1);
  });
  //prof.stop();

  return taskRow;
};


GridEditor.prototype.refreshTaskRow = function(task) {
  //console.debug("refreshTaskRow")
  //var profiler = new Profiler("editorRefreshTaskRow");
  var row = task.rowElement;

  row.find(".taskRowIndex").html(task.getRow() + 1);
  row.find(".indentCell").css("padding-left", task.level * 10);
  row.find("[name=name]").val(task.name);
  row.find("[name=code]").val(task.code);
  row.find("[status]").attr("status", task.status);

  row.find("[name=duration]").val(task.duration);
  row.find("[name=start]").val(new Date(task.start).format()).updateOldValue(); // called on dates only because for other field is called on focus event
  row.find("[name=end]").val(new Date(task.end).format()).updateOldValue();
  row.find("[name=depends]").val(task.depends);
  row.find(".taskAssigs").html(task.getAssigsString());

  //profiler.stop();
};

GridEditor.prototype.redraw = function() {
  for (var i = 0; i < this.master.tasks.length; i++) {
    this.refreshTaskRow(this.master.tasks[i]);
  }
};

GridEditor.prototype.reset = function() {
  this.element.find("[taskId]").remove();
};


GridEditor.prototype.bindRowEvents = function (task, taskRow) {
  var self = this;
  //console.debug("bindRowEvents",this,this.master,this.master.canWrite);
  if (this.master.canWrite) {
    self.bindRowInputEvents(task,taskRow);

  } else { //cannot write: disable input
    taskRow.find("input").attr("readonly", true);
  }

  taskRow.find(".edit").click(function() {self.openFullEditor(task,taskRow)});

};


GridEditor.prototype.bindRowInputEvents = function (task, taskRow) {
  var self = this;

  //bind dateField on dates
  taskRow.find(".date").each(function () {
    var el = $(this);

    el.click(function () {
      var inp = $(this);
      inp.dateField({
        inputField:el
      });
    });

    el.blur(function (date) {
      var inp = $(this);
      if (inp.isValueChanged()) {
        if (!Date.isValid(inp.val())) {
          alert(GanttMaster.messages["INVALID_DATE_FORMAT"]);
          inp.val(inp.getOldValue());

        } else {
          var date = Date.parseString(inp.val());
          var row = inp.closest("tr");
          var taskId = row.attr("taskId");
          var task = self.master.getTask(taskId);
          var lstart = task.start;
          var lend = task.end;

          if (inp.attr("name") == "start") {
            lstart = date.getTime();
            if (lstart >= lend) {
              var end_as_date = new Date(lstart);
              lend = end_as_date.add('d', task.duration).getTime();
            }

            //update task from editor
            self.master.beginTransaction();
            self.master.moveTask(task, lstart);
            self.master.endTransaction();

          } else {
            var end_as_date = new Date(date.getTime());
            lend = end_as_date.getTime();
            if (lstart >= lend) {
              end_as_date.add('d', -1 * task.duration);
              lstart = end_as_date.getTime();
            }

            //update task from editor
            self.master.beginTransaction();
            self.master.changeTaskDates(task, lstart, lend);
            self.master.endTransaction();
          }


          inp.updateOldValue(); //in order to avoid multiple call if nothing changed
        }
      }
    });
  });


  //binding on blur for task update (date exluded as click on calendar blur and then focus, so will always return false, its called refreshing the task row)
  taskRow.find("input:not(.date)").focus(function () {
    $(this).updateOldValue();

  }).blur(function () {
    var el = $(this);
    if (el.isValueChanged()) {
      var row = el.closest("tr");
      var taskId = row.attr("taskId");

      var task = self.master.getTask(taskId);

      //update task from editor
      var field = el.attr("name");

      self.master.beginTransaction();

      if (field == "depends") {

        var oldDeps = task.depends;
        task.depends = el.val();
        // update links
        var linkOK = self.master.updateLinks(task);
        if (linkOK) {
          //synchronize status fro superiors states
          var sups = task.getSuperiors();
          for (var i = 0; i < sups.length; i++) {
            if (!sups[i].from.synchronizeStatus())
              break;
          }

          self.master.changeTaskDates(task, task.start, task.end);
        }

      } else if (field == "duration") {
        var dur = task.duration;
        dur = parseInt(el.val()) || 1;
        el.val(dur);
        var newEnd = computeEndByDuration(task.start, dur);
        self.master.changeTaskDates(task, task.start, newEnd);

      } else {
        task[field] = el.val();
      }
      self.master.endTransaction();
    }
  });


  //change status
  taskRow.find(".taskStatus").click(function () {
    var el = $(this);
    var tr = el.closest("[taskId]");
    var taskId = tr.attr("taskId");
    var task = self.master.getTask(taskId);

    var changer = $.JST.createFromTemplate({}, "CHANGE_STATUS");
    changer.css("top", tr.position().top + self.element.parent().scrollTop());
    changer.find("[status=" + task.status + "]").addClass("selected");
    changer.find(".taskStatus").click(function () {
      self.master.beginTransaction();
      task.changeStatus($(this).attr("status"));
      self.master.endTransaction();
      el.attr("status", task.status);
      changer.remove();
      el.show();

    });
    el.hide().oneTime(3000, "hideChanger", function () {
      changer.remove();
      $(this).show();
    });
    el.after(changer);
  });


  /*//expand collapse todo to be completed
   taskRow.find(".expcoll").click(function(){
   //expand?
   var el=$(this);
   var taskId=el.closest("[taskId]").attr("taskId");
   var task=self.master.getTask(taskId);
   var descs=task.getDescendant();
   if (el.is(".exp")){
   for (var i=0;i<descs.length;i++)
   descs[i].rowElement.show();
   } else {
   for (var i=0;i<descs.length;i++)
   descs[i].rowElement.hide();
   }

   });*/

  //bind row selection
  taskRow.click(function () {
    var row = $(this);
    //var isSel = row.hasClass("rowSelected");
    row.closest("table").find(".rowSelected").removeClass("rowSelected");
    row.addClass("rowSelected");

    //set current task
    self.master.currentTask = self.master.getTask(row.attr("taskId"));

    //move highlighter
    if (self.master.currentTask.ganttElement)
      self.master.gantt.highlightBar.css("top", self.master.currentTask.ganttElement.position().top);

    //if offscreen scroll to element
    var top = row.position().top;
    if (row.position().top > self.element.parent().height()) {
      self.master.gantt.element.parent().scrollTop(row.position().top - self.element.parent().height() + 100);
    }
  });

};



GridEditor.prototype.openFullEditor = function (task, taskRow) {

  var self=this;

  //task editor in popup
  var taskId = taskRow.attr("taskId");
  //console.debug(task);

  //make task editor
  var taskEditor = $.JST.createFromTemplate({}, "TASK_EDITOR");

  taskEditor.find("#name").val(task.name);
  taskEditor.find("#description").val(task.description);
  taskEditor.find("#code").val(task.code);
  taskEditor.find("#progress").val(task.progress ? parseFloat(task.progress) : 0);
  taskEditor.find("#status").attr("status", task.status);

  if (task.startIsMilestone)
    taskEditor.find("#startIsMilestone").attr("checked", true);
  if (task.endIsMilestone)
    taskEditor.find("#endIsMilestone").attr("checked", true);

  taskEditor.find("#duration").val(task.duration);
  taskEditor.find("#start").val(new Date(task.start).format());
  taskEditor.find("#end").val(new Date(task.end).format());

  //taskEditor.find("[name=depends]").val(task.depends);

  //make assignments table
  var assigsTable = taskEditor.find("#assigsTable");
  assigsTable.find("[assigId]").remove();
  // loop on already assigned resources
  for (var i = 0; i < task.assigs.length; i++) {
    var assig = task.assigs[i];
    var assigRow = $.JST.createFromTemplate({task:task, assig:assig}, "ASSIGNMENT_ROW");
    assigsTable.append(assigRow);
  }

  if (!self.master.canWrite) {
    taskEditor.find("input,textarea").attr("readOnly", true);
    taskEditor.find("input:checkbox,select").attr("disabled", true);
  } else {

    //bind dateField on dates
    taskEditor.find("#start").click(function () {
      $(this).dateField({
        inputField:$(this),
        callback:  function (date) {
          var dur = parseInt(taskEditor.find("#duration").val());
          date.clearTime();
          taskEditor.find("#end").val(new Date(computeEndByDuration(date.getTime(), dur)).format());
        }
      });
    });

    //bind dateField on dates
    taskEditor.find("#end").click(function () {
      $(this).dateField({
        inputField:$(this),
        callback:  function (end) {
          var start = Date.parseString(taskEditor.find("#start").val());
          end.setHours(23, 59, 59, 999);

          if (end.getTime() < start.getTime()) {
            var dur = parseInt(taskEditor.find("#duration").val());
            start = incrementDateByWorkingDays(end.getTime(), -dur);
            taskEditor.find("#start").val(new Date(computeStart(start)).format());
          } else {
            taskEditor.find("#duration").val(recomputeDuration(start.getTime(), end.getTime()));
          }
        }
      });
    });

    //bind blur on duration
    taskEditor.find("#duration").change(function () {
      var start = Date.parseString(taskEditor.find("#start").val());
      var el = $(this);
      var dur = parseInt(el.val());
      dur = dur <= 0 ? 1 : dur;
      el.val(dur);
      taskEditor.find("#end").val(new Date(computeEndByDuration(start.getTime(), dur)).format());
    });

    //bind add assignment
    taskEditor.find("#addAssig").click(function () {
      var assigsTable = taskEditor.find("#assigsTable");
      var assigRow = $.JST.createFromTemplate({task:task, assig:{id:"tmp_" + new Date().getTime()}}, "ASSIGNMENT_ROW");
      assigsTable.append(assigRow);
    });

    taskEditor.find("#status").click(function () {
      var tskStatusChooser = $(this);
      var changer = $.JST.createFromTemplate({}, "CHANGE_STATUS");
      changer.css("top", tskStatusChooser.position().top);
      changer.find("[status=" + task.status + "]").addClass("selected");
      changer.find(".taskStatus").click(function () {
        tskStatusChooser.attr("status", $(this).attr("status"));
        changer.remove();
        tskStatusChooser.show();
      });
      tskStatusChooser.hide().oneTime(3000, "hideChanger", function () {
        changer.remove();
        $(this).show();
      });
      tskStatusChooser.after(changer);
    });

    //save task
    taskEditor.find("#saveButton").click(function () {
      var task = self.master.getTask(taskId); // get task again because in case of rollback old task is lost

      self.master.beginTransaction();
      task.name = taskEditor.find("#name").val();
      task.description = taskEditor.find("#description").val();
      task.code = taskEditor.find("#code").val();
      task.progress = parseFloat(taskEditor.find("#progress").val());
      task.duration = parseInt(taskEditor.find("#duration").val());
      task.startIsMilestone = taskEditor.find("#startIsMilestone").is(":checked");
      task.endIsMilestone = taskEditor.find("#endIsMilestone").is(":checked");

      //set assignments
      taskEditor.find("tr[assigId]").each(function () {
        var trAss = $(this);
        var assId = trAss.attr("assigId");
        var resId = trAss.find("[name=resourceId]").val();
        var roleId = trAss.find("[name=roleId]").val();
        var effort = millisFromString(trAss.find("[name=effort]").val());


        //check if an existing assig has been deleted and re-created with the same values
        var found = false;
        for (var i = 0; i < task.assigs.length; i++) {
          var ass = task.assigs[i];

          if (assId == ass.id) {
            ass.effort = effort;
            ass.roleId = roleId;
            ass.resourceId = resId;
            ass.touched = true;
            found = true;
            break;

          } else if (roleId == ass.roleId && resId == ass.resourceId) {
            ass.effort = effort;
            ass.touched = true;
            found = true;
            break;

          }
        }

        if (!found) { //insert
          var ass = task.createAssignment("tmp_" + new Date().getTime(), resId, roleId, effort);
          ass.touched = true;
        }

      });

      //remove untouched assigs
      task.assigs = task.assigs.filter(function (ass) {
        var ret = ass.touched;
        delete ass.touched;
        return ret;
      });

      //change dates
      task.setPeriod(Date.parseString(taskEditor.find("#start").val()).getTime(), Date.parseString(taskEditor.find("#end").val()).getTime() + (3600000 * 24));

      //change status
      task.changeStatus(taskEditor.find("#status").attr("status"));

      if (self.master.endTransaction()) {
        $("#__blackpopup__").trigger("close");
      }

    });
  }

  var ndo = createBlackPage(800, 500).append(taskEditor);

};
