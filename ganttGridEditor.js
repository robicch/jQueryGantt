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
function GridEditor(master, renderInfo) {
    this.master = master; // is the a GantEditor instance
    var gridEditor = $.JST.createFromTemplate({}, "TASKSEDITHEAD");
    gridEditor.gridify();
    this.element = gridEditor;
    this.renderInfo = renderInfo;
}

GridEditor.prototype.fillEmptyLines = function() {
    // console.debug("GridEditor.fillEmptyLines");
    var rowsToAdd = 28 - this.element.find(".siebui-taskEditRow").size();
    if (rowsToAdd > 0) {
        var taskInfo = "";
        // fill with empty lines
        for ( var i = 0; i < rowsToAdd; i++) {
            var emptyRow = $.JST.createFromTemplate({}, "TASKEMPTYROW");
            // click on empty row create a task and fill above
            var master = this.master;
            this.element.append(emptyRow);
            var taskRow = $.JST.createFromTemplate(taskInfo, "TASKUTILITYROW");
            this.master.utility.append(taskRow);
        }
    }
};

GridEditor.prototype.addTask = function(task, row, prevId) {

    var imgfolder = "../images/";
    var iconInfo    = this.renderInfo;
    this.element.find("[taskId=" + task + "]").remove();
    var taskInfo = this.master.getResInfo(task);
    var taskRow = $.JST.createFromTemplate(taskInfo, "TASKROW");
    var nCalCount = this.master.getNoOfColumns(task);
    for ( var nC = 0; nC < nCalCount; ++nC)
    {
        var template = "TASKCELL";
        template = (nC === 0) ? "TASKHIECELL" : "TASKCELL";
        var cellinfo = this.master.getResColumnInfo(task, nC);
        var taskCELL = $.JST.createFromTemplate(cellinfo,template);
        
        if (cellinfo["Icon"])
        {
            var iarray = cellinfo["Icon"].split(',');
            var iarrlength = iarray.length;
            for (var nicon= 0 ;nicon < iarray.length; nicon++)
            {
                var span = $("<span>");
                if (iconInfo && iconInfo[iarray[nicon]])
                {
                    var cssclass = iconInfo[iarray[nicon]];
                    var image = $("<img>");
                        image.attr('src', imgfolder+'spacer.gif');
                        image.addClass(cssclass);
                        span.append(image);
                        taskCELL.append(span);
                }
            }
           if (template == "TASKHIECELL")
           {
                var pad = (3 - iarray.length) * 15;
                taskCELL.attr('style', "padding-left:" +pad +"px;");
            }
        }
        taskRow.append(taskCELL);

    }

    var utilnewRow = $.JST.createFromTemplate(taskInfo,"TASKUTILITYROW");

    // save row element on task
    task.rowElement = taskRow;


    var PID = taskInfo.PID;

    var resRow = this.element.find("[id=" + PID + "]");
    if (resRow.length > 0)
    {
        var prerow;
        var utilRow;
        if(prevId)
        {
            prerow = this.element.find("[id=" + prevId + "]");
        }
        if(prerow)
        {
            prerow.after(taskRow);
            utilRow = this.master.utility.find("[id=" + prevId + "]");
            utilRow.after(utilnewRow);
        }
        else
        {
            resRow.after(taskRow);
            utilRow = this.master.utility.find("[id=" + PID + "]");
            utilRow.after(utilnewRow);
        }
    }
    else if (typeof (row) != "number")
    {
        var emptyRow = this.element.find(".emptyRow:first");
        if (emptyRow.size() > 0)
        {
            emptyRow.replaceWith(taskRow);
        }
        else
        {
            this.element.append(taskRow);
        }
    }
    else
    {
        var tr = this.element.find("tr.siebui-taskEditRow").eq(row);
        if (tr.size() > 0) {
            tr.before(taskRow);
        } else {
            this.element.append(taskRow);
        }

    }
    this.element.find(".taskRowIndex").each(function(i, el) {
        $(el).html(i + 1);
    });
    return taskRow;
};
GridEditor.prototype.removeTask = function(task, row) {
    this.element.find("[id=" + task + "]").remove();
    this.master.utility.find("[id=" + task + "]").remove();
};

GridEditor.prototype.redraw = function() {
    for ( var i = 0; i < this.master.tasks.length; i++)
    {
        this.refreshTaskRow(this.master.tasks[i]);
    }
};

GridEditor.prototype.reset = function() {
    this.element.find("[taskId]").remove();
};
