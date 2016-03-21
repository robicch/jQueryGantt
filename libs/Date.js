/**
 * Copyright (c)2005-2009 Matt Kruse (javascripttoolbox.com)
 * 
 * Dual licensed under the MIT and GPL licenses. 
 * This basically means you can use this code however you want for
 * free, but don't claim to have written it yourself!
 * Donations always accepted: http://www.JavascriptToolbox.com/donate/
 * 
 * Please do not link to the .js files on javascripttoolbox.com from
 * your site. Copy the files locally to your server instead.
 * 
 */
/*
Date functions

These functions are used to parse, format, and manipulate Date objects.
See documentation and examples at http://www.JavascriptToolbox.com/lib/date/

*/
Date.$VERSION = 1.02;

// Utility function to append a 0 to single-digit numbers
Date.LZ = function(x) {return(x<0||x>9?"":"0")+x};
// Full month names. Change this for local month names
Date.monthNames = new Array('January','February','March','April','May','June','July','August','September','October','November','December');
// Month abbreviations. Change this for local month names
Date.monthAbbreviations = new Array('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec');
// Full day names. Change this for local month names
Date.dayNames = new Array('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday');
// Day abbreviations. Change this for local month names
Date.dayAbbreviations = new Array('Sun','Mon','Tue','Wed','Thu','Fri','Sat');
// Used for parsing ambiguous dates like 1/2/2000 - default to preferring 'American' format meaning Jan 2.
// Set to false to prefer 'European' format meaning Feb 1
Date.preferAmericanFormat = true;

// Set to 0=SUn for American 1=Mon for european
Date.firstDayOfWeek = 0;

//default 
Date.defaultFormat="dd/MM/yyyy";

// If the getFullYear() method is not defined, create it
if (!Date.prototype.getFullYear) { 
	Date.prototype.getFullYear = function() { var yy=this.getYear(); return (yy<1900?yy+1900:yy); } ;
} 

