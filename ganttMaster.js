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
 */
function GanttMaster(templateFunctions = []) {
	this.templateFunctions = templateFunctions;
	this.tasks = [];
	this.deletedTaskIds = [];
	this.links = [];

	this.editor; //element for editor
	this.gantt; //element for gantt
	this.splitter; //element for splitter

	this.isMultiRoot = false; // set to true in case of tasklist

	this.workSpace;  // the original element used for containing everything
	this.element; // editor and gantt box without buttons


	this.resources; //list of resources
	this.roles;  //list of roles

	this.minEditableDate = 0;
	this.maxEditableDate = Infinity;
	this.set100OnClose = false;
	this.shrinkParent = false;

	this.fillWithEmptyLines = true; //when is used by widget it could be usefull to do not fill with empty lines

	this.rowHeight = 30; // todo get it from css?
	this.minRowsInEditor = 30; // number of rows always visible in editor
	this.numOfVisibleRows = 0; //number of visible rows in the editor
	this.firstScreenLine = 0; //first visible row ignoring collapsed tasks
	this.rowBufferSize = 5;
	this.firstVisibleTaskIndex = -1; //index of first task visible
	this.lastVisibleTaskIndex = -1; //index of last task visible

	this.baselines = {}; // contains {taskId:{taskId,start,end,status,progress}}
	this.showBaselines = false; //allows to draw baselines
	this.baselineMillis; //millis of the current baseline loaded


	this.permissions = {
		canWriteOnParent: true,
		canWrite: true,
		canAdd: true,
		canDelete: true,
		canInOutdent: true,
		canMoveUpDown: true,
		canSeePopEdit: true,
		canSeeFullEdit: true,
		canSeeDep: true,
		canSeeCriticalPath: true,
		canAddIssue: false,
		cannotCloseTaskIfIssueOpen: false
	};

	this.firstDayOfWeek = Date.firstDayOfWeek;
	this.serverClientTimeOffset = 0;

	this.currentTask; // task currently selected;

	this.resourceUrl = "res/"; // URL to resources (images etc.)
	this.__currentTransaction;  // a transaction object holds previous state during changes
	this.__undoStack = [];
	this.__redoStack = [];
	this.__inUndoRedo = false; // a control flag to avoid Undo/Redo stacks reset when needed

	Date.workingPeriodResolution = 1; //by default 1 day
	return this;
}


