/*
  Copyright (c) 2009 Open Lab
  Written by Roberto Bicchierai http://roberto.open-lab.com
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

jQuery.fn.dateField = function(options) {

  //check if the input field is passed correctly
  if (!options.inputField){
    console.error("You must supply an input field");
    return false;
  }

  // --------------------------  start default option values --------------------------

  if (typeof(options.firstDayOfWeek) == "undefined")
    options.firstDayOfWeek=Date.firstDayOfWeek;

  if (typeof(options.useWheel) == "undefined")
    options.useWheel=true;

  if (typeof(options.dateFormat) == "undefined")
    options.dateFormat=Date.defaultFormat;
  // --------------------------  end default option values --------------------------


  // ------------------ start
  if(options.inputField.is("[readonly]") || options.inputField.is("[disabled]"))
    return;
  
  var calendar = {currentDate: new Date()};
  calendar.options = options;

  //build the calendar on the first element in the set of matched elements.
  var theOpener = this.eq(0);
  var theDiv=$("<div>").addClass("calBox");


  //create calendar elements elements
  var divNavBar = $("<div>").addClass("calNavBar");
  var divDays = $("<div>").addClass("calDay");

  divDays.addClass("calFullMonth");
  theDiv.append(divNavBar).append(divDays);


  if (options.isSearchField){
    var divShortcuts=$("<div>").addClass("shortCuts").html("<span title='last quarter'>LQ</span> <span title='last month'>LM</span> <span title='this month'>M</span> <span title='last week'>LW</span> <span title='this week'>W</span> <span title='yesterday'>Y</span> <span title='today'>T</span><span title='tomorrow'>TO</span> <span title='next week'>NW</span> <span title='next month'>NM</span> <span title='this quarter'>Q</span> <span title='next quarter'>NQ</span>");
    divShortcuts.click(function(ev){
      var el=$(ev.target);
      if(el.is("span")){
        if (!options.isSearchField)
          options.inputField.val(Date.parseString(el.text().trim(),options.dateFormat).format(options.dateFormat),true);
        else
          options.inputField.val(el.text().trim());
        theDiv.remove();
      }
    });
    theDiv.append(divShortcuts);
  }


  $("body").append(theDiv);
  nearBestPosition(theOpener,theDiv);
  theDiv.bringToFront();


  //register for click outside. Delayed to avoid it run immediately
  $("body").oneTime(100, "regclibodcal", function() {
    $("body").bind("click.dateField", function() {
      $(this).unbind("click.dateField");
      theDiv.remove();
    });
  });


  calendar.drawCalendar = function(date) {
    calendar.currentDate = date;

    var fillNavBar = function(date) {
      var t = new Date(date.getTime());
      divNavBar.empty();

      t.setMonth(t.getMonth()-1);
      var spanPrev = $("<span>").addClass("calElement noCallback prev").attr("millis", t.getTime());
      t.setMonth(t.getMonth()+1);
      var spanMonth = $("<span>").html(t.format("MMMM yyyy"));
      t.setMonth(t.getMonth()+1);
      var spanNext = $("<span>").addClass("calElement noCallback next").attr("millis", t.getTime());

      divNavBar.append(spanPrev).append(spanMonth).append(spanNext);
    };

    var fillDaysFullMonth = function(date) {
      divDays.empty();
      var t = new Date();//today
      var w = parseInt((theDiv.width()-4-(4*7))/7)+"px";
      // draw day headers
      var d = new Date(date);
      d.setFirstDayOfThisWeek(options.firstDayOfWeek);
      for (var i = 0; i < 7; i++) {
        var span = $("<span>").addClass("calDayHeader").attr("day", d.getDay());
        span.css("width",w);
        span.html(Date.dayAbbreviations[d.getDay()]);

        //call the dayHeaderRenderer
        if (typeof(options.dayHeaderRenderer) == "function")
          options.dayHeaderRenderer(span,d.getDay());

        divDays.append(span);
        d.setDate(d.getDate()+1);
      }

      //draw cells
      d = new Date(date);
      d.setDate(1); // set day to start of month
      d.setFirstDayOfThisWeek(options.firstDayOfWeek);//go to first day of week

      var i=0;

      while ((d.getMonth()<=date.getMonth() && d.getFullYear()<=date.getFullYear()) || d.getFullYear()<date.getFullYear() || (i%7!=0)) {
        var span = $("<span>").addClass("calElement day").attr("millis", d.getTime());

        span.html("<span class=dayNumber>" + d.getDate() + "</span>").css("width",w);
        if (d.getYear() == t.getYear() && d.getMonth() == t.getMonth() && d.getDate() == t.getDate())
          span.addClass("today");
        if (d.getYear() == date.getYear() && d.getMonth() == date.getMonth() && d.getDate() == date.getDate())
          span.addClass("selected");

        if(d.getMonth()!=date.getMonth())
          span.addClass("calOutOfScope");

        //call the dayRenderer
        if (typeof(options.dayRenderer) == "function")
          options.dayRenderer(span,d);

        divDays.append(span);
        d.setDate(d.getDate()+1);
        i++;
      }

    };

    fillNavBar(date);
    fillDaysFullMonth(date);
  };


  theDiv.click(function(ev) {
    var el = $(ev.target).closest(".calElement");
    if (el.size() > 0) {
      var date = new Date(parseInt(el.attr("millis")));
      if (el.hasClass("day")) {
        theDiv.remove();
        if (!el.is(".noCallback")) {
          options.inputField.val(date.format(options.dateFormat)).attr("millis", date.getTime()).focus();
          if (typeof(options.callback) == "function")
            options.callback(date);
        }
      } else {
        calendar.drawCalendar(date);
      }
    }
    ev.stopPropagation();
  });


  //if mousewheel
  if ($.event.special.mousewheel && options.useWheel) {
    divDays.mousewheel(function(event, delta) {
      var d = new Date(calendar.currentDate.getTime());
      d.setMonth(d.getMonth() + delta);
      calendar.drawCalendar(d);
      return false;
    });
  }


  // start calendar to the date in the input
  var dateStr=options.inputField.val();


  if (!dateStr || !Date.isValid(dateStr,options.dateFormat,true)){
    calendar.drawCalendar(new Date());
  } else {
    var date = Date.parseString(dateStr,options.dateFormat,true);
    //set date string formatted
    if (!options.isSearchField)
      options.inputField.val(date.format(options.dateFormat)).attr("millis",date.getTime());
    
    calendar.drawCalendar(date);
  }

  return calendar;
};