// Parse a string and convert it to a Date object.
// If no format is passed, try a list of common formats.
// If string cannot be parsed, return null.
// Avoids regular expressions to be more portable.
Date.parseString = function(val, format) {
	// If no format is specified, try a few common formats
	if (typeof(format)=="undefined" || format==null || format=="") {
		var generalFormats=new Array(Date.defaultFormat,'y-M-d','MMM d, y','MMM d,y','y-MMM-d','d-MMM-y','MMM d','MMM-d','d-MMM');
		var monthFirst=new Array('M/d/y','M-d-y','M.d.y','M/d','M-d');
		var dateFirst =new Array('d/M/y','d-M-y','d.M.y','d/M','d-M');
		var checkList=new Array(generalFormats,Date.preferAmericanFormat?monthFirst:dateFirst,Date.preferAmericanFormat?dateFirst:monthFirst);
		for (var i=0; i<checkList.length; i++) {
			var l=checkList[i];
			for (var j=0; j<l.length; j++) {
				var d=Date.parseString(val,l[j]);
				if (d!=null) { 
					return d; 
				}
			}
		}
		return null;
	};

	this.isInteger = function(val) {
		for (var i=0; i < val.length; i++) {
			if ("1234567890".indexOf(val.charAt(i))==-1) { 
				return false; 
			}
		}
		return true;
	};
	this.getInt = function(str,i,minlength,maxlength) {
		for (var x=maxlength; x>=minlength; x--) {
			var token=str.substring(i,i+x);
			if (token.length < minlength) { 
				return null; 
			}
			if (this.isInteger(token)) { 
				return token; 
			}
		}
	return null;
	};


  this.decodeShortcut=function(str){
    var dateUpper = str.trim().toUpperCase();
    var ret=new Date();
    ret.clearTime();

    if (["NOW","N"].indexOf(dateUpper)>=0) {
      ret= new Date();

    } else if (["TODAY","T"].indexOf(dateUpper)>=0) {
      //do nothing

    } else if (["YESTERDAY","Y"].indexOf(dateUpper)>=0) {
      ret.setDate(ret.getDate()-1);

    } else if (["TOMORROW","TO"].indexOf(dateUpper)>=0) {
      ret.setDate(ret.getDate()+1);

    } else if (["W", "TW", "WEEK", "THISWEEK", "WEEKSTART", "THISWEEKSTART"].indexOf(dateUpper)>=0) {
      ret.setFirstDayOfThisWeek();

    } else if (["LW", "LASTWEEK", "LASTWEEKSTART"].indexOf(dateUpper)>=0) {
      ret.setFirstDayOfThisWeek();
      ret.setDate(ret.getDate()-7);

    } else if (["NW", "NEXTWEEK", "NEXTWEEKSTART"].indexOf(dateUpper)>=0) {
      ret.setFirstDayOfThisWeek();
      ret.setDate(ret.getDate()+7);

    } else if (["M", "TM", "MONTH", "THISMONTH", "MONTHSTART", "THISMONTHSTART"].indexOf(dateUpper)>=0) {
      ret.setDate(1);

    } else if (["LM", "LASTMONTH", "LASTMONTHSTART"].indexOf(dateUpper)>=0) {
      ret.setDate(1);
      ret.setMonth(ret.getMonth()-1);

    } else if (["NM", "NEXTMONTH", "NEXTMONTHSTART"].indexOf(dateUpper)>=0) {
      ret.setDate(1);
      ret.setMonth(ret.getMonth()+1);

    } else if (["Q", "TQ", "QUARTER", "THISQUARTER", "QUARTERSTART", "THISQUARTERSTART"].indexOf(dateUpper)>=0) {
      ret.setDate(1);
      ret.setMonth(Math.floor((ret.getMonth()) / 3) * 3);

    } else if (["LQ", "LASTQUARTER", "LASTQUARTERSTART"].indexOf(dateUpper)>=0) {
      ret.setDate(1);
      ret.setMonth(Math.floor((ret.getMonth()) / 3) * 3-3);

    } else if (["NQ", "NEXTQUARTER", "NEXTQUARTERSTART"].indexOf(dateUpper)>=0) {
      ret.setDate(1);
      ret.setMonth(Math.floor((ret.getMonth()) / 3) * 3+3);


    } else if (/^-?[0-9]+[DWMY]$/.test(dateUpper)) {
      var lastOne = dateUpper.substr(dateUpper.length - 1);
      var val = parseInt(dateUpper.substr(0, dateUpper.length - 1));
      if (lastOne=="W")
        ret.setDate(ret.getDate()+val*7 );
      else if (lastOne=="M")
        ret.setMonth(ret.getMonth()+val );
      else if (lastOne=="Y")
        ret.setYear(ret.getYear()+val );
    } else {
      ret=undefined;
    }

    return ret;
  };

  var ret=this.decodeShortcut(val);
  if (ret)
    return ret;

	val=val+"";
	format=format+"";
	var i_val=0;
	var i_format=0;
	var c="";
	var token="";
	var token2="";
	var x,y;
	var year=new Date().getFullYear();
	var month=1;
	var date=1;
	var hh=0;
	var mm=0;
	var ss=0;
	var ampm="";
	while (i_format < format.length) {
		// Get next token from format string
		c=format.charAt(i_format);
		token="";
		while ((format.charAt(i_format)==c) && (i_format < format.length)) {
			token += format.charAt(i_format++);
		}
		// Extract contents of value based on format token
		if (token=="yyyy" || token=="yy" || token=="y") {
			if (token=="yyyy") { 
				x=4;y=4; 
			}
			if (token=="yy") { 
				x=2;y=2; 
			}
			if (token=="y") { 
				x=2;y=4; 
			}
			year=this.getInt(val,i_val,x,y);
			if (year==null) { 
				return null; 
			}
			i_val += year.length;
			if (year.length==2) {
				if (year > 70) { 
					year=1900+(year-0); 
				}
				else { 
					year=2000+(year-0); 
				}
			}

//		} else if (token=="MMM" || token=="NNN"){
		} else if (token=="MMM" || token=="MMMM"){
			month=0;
			var names = (token=="MMMM"?(Date.monthNames.concat(Date.monthAbbreviations)):Date.monthAbbreviations);
			for (var i=0; i<names.length; i++) {
				var month_name=names[i];
				if (val.substring(i_val,i_val+month_name.length).toLowerCase()==month_name.toLowerCase()) {
					month=(i%12)+1;
					i_val += month_name.length;
					break;
				}
			}
			if ((month < 1)||(month>12)){
				return null;
			}
		}
		else if (token=="E"||token=="EE"||token=="EEE"||token=="EEEE"){
			var names = (token=="EEEE"?Date.dayNames:Date.dayAbbreviations);
			for (var i=0; i<names.length; i++) {
				var day_name=names[i];
				if (val.substring(i_val,i_val+day_name.length).toLowerCase()==day_name.toLowerCase()) {
					i_val += day_name.length;
					break;
				}
			}
		}
		else if (token=="MM"||token=="M") {
			month=this.getInt(val,i_val,token.length,2);
			if(month==null||(month<1)||(month>12)){
				return null;
			}
			i_val+=month.length;
		}
		else if (token=="dd"||token=="d") {
			date=this.getInt(val,i_val,token.length,2);
			if(date==null||(date<1)||(date>31)){
				return null;
			}
			i_val+=date.length;
		}
		else if (token=="hh"||token=="h") {
			hh=this.getInt(val,i_val,token.length,2);
			if(hh==null||(hh<1)||(hh>12)){
				return null;
			}
			i_val+=hh.length;
		}
		else if (token=="HH"||token=="H") {
			hh=this.getInt(val,i_val,token.length,2);
			if(hh==null||(hh<0)||(hh>23)){
				return null;
			}
			i_val+=hh.length;
		}
		else if (token=="KK"||token=="K") {
			hh=this.getInt(val,i_val,token.length,2);
			if(hh==null||(hh<0)||(hh>11)){
				return null;
			}
			i_val+=hh.length;
			hh++;
		}
		else if (token=="kk"||token=="k") {
			hh=this.getInt(val,i_val,token.length,2);
			if(hh==null||(hh<1)||(hh>24)){
				return null;
			}
			i_val+=hh.length;
			hh--;
		}
		else if (token=="mm"||token=="m") {
			mm=this.getInt(val,i_val,token.length,2);
			if(mm==null||(mm<0)||(mm>59)){
				return null;
			}
			i_val+=mm.length;
		}
		else if (token=="ss"||token=="s") {
			ss=this.getInt(val,i_val,token.length,2);
			if(ss==null||(ss<0)||(ss>59)){
				return null;
			}
			i_val+=ss.length;
		}
		else if (token=="a") {
			if (val.substring(i_val,i_val+2).toLowerCase()=="am") {
				ampm="AM";
			}
			else if (val.substring(i_val,i_val+2).toLowerCase()=="pm") {
				ampm="PM";
			}
			else {
				return null;
			}
			i_val+=2;
		}
		else {
			if (val.substring(i_val,i_val+token.length)!=token) {
				return null;
			}
			else {
				i_val+=token.length;
			}
		}
	}
	// If there are any trailing characters left in the value, it doesn't match
	if (i_val != val.length) { 
		return null; 
	}
	// Is date valid for month?
	if (month==2) {
		// Check for leap year
		if ( ( (year%4==0)&&(year%100 != 0) ) || (year%400==0) ) { // leap year
			if (date > 29){ 
				return null; 
			}
		}
		else { 
			if (date > 28) { 
				return null; 
			} 
		}
	}
	if ((month==4)||(month==6)||(month==9)||(month==11)) {
		if (date > 30) { 
			return null; 
		}
	}
	// Correct hours value
	if (hh<12 && ampm=="PM") {
		hh=hh-0+12; 
	}
	else if (hh>11 && ampm=="AM") { 
		hh-=12; 
	}
	return new Date(year,month-1,date,hh,mm,ss);
};

