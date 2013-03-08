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

function Ganttalendar(master, minGanttSize, renderInfo) {
    this.master = master; // is the a GantEditor instance
    this.highlightBar = 0;
    this.minGanttSize = minGanttSize;
    this.renderInfo = renderInfo;
    this.AxisColor =[];
    this.AxisColor[0]=1;
    this.AxisWeekend();
    this.element = this.createGantt();
}
Ganttalendar.prototype.createGantt =function () {

    var start;
    var MjrAxisWidth;
    var daysInMonth;
    var mnrAxisWidth;
    var sm;
    var epd;
    var colspan;
    var end;
    var noOfDays;
    var count=0;
    var dispFormat;
    var tbl;
    var trow1;
    var trow2;
    var noOfDP;
    var hrWidth;
    var hrsInDp;
    var i =0;
    var cellwidth;
    var hoursInDay;
    var tdmnrAxis;
    var trmnrAxis;
    var mnrAxisEnd;
    var mnrAxisstart;
    var hour;
    var minutes;
    var stTime;
    var endDate;
    var wdth;
    var k;
    var duration;
    var sd;
    var tr1                   = $("<tr>").addClass("siebui-ganttHead1");
    var tr2                   = $("<tr>").addClass("siebui-ganttHead2");
    var tr3;
    var trBody                = $("<tr>").addClass("ganttBody");
    var self =this;
    var noOfHrs;
    var HOURMILLIS          = 3600000;
    var BOTAXISINFO         = this.renderInfo["BA"];
    var RENDERTHIRDAXIS     = BOTAXISINFO?1:0;
    var dayInfo             = this.renderInfo["DI"];
    self.startMillis         = this.renderInfo["startMillis"];
    var endMillis           = this.renderInfo["endMillis"];
    var yearth              = self.master.editor.element.find("[id=Yearheader]");
    var splDayInfo          = this.renderInfo["SPL_DT"];
    var daysplinfo;
    var WEEK_DAY =1,
        DAY_DAYPART =2,
        DAY_HOUR=4,
        MONTH_DOW   =32,
        MONTH_DAY   =64,
        WEEK_DAY_DAYPART =128,
        MONTH_DOW_DAYPART=256,
        DAY_TWOHOUR =512,
        DAY_FOURHOUR =1024,
        MINUTES_INHOUR=60;
    
    if(yearth)
    {
        var startYear       = new Date(self.startMillis).getFullYear();
        var endYear         = new Date(endMillis).getFullYear();
        yearth.text((startYear === endYear)? startYear:startYear +" - "+endYear);
    }
    
    if(RENDERTHIRDAXIS)
    {
        tr3 = $("<tr>").addClass("siebui-ganttHead2");
    }
    var timescalecls = "siebui-ganttdrilldown";
    var timeScaleLIC = this.renderInfo["TST"];
    var weekend;
    switch(Number(timeScaleLIC)){
        //Rendering month timescales
        case(MONTH_DOW_DAYPART):
            start = new Date(self.startMillis);
            if(!dayInfo)
            {
                break;
            }
            noOfDP = dayInfo.length;
            while (start.getTime()<endMillis && count<5)//Rendering Major Axis
            {
                sm = start.getTime();
                sd = start.format('MM/dd/yyyy');
                daysplinfo = splDayInfo[sd];
                weekend = self.IsWeekend(start);
                tr1.append(self.createHeadCell(new Date(sm).format("EEE, MMM d"), 1,0,timescalecls,daysplinfo,weekend,1));
                if(RENDERTHIRDAXIS)
                {
                    tr3.append(self.createHeadCell((BOTAXISINFO[sd] ? BOTAXISINFO[sd].FLD1 +"/"+ BOTAXISINFO[sd].FLD2:""), 1,0));
                }
                i=0;
                tdmnrAxis=$("<td width='100%'>");
                tbl =$("<table width='100%' height='100%'>").addClass("siebui-ganttInnerTbl");
                trmnrAxis =$("<tr width='100%'>");
                while (i<noOfDP) //Rendering Minor Axis
                {
                    noOfHrs = (dayInfo[i].DUR)/3600;
                    mnrAxisWidth =(noOfHrs/24)*100;
                    trmnrAxis.append(self.createHeadCell(dayInfo[i].NM.substr(0,1),0,mnrAxisWidth+"%",0,0,weekend,2));
                    i = i+1;
                }
                tbl.append(trmnrAxis);
                tdmnrAxis.append(tbl );
                tr2.append(tdmnrAxis);
                count++;
                start.setDate(start.getDate() + 7);
            }
            break;
        case(MONTH_DOW):
        case(MONTH_DAY):
            start = new Date(self.startMillis);
            var noOfCells;
            if(timeScaleLIC=== "32")
            {
                sm =  start.getTime();
                noOfCells =5;
                while (start.getTime() < endMillis && count < noOfCells)
                {
                    start.setDate(1);
                    start.setMonth(start.getMonth() + 1);
                    if (start.getTime() < endMillis)
                    {
                        daysInMonth = Math.ceil((start.getTime() - sm) / (HOURMILLIS * 24*this.renderInfo["noOfHrs"]));
                        count += daysInMonth;
                    }
                    else
                    {
                        daysInMonth = noOfCells-count;
                    }
                    tr1.append(self.createHeadCell(new Date(sm).format("MMMM"), daysInMonth)); //spans mumber of dayn in the month
                    sm += (daysInMonth * HOURMILLIS * 24*7);
                }
                dispFormat="EEE dd";
            }
            else
            {
                noOfCells=31;
                while (start.getTime() < endMillis)
                {
                    sm = start.getTime();
                    start.setDate(1);
                    start.setMonth(start.getMonth() + 1);
                    if (start.getTime() < endMillis)
                    {
                        daysInMonth = Math.floor((start.getTime() - sm) / (HOURMILLIS * 24*this.renderInfo["noOfHrs"]));
                        if (daysInMonth === 0)
                        {
                            daysInMonth = 1;
                        }
                        count += daysInMonth;
                    }
                    else
                    {
                        daysInMonth = noOfCells-count;
                    }
                    tr1.append(self.createHeadCell(new Date(sm).format("MMM"),daysInMonth)); //spans mumber of dayn in the month
                }
                dispFormat="d";
            }
            start = new Date(self.startMillis);
            count =0;
            while (++count <= noOfCells)
            {
                weekend = self.IsWeekend(start);
                sd = start.format('MM/dd/yyyy');
                if(timeScaleLIC=== "MONTH_DOW")
                {
                    daysplinfo = splDayInfo[sd];
                    tr2.append(self.createHeadCell(start.format(dispFormat), 1, 0,timescalecls,daysplinfo,weekend,2));
                }
                else
                {
                    tr2.append(self.createHeadCell(start.format(dispFormat), 1, 0,timescalecls,0,weekend,2));
                }
                if(RENDERTHIRDAXIS)
                {
                    if(Number(timeScaleLIC)=== MONTH_DAY)
                    {
                        tr3.append(self.createHeadCell((BOTAXISINFO[sd] ? BOTAXISINFO[sd].FLD1 :""),1));
                    }
                    else
                    {
                        tr3.append(self.createHeadCell((BOTAXISINFO[sd] ? BOTAXISINFO[sd].FLD1 +"/"+ BOTAXISINFO[sd].FLD2:""), 1,0));
                    }
                }
                start.setDate(start.getDate() + this.renderInfo["noOfHrs"]);
            }
            break;

        //Rendering Day timescales
        case (DAY_HOUR):
        case (DAY_TWOHOUR):
        case (DAY_FOURHOUR):
            start = new Date(self.startMillis);
                while (start.getTime() < endMillis) //Rendering Major Axis
                {
                    sm = start.getTime();
                    sd = start.format('MM/dd/yyyy');
                    weekend = self.IsWeekend(start);
                    start.setDate(start.getDate() + 1);
                    mnrAxisstart = new Date(sm);
                    if (start.getTime() < endMillis)
                    {
                        MjrAxisWidth = (start.getTime() - sm)/(endMillis-self.startMillis)*100;
                        mnrAxisEnd =start.getTime() ;
                    }
                    else
                    {
                        MjrAxisWidth = (endMillis - sm)/(endMillis-self.startMillis)*100;
                        mnrAxisEnd =endMillis;
                    }
                    daysplinfo = splDayInfo[sd];
                    tr1.append(self.createHeadCell(new Date(sm).format("EEEE, MMMM d"), 0,MjrAxisWidth+"%",timescalecls,daysplinfo,weekend,1)); //spans mumber of dayn in the month
                    if(RENDERTHIRDAXIS)
                    {
                        tr3.append(self.createHeadCell((BOTAXISINFO[sd] ? BOTAXISINFO[sd].FLD1 +"/"+ BOTAXISINFO[sd].FLD2:""), 1,0));
                    }
                    mnrAxisWidth = this.renderInfo["noOfHrs"]*HOURMILLIS*100/(endMillis-self.startMillis);
                    mnrAxisWidth = mnrAxisWidth/MjrAxisWidth*100;
                    tdmnrAxis=$("<td width='100%'>");
                    tbl =$("<table width='100%' height='100%' cellspacing='0' cellpadding='0'>").addClass("siebui-ganttInnerTbl");
                    trmnrAxis =$("<tr width='100%'>");
                    while (mnrAxisstart.getTime() < mnrAxisEnd) //Rendering Minor Axis
                    {
                        hour =mnrAxisstart.getHours();
                        minutes=mnrAxisstart.getMinutes();
                        stTime =hour*MINUTES_INHOUR+minutes;
                        endDate=mnrAxisEnd-mnrAxisstart.getTime();
                        if(stTime%(this.renderInfo["noOfHrs"]*MINUTES_INHOUR)!==0 || endDate< (this.renderInfo["noOfHrs"]*HOURMILLIS))
                        {
                            if(stTime%(this.renderInfo["noOfHrs"]*MINUTES_INHOUR)!==0)
                            {
                                duration=(this.renderInfo["noOfHrs"]*MINUTES_INHOUR)-(stTime%(this.renderInfo["noOfHrs"]*MINUTES_INHOUR));
                            }
                            else
                            {
                                duration=endDate/60000;
                            }
                            wdth=(duration/(this.renderInfo["noOfHrs"]*MINUTES_INHOUR)*mnrAxisWidth);
                            trmnrAxis.append(self.createHeadCell(mnrAxisstart.format("h a"), 0, wdth+"%",0,0,weekend,2));
                            mnrAxisstart.setTime(mnrAxisstart.getTime() +(duration*MINUTES_INHOUR*1000));
                        }
                        else
                        {
                            trmnrAxis.append((self.createHeadCell(mnrAxisstart.format("h a"), 0, mnrAxisWidth+"%",0,0,weekend,2)));
                            mnrAxisstart.setHours(mnrAxisstart.getHours() +this.renderInfo["noOfHrs"]);
                        }
                    }
                    tbl.append(trmnrAxis);
                    tdmnrAxis.append(tbl );
                    tr2.append(tdmnrAxis);
                }
                break;
           case (DAY_DAYPART):
                start = new Date(self.startMillis);
                if(!dayInfo)
                {
                    break;
                }
                noOfDP = dayInfo.length;
                while (start.getTime() < endMillis) //Rendering Major Axis
                {
                    sm = start.getTime();
                    sd = start.format('MM/dd/yyyy');
                    mnrAxisstart = new Date(sm);
                    weekend = self.IsWeekend(start);
                    start.setDate(start.getDate() + 1);
                    mnrAxisEnd =start.getTime();
                    MjrAxisWidth = (start.getTime() - sm)/(endMillis-self.startMillis)*100;
                    daysplinfo = splDayInfo[sd];
                    tr1.append(self.createHeadCell(new Date(sm).format("EEEE, MMMM d"), 0,MjrAxisWidth+"%",timescalecls,daysplinfo,weekend,1));
                    if(RENDERTHIRDAXIS)
                    {
                       tr3.append(self.createHeadCell((BOTAXISINFO[sd] ? BOTAXISINFO[sd].FLD1 +"/"+ BOTAXISINFO[sd].FLD2:""),0,MjrAxisWidth+"%"));
                    }
                    k=0;
                    tdmnrAxis=$("<td width='100%'>");
                    tbl =$("<table width='100%' height='100%' cellspacing='0' cellpadding='0'>").addClass("siebui-ganttInnerTbl");
                    trmnrAxis =$("<tr width='100%'>");
                    while (mnrAxisstart.getTime() < mnrAxisEnd) //Rendering Minor Axis
                    {
                        noOfHrs = (dayInfo[k].DUR)/3600;
                        mnrAxisWidth = dayInfo[k].DUR/(endMillis-self.startMillis)*100*1000;
                        trmnrAxis.append(self.createHeadCell(dayInfo[k].NM, 0, mnrAxisWidth+"%",0,0,weekend,2));
                        k = (k+1)%noOfDP;
                        mnrAxisstart.setHours(mnrAxisstart.getHours() +noOfHrs);
                    }
                    tbl.append(trmnrAxis);
                    tdmnrAxis.append(tbl );
                    tr2.append(tdmnrAxis);
                }
            break;

        //Rendering Week/Day/Day Part timescale
        case(WEEK_DAY_DAYPART):
            start = new Date(self.startMillis);
            if(!dayInfo)
            {
                break;
            }
            noOfDP = dayInfo.length;
            
            while (start.getTime()<endMillis) //Rendering Major Axis
            {
                sm = start.getTime();
                sd = start.format('MM/dd/yyyy');
                weekend = self.IsWeekend(start);
                start.setDate(start.getDate() + 1);
                MjrAxisWidth = (start.getTime()-sm)/(endMillis-self.startMillis)*100;
                daysplinfo = splDayInfo[sd];
                tr1.append(self.createHeadCell(new Date(sm).format("EEE, MMM d"), 1,0,timescalecls,daysplinfo,weekend,1));
                if(RENDERTHIRDAXIS)
                {
                    tr3.append(self.createHeadCell((BOTAXISINFO[sd] ? BOTAXISINFO[sd].FLD1 +"/"+ BOTAXISINFO[sd].FLD2:""),1,0));
                }
                i=0;
                tdmnrAxis=$("<td width='100%'>");
                tbl =$("<table width='100%' height='100%' cellspacing='0' cellpadding='0'>").addClass("siebui-ganttInnerTbl");
                trmnrAxis =$("<tr width='100%'>");
                while (i<noOfDP) //Rendering Minor Axis
                {
                    noOfHrs = (dayInfo[i].DUR)/3600;
                    mnrAxisWidth =noOfHrs/24*100;
                    trmnrAxis.append(self.createHeadCell(dayInfo[i].NM.substr(0,1),0,mnrAxisWidth+"%",0,0,weekend,2));
                    i = (i+1);
                }
                tbl.append(trmnrAxis);
                tdmnrAxis.append(tbl );
                tr2.append(tdmnrAxis);
            }
            break;

        case(WEEK_DAY):
            start = new Date(self.startMillis);
            epd   = new Date(endMillis);
            
            while (start.getTime() <= endMillis)
            {
                end = new Date(start.getTime());
                end.setDate(end.getDate() + 7);
                end.setDate(end.getDate() -1);
                tr1.append(self.createHeadCell(start.format("MMM d") + " - " + end.format("MMM d'yy"), 7));
                start.setDate(start.getDate() + 7);
            }
            start = new Date(self.startMillis);
            noOfDays = (endMillis -start.getTime())/(24*HOURMILLIS);
            mnrAxisWidth = 1/noOfDays*100;
            while (start.getTime() < endMillis)
            {
                weekend = self.IsWeekend(start);
                sd = start.format('MM/dd/yyyy');
                daysplinfo = splDayInfo[sd];
                tr2.append(self.createHeadCell(start.format("d EEEE"), 1,0,timescalecls,daysplinfo,weekend,2));
                if(RENDERTHIRDAXIS)
                {
                    tr3.append(self.createHeadCell((BOTAXISINFO[sd] ? BOTAXISINFO[sd].FLD1 +"/"+ BOTAXISINFO[sd].FLD2:""), 1,0));
                }
                start.setDate(start.getDate() + 1);
            }
            break;
       
    }
    var table =$("<table width='100%' height='100%' cellspacing='0' cellpadding='0'>");
    if(RENDERTHIRDAXIS)
    {
        tr1.attr('height','33%');
        tr2.attr('height','33%');
        tr3.attr('height','33%');
        table.append(tr1).append(tr2).append(tr3).addClass("siebui-ganttTable").css({width:self.minGanttSize});
    }
    else
    {
        tr1.attr('height','50%');
        tr2.attr('height','50%');
        table.append(tr1).append(tr2).addClass("siebui-ganttTable").css({width:self.minGanttSize});
    }

    var box = $("<div>");
    box.css({width:self.minGanttSize});
    box.css({height:'100%'});
    box.append(table);

    //highlightBar
    /*var hlb = $("<div>").addClass("ganttHighLight");
    box.append(hlb);
    self.highlightBar = hlb;

    //create link container
    var links = $("<div>");
    //links.addClass("ganttLinks").css({position:"absolute",top:0,width:computedTableWidth,height:"100%"});
    box.append(links);*/


    //compute scalefactor fx
    self.fx = self.minGanttSize/(endMillis- self.startMillis);
    if(this.renderInfo["DDrag"])
    {
       self.DDrag = this.renderInfo["DDrag"];
    }
    else
    {
      self.DDrag ="N";
    }
    if(this.renderInfo["DRSZ"])
    {
       self.DRSZ = this.renderInfo["DRSZ"];
    }
    else
    {
       self.DRSZ = self.DDrag;
    }
    return box;
};
Ganttalendar.prototype.AxisWeekend =function () {
   var timeScaleLIC  = ';'+this.renderInfo["TST"]+':';
   var weekendAxisColors = ';'+this.renderInfo["Weekend Axis Color TS"]+';';
   var Axis;
   var index;
   if((index = weekendAxisColors.indexOf(timeScaleLIC)) != -1)
   {
      Axis =weekendAxisColors.substring(index+timeScaleLIC.length,weekendAxisColors.indexOf(';',index+timeScaleLIC.length));
      if(Axis.indexOf("1")!== -1)
         this.AxisColor[1] =1;
      if(Axis.indexOf("2")!== -1)
         this.AxisColor[2] =1;
   }
   else
   {
      this.AxisColor[0]=0;
   }

};
//TimeScale Implementation
Ganttalendar.prototype.createHeadCell =function (lbl, span, width, additionalClass,daysplinfo,weekend,AxisNo) {
    //modified for timescale drilldown
    var th = $("<th>");
    var div1 = $("<div>");
    var colorInfo       = this.renderInfo["TS COLOR"];
    var iconInfo        = this.renderInfo["ICON_INFO"];
    var color;
    if (additionalClass)
    {
        div1.append(jQuery('<a class=' + additionalClass + '>').text(lbl));
    }
    else
    {
        div1.html(lbl);
    }
    //To Display Icons
    if (daysplinfo)
    {
        var imgfolder = "../images/";
        for ( var key in daysplinfo)
        {
            if (iconInfo && iconInfo[key])
            {
                var cssclass = iconInfo[key];
                var image = $("<img>");
                    image.attr('src', imgfolder+'spacer.gif');
                    image.addClass(cssclass);
                div1.append(image);
            }
            if (colorInfo && colorInfo[key])
            {
               color = colorInfo[key];
               if(color)
               {
                  th.css({'background-color':color});
               }
            }
        }
    }
    th.append(div1);
    if(weekend && (!this.AxisColor[0] ||this.AxisColor[AxisNo]))
    {
        color = colorInfo["Weekends"];
        if(color)
        {
            th.addClass('siebui-Weekends').css("background-color",color);
        }
    }
    if (span !==0)
    {
        th.attr("colSpan", span);
    }
    else if(width && width !==0)
    {
        th.attr("width", width);
    }

    return th;
};
Ganttalendar.prototype.IsWeekend = function (start) {
    if(start instanceof Date)
    {
        var day = start.getDay();
        if(day=== 0)
        {
            day=7;
        }
        day =','+day+',';
        return ((this.renderInfo["Weekends"]).indexOf(day) !== -1);
    }
};

