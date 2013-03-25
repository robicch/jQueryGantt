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

    var taskRow = $.JST.createFromTemplate(task, "TASKROW", true);
    $(taskRow).addClass(this.master.pageClass);
    this.master.rgrid.append(taskRow);
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