GanttMaster.prototype.init = function (workSpace) {
	var place = $("<div>").prop("id", "TWGanttArea").css({
		padding: 0,
		"overflow-y": "auto",
		"overflow-x": "hidden",
		"border": "1px solid #e5e5e5",
		position: "relative"
	});
	workSpace.append(place).addClass("TWGanttWorkSpace");

	this.workSpace = workSpace;
	this.element = place;
	this.numOfVisibleRows = Math.ceil(this.element.height() / this.rowHeight);

	//by default task are coloured by status
	this.element.addClass('colorByStatus')

	var self = this;
	//load templates
	$("#gantEditorTemplates").loadTemplates(this.templateFunctions).remove();

	//create editor
	this.editor = new GridEditor(this);
	place.append(this.editor.gridified);

	//create gantt
	this.gantt = new Ganttalendar(new Date().getTime() - 3600000 * 24 * 2, new Date().getTime() + 3600000 * 24 * 5, this, place.width() * .6);

	//setup splitter
	self.splitter = $.splittify.init(place, this.editor.gridified, this.gantt.element, 60);
	self.splitter.firstBoxMinWidth = 5;
	self.splitter.secondBoxMinWidth = 20;

	//prepend buttons
	var ganttButtons = $.JST.createFromTemplate({}, "GANTBUTTONS");
	place.before(ganttButtons);
	this.checkButtonPermissions();


	//bindings
	workSpace.bind("deleteFocused.gantt", function (e) {
		//delete task or link?
		var focusedSVGElement = self.gantt.element.find(".focused.focused.linkGroup");
		if (focusedSVGElement.size() > 0)
			self.removeLink(focusedSVGElement.data("from"), focusedSVGElement.data("to"));
		else
			self.deleteCurrentTask();
	}).bind("addAboveCurrentTask.gantt", function () {
		self.addAboveCurrentTask();
	}).bind("addBelowCurrentTask.gantt", function () {
		self.addBelowCurrentTask();
	}).bind("indentCurrentTask.gantt", function () {
		self.indentCurrentTask();
	}).bind("outdentCurrentTask.gantt", function () {
		self.outdentCurrentTask();
	}).bind("moveUpCurrentTask.gantt", function () {
		self.moveUpCurrentTask();
	}).bind("moveDownCurrentTask.gantt", function () {
		self.moveDownCurrentTask();
	}).bind("collapseAll.gantt", function () {
		self.collapseAll();
	}).bind("expandAll.gantt", function () {
		self.expandAll();
	}).bind("fullScreen.gantt", function () {
		self.fullScreen();
	}).bind("print.gantt", function () {
		self.print();


	}).bind("zoomPlus.gantt", function () {
		self.gantt.zoomGantt(true);
	}).bind("zoomMinus.gantt", function () {
		self.gantt.zoomGantt(false);

	}).bind("openFullEditor.gantt", function () {
		self.editor.openFullEditor(self.currentTask, false);
	}).bind("openAssignmentEditor.gantt", function () {
		self.editor.openFullEditor(self.currentTask, true);
	}).bind("addIssue.gantt", function () {
		self.addIssue();
	}).bind("openExternalEditor.gantt", function () {
		self.openExternalEditor();

	}).bind("undo.gantt", function () {
		self.undo();
	}).bind("redo.gantt", function () {
		self.redo();
	}).bind("resize.gantt", function () {
		self.resize();
	});


	//bind editor scroll
	self.splitter.firstBox.scroll(function () {

		//notify scroll to editor and gantt
		self.gantt.element.stopTime("test").oneTime(10, "test", function () {
			var oldFirstRow = self.firstScreenLine;
			var newFirstRow = Math.floor(self.splitter.firstBox.scrollTop() / self.rowHeight);
			if (Math.abs(oldFirstRow - newFirstRow) >= self.rowBufferSize) {
				self.firstScreenLine = newFirstRow;
				self.scrolled(oldFirstRow);
			}
		});
	});


	//keyboard management bindings
	$("body").bind("keydown.body", function (e) {
		//console.debug(e.keyCode+ " "+e.target.nodeName, e.ctrlKey)

		var eventManaged = true;
		var isCtrl = e.ctrlKey || e.metaKey;
		var bodyOrSVG = e.target.nodeName.toLowerCase() == "body" || e.target.nodeName.toLowerCase() == "svg";
		var inWorkSpace = $(e.target).closest("#TWGanttArea").length > 0;

		//store focused field
		var focusedField = $(":focus");
		var focusedSVGElement = self.gantt.element.find(".focused.focused");// orrible hack for chrome that seems to keep in memory a cached object

		var isFocusedSVGElement = focusedSVGElement.length > 0;

		if ((inWorkSpace || isFocusedSVGElement) && isCtrl && e.keyCode == 37) { // CTRL+LEFT on the grid
			self.outdentCurrentTask();
			focusedField.focus();

		} else if (inWorkSpace && isCtrl && e.keyCode == 38) { // CTRL+UP   on the grid
			self.moveUpCurrentTask();
			focusedField.focus();

		} else if (inWorkSpace && isCtrl && e.keyCode == 39) { //CTRL+RIGHT  on the grid
			self.indentCurrentTask();
			focusedField.focus();

		} else if (inWorkSpace && isCtrl && e.keyCode == 40) { //CTRL+DOWN   on the grid
			self.moveDownCurrentTask();
			focusedField.focus();

		} else if (isCtrl && e.keyCode == 89) { //CTRL+Y
			self.redo();

		} else if (isCtrl && e.keyCode == 90) { //CTRL+Y
			self.undo();


		} else if ((isCtrl && inWorkSpace) && (e.keyCode == 8 || e.keyCode == 46)) { //CTRL+DEL CTRL+BACKSPACE  on grid
			self.deleteCurrentTask();

		} else if (focusedSVGElement.is(".taskBox") && (e.keyCode == 8 || e.keyCode == 46)) { //DEL BACKSPACE  svg task
			self.deleteCurrentTask();

		} else if (focusedSVGElement.is(".linkGroup") && (e.keyCode == 8 || e.keyCode == 46)) { //DEL BACKSPACE  svg link
			self.removeLink(focusedSVGElement.data("from"), focusedSVGElement.data("to"));

		} else {
			eventManaged = false;
		}


		if (eventManaged) {
			e.preventDefault();
			e.stopPropagation();
		}

	});

	//ask for comment input
	$("#saveGanttButton").after($('#LOG_CHANGES_CONTAINER'));

	//ask for comment management
	this.element.on("saveRequired.gantt", self.manageSaveRequired.bind(this));


	//resize
	$(window).resize(function () {
		place.css({width: "100%", height: $(window).height() - place.position().top});
		place.trigger("resize.gantt");
	}).oneTime(2, "resize", function () {
		$(window).trigger("resize")
	});


};

GanttMaster.messages = {
	"CANNOT_WRITE": "CANNOT_WRITE",
	"CHANGE_OUT_OF_SCOPE": "NO_RIGHTS_FOR_UPDATE_PARENTS_OUT_OF_EDITOR_SCOPE",
	"START_IS_MILESTONE": "START_IS_MILESTONE",
	"END_IS_MILESTONE": "END_IS_MILESTONE",
	"TASK_HAS_CONSTRAINTS": "TASK_HAS_CONSTRAINTS",
	"GANTT_ERROR_DEPENDS_ON_OPEN_TASK": "GANTT_ERROR_DEPENDS_ON_OPEN_TASK",
	"GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK": "GANTT_ERROR_DESCENDANT_OF_CLOSED_TASK",
	"TASK_HAS_EXTERNAL_DEPS": "TASK_HAS_EXTERNAL_DEPS",
	"GANTT_ERROR_LOADING_DATA_TASK_REMOVED": "GANTT_ERROR_LOADING_DATA_TASK_REMOVED",
	"CIRCULAR_REFERENCE": "CIRCULAR_REFERENCE",
	"CANNOT_MOVE_TASK": "CANNOT_MOVE_TASK",
	"CANNOT_DEPENDS_ON_ANCESTORS": "CANNOT_DEPENDS_ON_ANCESTORS",
	"CANNOT_DEPENDS_ON_DESCENDANTS": "CANNOT_DEPENDS_ON_DESCENDANTS",
	"INVALID_DATE_FORMAT": "INVALID_DATE_FORMAT",
	"GANTT_SEMESTER_SHORT": "GANTT_SEMESTER_SHORT",
	"GANTT_SEMESTER": "GANTT_SEMESTER",
	"GANTT_QUARTER_SHORT": "GANTT_QUARTER_SHORT",
	"GANTT_QUARTER": "GANTT_QUARTER",
	"GANTT_WEEK": "GANTT_WEEK",
	"GANTT_WEEK_SHORT": "GANTT_WEEK_SHORT",
	"CANNOT_CLOSE_TASK_IF_OPEN_ISSUE": "CANNOT_CLOSE_TASK_IF_OPEN_ISSUE",
	"PLEASE_SAVE_PROJECT": "PLEASE_SAVE_PROJECT",
	"CANNOT_CREATE_SAME_LINK": "CANNOT_CREATE_SAME_LINK"
};