// Check if a date string is valid
Date.isValid = function(val,format) {
	return (Date.parseString(val,format) != null);
};

// Check if a date object is before another date object
Date.prototype.isBefore = function(date2) {
	if (date2==null) { 
		return false; 
	}
	return (this.getTime()<date2.getTime());
};

// Check if a date object is after another date object
Date.prototype.isAfter = function(date2) {
	if (date2==null) { 
		return false; 
	}
	return (this.getTime()>date2.getTime());
};

// Check if two date objects have equal dates and times
Date.prototype.equals = function(date2) {
	if (date2==null) { 
		return false; 
	}
	return (this.getTime()==date2.getTime());
};

// Check if two date objects have equal dates, disregarding times
Date.prototype.equalsIgnoreTime = function(date2) {
	if (date2==null) { 
		return false; 
	}
	var d1 = new Date(this.getTime()).clearTime();
	var d2 = new Date(date2.getTime()).clearTime();
	return (d1.getTime()==d2.getTime());
};

// Format a date into a string using a given format string
Date.prototype.format = function(format) {
  if (!format)
    format=Date.defaultFormat;
	format=format+"";
	var result="";
	var i_format=0;
	var c="";
	var token="";
	var y=this.getFullYear()+"";
	var M=this.getMonth()+1;
	var d=this.getDate();
	var E=this.getDay();
	var H=this.getHours();
	var m=this.getMinutes();
	var s=this.getSeconds();
	// Convert real date parts into formatted versions
	var value=new Object();
	if (y.length < 4) {
		y=""+(+y+1900);
	}
	value["y"]=""+y;
	value["yyyy"]=y;
	value["yy"]=y.substring(2,4);
	value["M"]=M;
	value["MM"]=Date.LZ(M);
  value["MMM"]=Date.monthAbbreviations[M-1];
  value["MMMM"]=Date.monthNames[M-1];
	value["d"]=d;
	value["dd"]=Date.LZ(d);
	value["E"]=Date.dayAbbreviations[E];
	value["EE"]=Date.dayAbbreviations[E];
	value["EEE"]=Date.dayAbbreviations[E];
	value["EEEE"]=Date.dayNames[E];
	value["H"]=H;
	value["HH"]=Date.LZ(H);
	if (H==0){
		value["h"]=12;
	}
	else if (H>12){
		value["h"]=H-12;
	}
	else {
		value["h"]=H;
	}
	value["hh"]=Date.LZ(value["h"]);
	value["K"]=value["h"]-1;
	value["k"]=value["H"]+1;
	value["KK"]=Date.LZ(value["K"]);
	value["kk"]=Date.LZ(value["k"]);
	if (H > 11) { 
		value["a"]="PM"; 
	}
	else { 
		value["a"]="AM"; 
	}
	value["m"]=m;
	value["mm"]=Date.LZ(m);
	value["s"]=s;
	value["ss"]=Date.LZ(s);
	while (i_format < format.length) {
		c=format.charAt(i_format);
		token="";
		while ((format.charAt(i_format)==c) && (i_format < format.length)) {
			token += format.charAt(i_format++);
		}
		if (typeof(value[token])!="undefined") { 
			result=result + value[token]; 
		}
		else { 
			result=result + token; 
		}
	}
	return result;
};