Ganttalendar.prototype.createBodyCell = function (span, isEnd, additionalClass) {
    var ret = $("<td>").html("&nbsp;").attr("colSpan", span).addClass("ganttBodyCell");
    if (isEnd)
    {
        ret.addClass("end");
    }
    if (additionalClass)
    {
        ret.addClass(additionalClass);
    }
    return ret;
};

//<%-------------------------------------- GANT TASK GRAPHIC ELEMENT --------------------------------------%>
Ganttalendar.prototype.drawTask = function (Events,row) {
    var self = this;
    var eventcls =  "siebui-ganttdrilldown";
    var editorRow = self.master.utility.find("[id=" + row + "]");
    var rowindex = ($(editorRow).closest('tr')).index();
    var top = rowindex * $(editorRow).closest('tr').height();
    var imgfolder = "../images/";
    var iconInfo = this.renderInfo["ICON_INFO"];

    if(Events)
    {
        var task;
        var taskId;
        var pTask = "";
        var counter = 0;
        var height = $(".siebui-taskEditRow").height();

        for(var nC= 0 ;nC < Events.length; nC++ )
        {
            var calculatedtop;
            var y;
            var eheight;
            var borderwidth = parseInt($(".siebui-layout").css("border-width"),10);
            task = self.master.getEvent(row,Events[nC]);
            task["CLS"] = eventcls;
            var start = new Date(task.ST);
            var end = new Date(task.ET);
            //resetting the counter for the next set of overlapping record of the same resource.
            if (task.OLPCNT && pTask !== "" && pTask.loco)
            {
                counter = 0;
            }
            //resetting the counter for the next set of overlapping record of the same resource.
            
            if(task.OLPCNT)
            {
                counter++;
                y = (height/task.OLPCNT);

                if (counter == 1)
                {
                    calculatedtop = top;
                }
                else if (task.OTE)
                {
                }
                else
                {
                    calculatedtop = calculatedtop + y;
                }
                if (borderwidth > 0)
                {
                    eheight = y - task.OLPCNT/(2 * borderwidth);
                }
            }
            else
            {
                counter = 0;
                calculatedtop = top;
                eheight = height;
            }

            var x = Math.round((start - self.startMillis) * self.fx);
            var taskBox = $.JST.createFromTemplate(task, "TASKBAR");
            var drg = ((self.DDrag != "Y") && (task["DRG"]==='Y'));
            var rsz = ((self.DRSZ != "Y") && (task["RSZ"] ? task["RSZ"] === "Y"  : task["DRG"]==="Y"));
            if(drg)
            {
               taskBox.addClass("siebui-taskBox Dragpble");
            }
            if(rsz)
            {
               taskBox.addClass("siebui-taskBox Rsizable");
            }
            if(!drg && !rsz)
            {
               taskBox.addClass("siebui-taskBox");
            }
            if (task["Icon"])
            {
                var iarray = task["Icon"].split(',');
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
                            taskBox.children(0).append(span);
                    }
                }
            }
            //save row element on task

            taskBox.css({top:calculatedtop, height:eheight,left:x,width:Math.round((end - start) * self.fx)});
            var Val = self.master.utility.find("[id=" + row + "]").find("td");
            Val.append(taskBox);
            pTask = task;
        }
    }
};


Ganttalendar.prototype.addTask = function (task) {
};


//<%-------------------------------------- GANT DRAW LINK ELEMENT --------------------------------------%>
//'from' and 'to' are tasks already drawn

Ganttalendar.prototype.reset = function() {
    this.element.find("[taskId]").remove();
};

Ganttalendar.prototype.redrawTasks = function() {
    for (var i=0;i<this.master.tasks.length;i++)
    {
        var taskrow  = this.master.tasks[i];
        // Sorting Event based on Display order.

        var taskEvents = this.master.gettaskSeqEvents(taskrow);
        // Sorting Event based on Display order.
        this.drawTask(taskEvents,taskrow);
    }
};


Ganttalendar.prototype.refreshGantt = function() {
    var par = this.element.parent();

    //try to maintain last scroll
    var scrollY=par.scrollTop();
    var scrollX=par.scrollLeft();

    this.element.remove();
    var domEl = this.createGantt();
    this.element = domEl;
    par.append(domEl);

    this.redrawTasks();

    //set current task
    if (this.master.currentTask)
    {
        this.highlightBar.css("top", this.master.currentTask.rowElement.position().top);
    }
};