GanttMaster.prototype.createTask = function (id, name, code, level, start, duration) {
	var factory = new TaskFactory();
	return factory.build(id, name, code, level, start, duration);
};


GanttMaster.prototype.getOrCreateResource = function (id, name) {
	var res = this.getResource(id);
	if (!res && id && name) {
		res = this.createResource(id, name);
	}
	return res
};

GanttMaster.prototype.createResource = function (id, name) {
	var res = new Resource(id, name);
	this.resources.push(res);
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

GanttMaster.prototype.removeLink = function (fromTask, toTask) {
	//console.debug("removeLink");
	if (!this.permissions.canWrite || (!fromTask.canWrite && !toTask.canWrite))
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

GanttMaster.prototype.__removeAllLinks = function (task, openTrans) {

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

//trigger addedTask event
	$(this.element).trigger("addedTask.gantt", task);
	return ret;
};


/**
 * a project contais tasks, resources, roles, and info about permisions
 * @param project
 */
GanttMaster.prototype.loadProject = function (project) {
	//console.debug("loadProject", project)
	this.beginTransaction();
	this.serverClientTimeOffset = typeof project.serverTimeOffset != "undefined" ? (parseInt(project.serverTimeOffset) + new Date().getTimezoneOffset() * 60000) : 0;
	this.resources = project.resources;
	this.roles = project.roles;

	//permissions from loaded project
	this.permissions.canWrite = project.canWrite;
	this.permissions.canAdd = project.canAdd;
	this.permissions.canWriteOnParent = project.canWriteOnParent;
	this.permissions.cannotCloseTaskIfIssueOpen = project.cannotCloseTaskIfIssueOpen;
	this.permissions.canAddIssue = project.canAddIssue;
	this.permissions.canDelete = project.canDelete;
	//repaint button bar basing on permissions
	this.checkButtonPermissions();


	if (project.minEditableDate)
		this.minEditableDate = computeStart(project.minEditableDate);
	else
		this.minEditableDate = -Infinity;

	if (project.maxEditableDate)
		this.maxEditableDate = computeEnd(project.maxEditableDate);
	else
		this.maxEditableDate = Infinity;


	//recover stored ccollapsed statuas
	var collTasks = this.loadCollapsedTasks();

	//shift dates in order to have client side the same hour (e.g.: 23:59) of the server side
	for (var i = 0; i < project.tasks.length; i++) {
		var task = project.tasks[i];
		task.start += this.serverClientTimeOffset;
		task.end += this.serverClientTimeOffset;
		//set initial collapsed status
		task.collapsed = collTasks.indexOf(task.id) >= 0;
	}


	this.loadTasks(project.tasks, project.selectedRow);
	this.deletedTaskIds = [];


	//recover saved zoom level
	if (project.zoom) {
		this.gantt.zoom = project.zoom;
	} else {
		this.gantt.shrinkBoundaries();
		this.gantt.setBestFittingZoom();
	}


	this.endTransaction();
	var self = this;
	this.gantt.element.oneTime(200, function () {
		self.gantt.centerOnToday()
	});
};


GanttMaster.prototype.loadTasks = function (tasks, selectedRow) {
	//console.debug("GanttMaster.prototype.loadTasks")
	//var prof=new Profiler("ganttMaster.loadTasks");
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

	for (var i = 0; i < this.tasks.length; i++) {
		var task = this.tasks[i];


		var numOfError = this.__currentTransaction && this.__currentTransaction.errors ? this.__currentTransaction.errors.length : 0;
		//add Link collection in memory
		while (!this.updateLinks(task)) {  // error on update links while loading can be considered as "warning". Can be displayed and removed in order to let transaction commits.
			if (this.__currentTransaction && numOfError != this.__currentTransaction.errors.length) {
				var msg = "ERROR:\n";
				while (numOfError < this.__currentTransaction.errors.length) {
					var err = this.__currentTransaction.errors.pop();
					msg = msg + err.msg + "\n\n";
				}
				alert(msg);
			}
			this.__removeAllLinks(task, false);
		}

		if (!task.setPeriod(task.start, task.end)) {
			alert(GanttMaster.messages.GANNT_ERROR_LOADING_DATA_TASK_REMOVED + "\n" + task.name);
			//remove task from in-memory collection
			this.tasks.splice(task.getRow(), 1);
		} else {
			//append task to editor
			this.editor.addTask(task, null, true);
			//append task to gantt
			this.gantt.addTask(task);
		}
	}

	//this.editor.fillEmptyLines();
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


GanttMaster.prototype.changeTaskDeps = function (task) {
	return task.moveTo(task.start, false, true);
};

GanttMaster.prototype.changeTaskDates = function (task, start, end) {
	//console.debug("changeTaskDates",task, start, end)
	return task.setPeriod(start, end);
};


GanttMaster.prototype.moveTask = function (task, newStart) {
	return task.moveTo(newStart, true, true);
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
		master.redraw();
		master.element.trigger("gantt.redrawCompleted");
		//profiler.stop();
	});
	//profilerext.stop();
};


GanttMaster.prototype.checkButtonPermissions = function () {
	var ganttButtons = $(".ganttButtonBar");
	//hide buttons basing on permissions
	if (!this.permissions.canWrite)
		ganttButtons.find(".requireCanWrite").hide();

	if (!this.permissions.canAdd)
		ganttButtons.find(".requireCanAdd").hide();

	if (!this.permissions.canInOutdent)
		ganttButtons.find(".requireCanInOutdent").hide();

	if (!this.permissions.canMoveUpDown)
		ganttButtons.find(".requireCanMoveUpDown").hide();

	if (!this.permissions.canDelete)
		ganttButtons.find(".requireCanDelete").hide();

	if (!this.permissions.canSeeCriticalPath)
		ganttButtons.find(".requireCanSeeCriticalPath").hide();

	if (!this.permissions.canAddIssue)
		ganttButtons.find(".requireCanAddIssue").hide();

};


GanttMaster.prototype.redraw = function () {
	this.editor.redraw();
	this.gantt.redraw();
};

GanttMaster.prototype.reset = function () {
	//console.debug("GanttMaster.prototype.reset");
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

		//shift back to server side timezone
		if (!forTransaction) {
			cloned.start -= this.serverClientTimeOffset;
			cloned.end -= this.serverClientTimeOffset;
		}

		saved.push(cloned);
	}

	var ret = {tasks: saved};
	if (this.currentTask) {
		ret.selectedRow = this.currentTask.getRow();
	}

	ret.deletedTaskIds = this.deletedTaskIds;  //this must be consistent with transactions and undo

	if (!forTransaction) {
		ret.resources = this.resources;
		ret.roles = this.roles;
		ret.canWrite = this.permissions.canWrite;
		ret.canWriteOnParent = this.permissions.canWriteOnParent;
		ret.zoom = this.gantt.zoom;

		//save collapsed tasks on localStorage
		this.storeCollapsedTasks();

		//mark un-changed task and assignments
		this.markUnChangedTasksAndAssignments(ret);

		//si aggiunge il commento al cambiamento di date/status
		ret.changesReasonWhy = $("#LOG_CHANGES").val();

	}

	//prof.stop();
	return ret;
};