// Get the full name of the day for a date
Date.prototype.getDayName = function() { 
	return Date.dayNames[this.getDay()];
};

// Get the abbreviation of the day for a date
Date.prototype.getDayAbbreviation = function() { 
	return Date.dayAbbreviations[this.getDay()];
};

// Get the full name of the month for a date
Date.prototype.getMonthName = function() {
	return Date.monthNames[this.getMonth()];
};

// Get the abbreviation of the month for a date
Date.prototype.getMonthAbbreviation = function() { 
	return Date.monthAbbreviations[this.getMonth()];
};

// Clear all time information in a date object
Date.prototype.clearTime = function() {
  this.setHours(0); 
  this.setMinutes(0);
  this.setSeconds(0); 
  this.setMilliseconds(0);
  return this;
};

// Add an amount of time to a date. Negative numbers can be passed to subtract time.
Date.prototype.add = function(interval, number) {
	if (typeof(interval)=="undefined" || interval==null || typeof(number)=="undefined" || number==null) { 
		return this; 
	}
	number = +number;
	if (interval=='y') { // year
		this.setFullYear(this.getFullYear()+number);
	}
	else if (interval=='M') { // Month
		this.setMonth(this.getMonth()+number);
	}
	else if (interval=='d') { // Day
		this.setDate(this.getDate()+number);
	}
	else if (interval=='w') { // Weekday
		var step = (number>0)?1:-1;
		while (number!=0) {
			this.add('d',step);
			while(this.getDay()==0 || this.getDay()==6) { 
				this.add('d',step);
			}
			number -= step;
		}
	}
	else if (interval=='h') { // Hour
		this.setHours(this.getHours() + number);
	}
	else if (interval=='m') { // Minute
		this.setMinutes(this.getMinutes() + number);
	}
	else if (interval=='s') { // Second
		this.setSeconds(this.getSeconds() + number);
	}
	return this;
  
};

Date.prototype.toInt = function () {
	return this.getFullYear()*10000+(this.getMonth()+1)*100+this.getDate();
};

Date.fromInt=function (dateInt){
  var year = parseInt(dateInt/10000);
  var month = parseInt((dateInt-year*10000)/100);
  var day = parseInt(dateInt-year*10000-month*100);
  return new Date(year,month-1,day,12,00,00);
};


Date.prototype.isHoliday=function(){
  return isHoliday(this);
};

Date.prototype.isToday=function(){
  return this.toInt()==new Date().toInt();  
};


Date.prototype.incrementDateByWorkingDays=function (days) {
  //console.debug("incrementDateByWorkingDays start ",d,days)
  var q = Math.abs(days);
  while (q > 0) {
    this.setDate(this.getDate() + (days > 0 ? 1 : -1));
    if (!this.isHoliday())
      q--;
  }
  return this;
};


//todo questo può essere poco performante in caso di distanze grandi
Date.prototype.distanceInWorkingDays= function (toDate){
  var pos = new Date(this.getTime());
  pos.setHours(23, 59, 59, 999);
  var days = 0;
  var nd=new Date(toDate.getTime());
  nd.setHours(23, 59, 59, 999);
  var end=nd.getTime();
  while (pos.getTime() <= end) {
    days = days + (isHoliday(pos) ? 0 : 1);
    pos.setDate(pos.getDate() + 1);
  }
  return days;
};


Date.prototype.setFirstDayOfThisWeek= function (firstDayOfWeek){
  if (!firstDayOfWeek)
    firstDayOfWeek=Date.firstDayOfWeek;
  this.setDate(this.getDate() - this.getDay() +firstDayOfWeek - (this.getDay()==0 && firstDayOfWeek!=0 ?7:0));
}