GanttMaster.prototype.markUnChangedTasksAndAssignments = function (newProject) {
	//console.debug("markUnChangedTasksAndAssignments");
	//si controlla che ci sia qualcosa di cambiato, ovvero che ci sia l'undo stack
	if (this.__undoStack.length > 0) {
		var oldProject = JSON.parse(this.__undoStack[0]);
		//si looppano i "nuovi" task
		for (var i = 0; i < newProject.tasks.length; i++) {
			var newTask = newProject.tasks[i];
			//se è un task che c'erà già
			if (typeof (newTask.id) == "string" && !newTask.id.startsWith("tmp_")) {
				//si recupera il vecchio task
				var oldTask;
				for (var j = 0; j < oldProject.tasks.length; j++) {
					if (oldProject.tasks[j].id == newTask.id) {
						oldTask = oldProject.tasks[j];
						break;
					}
				}

				//si controlla se ci sono stati cambiamenti
				var taskChanged =
					oldTask.id != newTask.id ||
					oldTask.code != newTask.code ||
					oldTask.name != newTask.name ||
					oldTask.start != newTask.start ||
					oldTask.startIsMilestone != newTask.startIsMilestone ||
					oldTask.end != newTask.end ||
					oldTask.endIsMilestone != newTask.endIsMilestone ||
					oldTask.duration != newTask.duration ||
					oldTask.status != newTask.status ||
					oldTask.typeId != newTask.typeId ||
					oldTask.relevance != newTask.relevance ||
					oldTask.progress != newTask.progress ||
					oldTask.progressByWorklog != newTask.progressByWorklog ||
					oldTask.description != newTask.description ||
					oldTask.level != newTask.level ||
					oldTask.depends != newTask.depends;

				newTask.unchanged = !taskChanged;


				//se ci sono assegnazioni
				if (newTask.assigs && newTask.assigs.length > 0) {

					//se abbiamo trovato il vecchio task e questo aveva delle assegnazioni
					if (oldTask && oldTask.assigs && oldTask.assigs.length > 0) {
						for (var j = 0; j < oldTask.assigs.length; j++) {
							var oldAssig = oldTask.assigs[j];
							//si cerca la nuova assegnazione corrispondente
							var newAssig;
							for (var k = 0; k < newTask.assigs.length; k++) {
								if (oldAssig.id == newTask.assigs[k].id) {
									newAssig = newTask.assigs[k];
									break;
								}
							}

							//se c'è una nuova assig corrispondente
							if (newAssig) {
								//si confrontano i valori per vedere se è cambiata
								newAssig.unchanged =
									newAssig.resourceId == oldAssig.resourceId &&
									newAssig.roleId == oldAssig.roleId &&
									newAssig.effort == oldAssig.effort;
							}
						}
					}
				}
			}
		}
	}
};

GanttMaster.prototype.loadCollapsedTasks = function () {
	var collTasks = [];
	if (localStorage) {
		if (localStorage.getObject("TWPGanttCollTasks"))
			collTasks = localStorage.getObject("TWPGanttCollTasks");
		return collTasks;
	}
};

GanttMaster.prototype.storeCollapsedTasks = function () {
	//console.debug("storeCollapsedTasks");
	if (localStorage) {
		var collTasks;
		if (!localStorage.getObject("TWPGanttCollTasks"))
			collTasks = [];
		else
			collTasks = localStorage.getObject("TWPGanttCollTasks");


		for (var i = 0; i < this.tasks.length; i++) {
			var task = this.tasks[i];

			var pos = collTasks.indexOf(task.id);
			if (task.collapsed) {
				if (pos < 0)
					collTasks.push(task.id);
			} else {
				if (pos >= 0)
					collTasks.splice(pos, 1);
			}
		}
		localStorage.setObject("TWPGanttCollTasks", collTasks);
	}
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
		var p = task.getParent();
		while (p) {
			sups = sups.concat(p.getSuperiors());
			p = p.getParent();
		}

		//my children superiors are my superiors too
		var chs = task.getChildren();
		for (var i = 0; i < chs.length; i++) {
			sups = sups.concat(chs[i].getSuperiors());
		}

		var loop = false;
		//check superiors
		for (var i = 0; i < sups.length; i++) {
			var supLink = sups[i];
			if (supLink.from == target) {
				loop = true;
				break;
			} else {
				if (visited.indexOf(supLink.from.id + "x" + target.id) <= 0) {
					visited.push(supLink.from.id + "x" + target.id);
					if (isLoop(supLink.from, target, visited)) {
						loop = true;
						break;
					}
				}
			}
		}

		//check target parent
		var tpar = target.getParent();
		if (tpar) {
			if (visited.indexOf(task.id + "x" + tpar.id) <= 0) {
				visited.push(task.id + "x" + tpar.id);
				if (isLoop(task, tpar, visited)) {
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
		var depsEqualCheck = [];
		for (var j = 0; j < deps.length; j++) {
			var depString = deps[j]; // in the form of row(lag) e.g. 2:3,3:4,5
			var supStr = depString;
			var lag = 0;
			var pos = depString.indexOf(":");
			if (pos > 0) {
				supStr = depString.substr(0, pos);
				var lagStr = depString.substr(pos + 1);
				lag = Math.ceil((stringToDuration(lagStr)) / Date.workingPeriodResolution) * Date.workingPeriodResolution;
			}

			var sup = this.tasks[parseInt(supStr) - 1];

			if (sup) {
				if (parents && parents.indexOf(sup) >= 0) {
					this.setErrorOnTransaction("\"" + task.name + "\"\n" + GanttMaster.messages.CANNOT_DEPENDS_ON_ANCESTORS + "\n\"" + sup.name + "\"");
					todoOk = false;

				} else if (descendants && descendants.indexOf(sup) >= 0) {
					this.setErrorOnTransaction("\"" + task.name + "\"\n" + GanttMaster.messages.CANNOT_DEPENDS_ON_DESCENDANTS + "\n\"" + sup.name + "\"");
					todoOk = false;

				} else if (isLoop(sup, task, visited)) {
					todoOk = false;
					this.setErrorOnTransaction(GanttMaster.messages.CIRCULAR_REFERENCE + "\n\"" + task.id + " - " + task.name + "\" -> \"" + sup.id + " - " + sup.name + "\"");

				} else if (depsEqualCheck.indexOf(sup) >= 0) {
					this.setErrorOnTransaction(GanttMaster.messages.CANNOT_CREATE_SAME_LINK + "\n\"" + sup.name + "\" -> \"" + task.name + "\"");
					todoOk = false;

				} else {
					this.links.push(new Link(sup, task, lag));
					newDepsString = newDepsString + (newDepsString.length > 0 ? "," : "") + supStr + (lag == 0 ? "" : ":" + durationToString(lag));
				}

				if (todoOk)
					depsEqualCheck.push(sup);
			}
		}
		task.depends = newDepsString;
	}
	//prof.stop();

	return todoOk;
};


GanttMaster.prototype.moveUpCurrentTask = function () {
	var self = this;
	//console.debug("moveUpCurrentTask",self.currentTask)
	if (self.currentTask) {
		if (!(self.permissions.canWrite || self.currentTask.canWrite) || !self.permissions.canMoveUpDown)
			return;

		self.beginTransaction();
		self.currentTask.moveUp();
		self.endTransaction();
	}
};

GanttMaster.prototype.moveDownCurrentTask = function () {
	var self = this;
	//console.debug("moveDownCurrentTask",self.currentTask)
	if (self.currentTask) {
		if (!(self.permissions.canWrite || self.currentTask.canWrite) || !self.permissions.canMoveUpDown)
			return;

		self.beginTransaction();
		self.currentTask.moveDown();
		self.endTransaction();
	}
};

GanttMaster.prototype.outdentCurrentTask = function () {
	var self = this;
	if (self.currentTask) {
		var par = self.currentTask.getParent();
		//can outdent if you have canRight on current task and on its parent and canAdd on grandfather
		if (!self.currentTask.canWrite || !par.canWrite || !par.getParent() || !par.getParent().canAdd)
			return;

		self.beginTransaction();
		self.currentTask.outdent();
		self.endTransaction();

		//[expand]
		if (par) self.editor.refreshExpandStatus(par);
	}
};

GanttMaster.prototype.indentCurrentTask = function () {
	var self = this;
	if (self.currentTask) {

		//can indent if you have canRight on current and canAdd on the row above
		var row = self.currentTask.getRow();
		if (!self.currentTask.canWrite || row <= 0 || !self.tasks[row - 1].canAdd)
			return;

		self.beginTransaction();
		self.currentTask.indent();
		self.endTransaction();
	}
};

GanttMaster.prototype.addBelowCurrentTask = function () {
	var self = this;
	//console.debug("addBelowCurrentTask",self.currentTask)
	var factory = new TaskFactory();
	var ch;
	var row = 0;
	if (self.currentTask && self.currentTask.name) {
		//add below add a brother if current task is not already a parent
		var addNewBrother = !(self.currentTask.isParent() || self.currentTask.level == 0);

		var canAddChild = self.currentTask.canAdd;
		var canAddBrother = self.currentTask.getParent() && self.currentTask.getParent().canAdd;

		//if you cannot add a brother you will try to add a child
		addNewBrother = addNewBrother && canAddBrother;

		if (!canAddBrother && !canAddChild)
			return;


		ch = factory.build("tmp_" + new Date().getTime(), "", "", self.currentTask.level + (addNewBrother ? 0 : 1), self.currentTask.start, 1);
		row = self.currentTask.getRow() + 1;

		if (row > 0) {
			self.beginTransaction();
			var task = self.addTask(ch, row);
			if (task) {
				task.rowElement.click();
				task.rowElement.find("[name=name]").focus();
			}
			self.endTransaction();
		}
	}
};

GanttMaster.prototype.addAboveCurrentTask = function () {
	var self = this;
	// console.debug("addAboveCurrentTask",self.currentTask)

	//check permissions
	if ((self.currentTask.getParent() && !self.currentTask.getParent().canAdd))
		return;

	var factory = new TaskFactory();

	var ch;
	var row = 0;
	if (self.currentTask && self.currentTask.name) {
		//cannot add brothers to root
		if (self.currentTask.level <= 0)
			return;

		ch = factory.build("tmp_" + new Date().getTime(), "", "", self.currentTask.level, self.currentTask.start, 1);
		row = self.currentTask.getRow();

		if (row > 0) {
			self.beginTransaction();
			var task = self.addTask(ch, row);
			if (task) {
				task.rowElement.click();
				task.rowElement.find("[name=name]").focus();
			}
			self.endTransaction();
		}
	}
};

GanttMaster.prototype.deleteCurrentTask = function (taskId) {
	//console.debug("deleteCurrentTask",this.currentTask , this.isMultiRoot)
	var self = this;

	var task;
	if (taskId)
		task = self.getTask(taskId);
	else
		task = self.currentTask;

	if (!task || !self.permissions.canDelete && !task.canDelete)
		return;

	var taskIsEmpty = task.name == "";

	var row = task.getRow();
	if (task && (row > 0 || self.isMultiRoot || task.isNew())) {
		var par = task.getParent();
		self.beginTransaction();
		task.deleteTask();
		task = undefined;

		//recompute depends string
		self.updateDependsStrings();

		//redraw
		self.taskIsChanged();

		//[expand]
		if (par)
			self.editor.refreshExpandStatus(par);


		//focus next row
		row = row > self.tasks.length - 1 ? self.tasks.length - 1 : row;
		if (!taskIsEmpty && row >= 0) {
			task = self.tasks[row];
			task.rowElement.click();
			task.rowElement.find("[name=name]").focus();
		}
		self.endTransaction();
	}
};


GanttMaster.prototype.collapseAll = function () {
	//console.debug("collapseAll");
	if (this.currentTask) {
		this.currentTask.collapsed = true;
		var desc = this.currentTask.getDescendant();
		for (var i = 0; i < desc.length; i++) {
			if (desc[i].isParent()) // set collapsed only if is a parent
				desc[i].collapsed = true;
			desc[i].rowElement.hide();
		}

		this.redraw();

		//store collapse statuses
		this.storeCollapsedTasks();
	}
};

GanttMaster.prototype.fullScreen = function () {
	//console.debug("fullScreen");
	this.workSpace.toggleClass("ganttFullScreen").resize();
	$("#fullscrbtn .teamworkIcon").html(this.workSpace.is(".ganttFullScreen") ? "€" : "@");
};


GanttMaster.prototype.expandAll = function () {
	//console.debug("expandAll");
	if (this.currentTask) {
		this.currentTask.collapsed = false;
		var desc = this.currentTask.getDescendant();
		for (var i = 0; i < desc.length; i++) {
			desc[i].collapsed = false;
			desc[i].rowElement.show();
		}

		this.redraw();

		//store collapse statuses
		this.storeCollapsedTasks();

	}
};


GanttMaster.prototype.collapse = function (task, all) {
	//console.debug("collapse",task)
	task.collapsed = true;
	task.rowElement.addClass("collapsed");

	var descs = task.getDescendant();
	for (var i = 0; i < descs.length; i++)
		descs[i].rowElement.hide();

	this.redraw();

	//store collapse statuses
	this.storeCollapsedTasks();
};


GanttMaster.prototype.expand = function (task, all) {
	//console.debug("expand",task)
	task.collapsed = false;
	task.rowElement.removeClass("collapsed");

	var collapsedDescendant = this.getCollapsedDescendant();
	var descs = task.getDescendant();
	for (var i = 0; i < descs.length; i++) {
		var childTask = descs[i];
		if (collapsedDescendant.indexOf(childTask) >= 0) continue;
		childTask.rowElement.show();
	}

	this.redraw();

	//store collapse statuses
	this.storeCollapsedTasks();

};


GanttMaster.prototype.getCollapsedDescendant = function () {
	var allTasks = this.tasks;
	var collapsedDescendant = [];
	for (var i = 0; i < allTasks.length; i++) {
		var task = allTasks[i];
		if (collapsedDescendant.indexOf(task) >= 0) continue;
		if (task.collapsed) collapsedDescendant = collapsedDescendant.concat(task.getDescendant());
	}
	return collapsedDescendant;
}


GanttMaster.prototype.addIssue = function () {
	var self = this;

	if (self.currentTask && self.currentTask.isNew()) {
		alert(GanttMaster.messages.PLEASE_SAVE_PROJECT);
		return;
	}
	if (!self.currentTask || !self.currentTask.canAddIssue)
		return;

	openIssueEditorInBlack('0', "AD", "ISSUE_TASK=" + self.currentTask.id);
};

GanttMaster.prototype.openExternalEditor = function () {
	//console.debug("openExternalEditor ")
	var self = this;
	if (!self.currentTask)
		return;

	if (self.currentTask.isNew()) {
		alert(GanttMaster.messages.PLEASE_SAVE_PROJECT);
		return;
	}

	//window.location.href=contextPath+"/applications/teamwork/task/taskEditor.jsp?CM=ED&OBJID="+self.currentTask.id;
};

//<%----------------------------- TRANSACTION MANAGEMENT ---------------------------------%>
GanttMaster.prototype.beginTransaction = function () {
	if (!this.__currentTransaction) {
		this.__currentTransaction = {
			snapshot: JSON.stringify(this.saveGantt(true)),
			errors: []
		};
	} else {
		console.error("Cannot open twice a transaction");
	}
	return this.__currentTransaction;
};


//this function notify an error to a transaction -> transaction will rollback
GanttMaster.prototype.setErrorOnTransaction = function (errorMessage, task) {
	if (this.__currentTransaction) {
		this.__currentTransaction.errors.push({msg: errorMessage, task: task});
	} else {
		console.error(errorMessage);
	}
};

GanttMaster.prototype.isTransactionInError = function () {
	if (!this.__currentTransaction) {
		console.error("Transaction never started.");
		return true;
	} else {
		return this.__currentTransaction.errors.length > 0
	}

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
		this.gantt.shrinkBoundaries();
		this.taskIsChanged(); //enqueue for gantt refresh


		//error -> rollback
	} else {
		ret = false;
		//console.debug("rolling-back transaction");

		//compose error message
		var msg = "ERROR:\n";
		for (var i = 0; i < this.__currentTransaction.errors.length; i++) {
			var err = this.__currentTransaction.errors[i];
			msg = msg + err.msg + "\n\n";
		}
		alert(msg);


		//try to restore changed tasks
		var oldTasks = JSON.parse(this.__currentTransaction.snapshot);
		this.deletedTaskIds = oldTasks.deletedTaskIds;
		this.__inUndoRedo = true; // avoid Undo/Redo stacks reset
		this.loadTasks(oldTasks.tasks, oldTasks.selectedRow);
		this.redraw();

	}
	//reset transaction
	this.__currentTransaction = undefined;

	//show/hide save button
	this.saveRequired();

	//[expand]
	this.editor.refreshExpandStatus(this.currentTask);

	return ret;
};

// inhibit undo-redo
GanttMaster.prototype.checkpoint = function () {
	//console.debug("GanttMaster.prototype.checkpoint");
	this.__undoStack = [];
	this.__redoStack = [];
	this.saveRequired();
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
		this.redraw();
		//show/hide save button
		this.saveRequired();
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

		this.saveRequired();
	}
};


GanttMaster.prototype.saveRequired = function () {
	//console.debug("saveRequired")
	//show/hide save button
	if (this.__undoStack.length > 0) {
		$("#saveGanttButton").removeClass("disabled");
		$("form[alertOnChange] #Gantt").val(new Date().getTime()); // set a fake variable as dirty
		this.element.trigger("saveRequired.gantt", [true]);


	} else {
		$("#saveGanttButton").addClass("disabled");
		$("form[alertOnChange] #Gantt").updateOldValue(); // set a fake variable as clean
		this.element.trigger("saveRequired.gantt", [false]);

	}
};


GanttMaster.prototype.print = function () {
	this.gantt.redrawTasks(true);
	print();
};


GanttMaster.prototype.resize = function () {
	var self = this;
	//console.debug("GanttMaster.resize")
	this.element.stopTime("resizeRedraw").oneTime(50, "resizeRedraw", function () {
		self.splitter.resize();
		self.numOfVisibleRows = Math.ceil(self.element.height() / self.rowHeight);
		self.firstScreenLine = Math.floor(self.splitter.firstBox.scrollTop() / self.rowHeight);
		self.gantt.redrawTasks();
	});
};


GanttMaster.prototype.scrolled = function (oldFirstRow) {
	var self = this;
	var newFirstRow = self.firstScreenLine;

	//if scroll something
	if (newFirstRow != oldFirstRow) {
		//console.debug("Ganttalendar.scrolled oldFirstRow:"+oldFirstRow+" new firstScreenLine:"+newFirstRow);

		var collapsedDescendant = self.getCollapsedDescendant();

		var scrollDown = newFirstRow > oldFirstRow;
		var startRowDel;
		var endRowDel;
		var startRowAdd;
		var endRowAdd;

		if (scrollDown) {
			startRowDel = oldFirstRow - self.rowBufferSize;
			endRowDel = newFirstRow - self.rowBufferSize;
			startRowAdd = Math.max(oldFirstRow + self.numOfVisibleRows + self.rowBufferSize, endRowDel);
			endRowAdd = newFirstRow + self.numOfVisibleRows + self.rowBufferSize;
		} else {
			startRowDel = newFirstRow + self.numOfVisibleRows + self.rowBufferSize;
			endRowDel = oldFirstRow + self.numOfVisibleRows + self.rowBufferSize;
			startRowAdd = newFirstRow - self.rowBufferSize;
			endRowAdd = Math.min(oldFirstRow - self.rowBufferSize, startRowDel);
		}

		var firstVisibleRow = newFirstRow - self.rowBufferSize; //ignoring collapsed tasks
		var lastVisibleRow = newFirstRow + self.numOfVisibleRows + self.rowBufferSize;


		//console.debug("remove startRowDel:"+startRowDel+" endRowDel:"+endRowDel )
		//console.debug("add startRowAdd:"+startRowAdd+" endRowAdd:"+endRowAdd)

		var row = 0;
		self.firstVisibleTaskIndex = -1;
		for (var i = 0; i < self.tasks.length; i++) {
			var task = self.tasks[i];
			if (collapsedDescendant.indexOf(task) >= 0) {
				continue;
			}

			//remove rows on top
			if (row >= startRowDel && row < endRowDel) {
				if (task.ganttElement)
					task.ganttElement.remove();
				if (task.ganttBaselineElement)
					task.ganttBaselineElement.remove();

				//add missing ones
			} else if (row >= startRowAdd && row < endRowAdd) {
				self.gantt.drawTask(task);
			}

			if (row >= firstVisibleRow && row < lastVisibleRow) {
				self.firstVisibleTaskIndex = self.firstVisibleTaskIndex == -1 ? i : self.firstVisibleTaskIndex;
				self.lastVisibleTaskIndex = i;
			}

			row++
		}
	}
};


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
		return (t.getRow() > 0) && (!t.isParent() || (t.isParent() && !t.isDependent()));
	});

	// reset values
	for (var i = 0; i < tasks.length; i++) {
		var t = tasks[i];
		t.earlyStart = -1;
		t.earlyFinish = -1;
		t.latestStart = -1;
		t.latestFinish = -1;
		t.criticalCost = -1;
		t.isCritical = false;
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
			t.isCritical = (t.earlyStart == t.latestStart)
		}
	}

};

//------------------------------------------- MANAGE CHANGE LOG INPUT ---------------------------------------------------
GanttMaster.prototype.manageSaveRequired = function (ev, showSave) {
	//console.debug("manageSaveRequired", showSave);

	let checkChanges = function checkChanges() {
		var changes = false;
		//there is somethin in the redo stack?
		if (this.__undoStack.length > 0) {
			var oldProject = JSON.parse(this.__undoStack[0]);
			//si looppano i "nuovi" task
			for (var i = 0; !changes && i < this.tasks.length; i++) {
				var newTask = this.tasks[i];
				//se è un task che c'erà già
				if (!("" + newTask.id).startsWith("tmp_")) {
					//si recupera il vecchio task
					var oldTask;
					for (var j = 0; j < oldProject.tasks.length; j++) {
						if (oldProject.tasks[j].id == newTask.id) {
							oldTask = oldProject.tasks[j];
							break;
						}
					}
					// chack only status or dateChanges
					if (oldTask && (oldTask.status != newTask.status || oldTask.start != newTask.start || oldTask.end != newTask.end)) {
						changes = true;
						break;
					}
				}
			}
		}
		$("#LOG_CHANGES_CONTAINER").css("display", changes ? "inline-block" : "none");
	}.bind(this);

	if (showSave) {
		$("body").stopTime("gantt.manageSaveRequired").oneTime(200, "gantt.manageSaveRequired", checkChanges);
	} else {
		$("#LOG_CHANGES_CONTAINER").hide();
	}

}


/**
 * workStartHour,endStartHour : millis from 00:00
 * dateFormat dd/MM/yyyy HH:mm
 * working period resolution in millis or days
 */
GanttMaster.prototype.setHoursOn = function (startWorkingHour, endWorkingHour, dateFormat, resolution) {
	//console.debug("resolution",resolution)
	Date.defaultFormat = dateFormat;
	Date.startWorkingHour = startWorkingHour;
	Date.endWorkingHour = endWorkingHour;
	Date.useMillis = resolution >= 1000;
	Date.workingPeriodResolution = resolution;
	millisInWorkingDay = endWorkingHour - startWorkingHour;
};
