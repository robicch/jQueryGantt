
if(!window.console) {
  window.console = new function() {
    this.log = function(str) {/*alert(str)*/};
    this.debug = function(str) {/*alert(str)*/};
    this.error = function(str) {/*alert(str)*/};
  };
}
if(!window.console.debug || !window.console.error|| !window.console.log ) {
  window.console = new function() {
    this.log = function(str) {/*alert(str)*/};
    this.debug = function(str) {/*alert(str)*/};
    this.error = function(str) {/*alert(str)*/};
  };
}


//----------------------------------positioning-----------------------------------------------
$.fn.bringToFront=function(selector){
  var zi=10;
  var elements = selector ? $(selector) : $("*");
  elements.each(function() {
    if($(this).css("position")!="static"){
      var cur = parseInt($(this).css('zIndex'));
      zi = cur > zi ? parseInt($(this).css('zIndex')) : zi;
    }
  });

  return $(this).css('zIndex',zi+=10);
};

function nearBestPosition(whereId, theObjId, centerOnEl) {
  var el=whereId;
  var target=theObjId;

  if (typeof whereId != "object"){ el = $("#"+whereId); }
  if (typeof theObjId != "object"){target = $("#"+theObjId);}

  if (el) {
    target.css("visibility","hidden");
    var hasContainment = false;

    target.parents().each(function(){
      if($(this).css("position")=="static")
        return;
      hasContainment = true;

    });

    var trueX = hasContainment ? el.position().left : el.offset().left;
    var trueY = hasContainment ? el.position().top : el.offset().top;
    var h = el.outerHeight();
    var elHeight = parseFloat(h);

    if (centerOnEl){
      var elWidth = parseFloat(el.outerWidth());
      var targetWidth = parseFloat(target.outerWidth());
      trueX+=(elWidth-targetWidth)/2;
    }

    trueY += parseFloat(elHeight);

    var left = trueX;
    var top = trueY;
    var barHeight = ($.browser.msie) ? 45 : 35;
    var barWidth = ($.browser.msie) ? 20 : 0;

    if (trueX && trueY) {
      target.css("left", left);
      target.css("top", top);
    }

    if (target.offset().left >= ($(window).width() - target.outerWidth())) {
      left = ($(window).width() - target.outerWidth() - barWidth )+ "px";
      target.css("left", left);
    }

    if (target.offset().left < 0) {
      left = 0+ "px";
      target.css("left", left);
    }

    if ((target.offset().top  + target.outerHeight() >= (($(window).height() - barHeight))) && (target.outerHeight() < $(window).height())) {
      target.css("margin-top",(-(el.outerHeight() + target.outerHeight())) + "px");
    }

    target.css("visibility","visible");
  }
}


String.prototype.trim = function () {
  return this.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
};

String.prototype.startsWith = function(t, i) {
  if (!i) {
    return (t == this.substring(0, t.length));
  } else {
    return (t.toLowerCase()== this.substring(0, t.length).toLowerCase());
  }
};

String.prototype.endsWith = function(t, i) {
  if (!i) {
    return (t== this.substring(this.length - t.length));
  } else {
    return (t.toLowerCase() == this.substring(this.length -t.length).toLowerCase());
  }
};

// leaves only char from A to Z, numbers, _ -> valid ID
String.prototype.asId = function () {
  return this.replace(/[^a-zA-Z0-9_]+/g, '');
};

String.prototype.replaceAll= function(from, to){
  return this.replace(new RegExp(RegExp.quote(from), 'g'),to);
};


if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (searchElement, fromIndex) {
    if (this == null) {
      throw new TypeError();
    }
    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0) {
      return -1;
    }
    var n = 0;
    if (arguments.length > 0) {
      n = Number(arguments[1]);
      if (n != n) { // shortcut for verifying if it's NaN
        n = 0;
      } else if (n != 0 && n != Infinity && n != -Infinity) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
    }
    if (n >= len) {
      return -1;
    }
    var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
    for (; k < len; k++) {
      if (k in t && t[k] === searchElement) {
        return k;
      }
    }
    return -1;
  };
}


Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};


// transform string values to printable: \n in <br>
function transformToPrintable(data){
  for (var prop in data) {
    var value = data[prop];
    if (typeof(value)=="string")
      data[prop]=(value + "").replace(/\n/g, "<br>");
  }
  return data;
}


/* Types Function */

function isValidURL(url){
  var RegExp = /^(([\w]+:)?\/\/)?(([\d\w]|%[a-fA-f\d]{2,2})+(:([\d\w]|%[a-fA-f\d]{2,2})+)?@)?([\d\w][-\d\w]{0,253}[\d\w]\.)+[\w]{2,4}(:[\d]+)?(\/([-+_~.\d\w]|%[a-fA-f\d]{2,2})*)*(\?(&?([-+_~.\d\w]|%[a-fA-f\d]{2,2})=?)*)?(#([-+_~.\d\w]|%[a-fA-f\d]{2,2})*)?$/;
  return RegExp.test(url);
}

function isValidEmail(email){
  var RegExp = /^((([a-z]|[0-9]|!|#|$|%|&|'|\*|\+|\-|\/|=|\?|\^|_|`|\{|\||\}|~)+(\.([a-z]|[0-9]|!|#|$|%|&|'|\*|\+|\-|\/|=|\?|\^|_|`|\{|\||\}|~)+)*)@((((([a-z]|[0-9])([a-z]|[0-9]|\-){0,61}([a-z]|[0-9])\.))*([a-z]|[0-9])([a-z]|[0-9]|\-){0,61}([a-z]|[0-9])\.)[\w]{2,4}|(((([0-9]){1,3}\.){3}([0-9]){1,3}))|(\[((([0-9]){1,3}\.){3}([0-9]){1,3})\])))$/;
  return RegExp.test(email);
}

function isValidInteger(n) {
  reg = new RegExp("^[-+]{0,1}[0-9]*$");
  return reg.test(n);
}

function isValidDouble(n) {
  var sep = Number.decimalSeparator;
  reg = new RegExp("^[-+]{0,1}[0-9]*[" + sep + "]{0,1}[0-9]*$");
  return reg.test(n);
}

function isValidTime(n) {
  return !isNaN(millisFromHourMinute(n));
}

function isValidDurationDays(n) {
  return !isNaN(daysFromString(n));
}

function isValidDurationMillis(n) {
  return !isNaN(millisFromString(n));
}

function isValidDurationMillis(n) {
  return !isNaN(millisFromString(n));
}


/*
 supports almost all Java currency format e.g.: ###,##0.00EUR   €#,###.00  #,###.00€  -$#,###.00  $-#,###.00
 */
function isValidCurrency(numStr){
  //first try to convert format in a regex
  var regex="";
  var format=Number.currencyFormat+"";

  var minusFound=false;
  var numFound=false;
  var currencyString="";
  var numberRegex="[0-9\\"+Number.groupingSeparator+"]+[\\"+Number.decimalSeparator+"]?[0-9]*";

  for (var i=0; i<format.length; i++){
    var ch= format.charAt(i);

    if (ch=="." || ch=="," || ch=="0"){
      //skip it
      if(currencyString!=""){
        regex=regex+"(?:"+RegExp.quote(currencyString)+")?";
        currencyString="";
      }

    } else if (ch=="#") {
      if(currencyString!=""){
        regex=regex+"(?:"+RegExp.quote(currencyString)+")?";
        currencyString="";
      }

      if (!numFound){
        numFound=true;
        regex=regex+numberRegex;
      }

    } else if (ch=="-"){
      if(currencyString!=""){
        regex=regex+"(?:"+RegExp.quote(currencyString)+")?";
        currencyString="";
      }
      if (!minusFound){
        minusFound=true;
        regex=regex+ "[-]?";
      }

    } else {
      currencyString=currencyString+ch;
    }
  }
  if (!minusFound)
    regex="[-]?"+regex;

  if(currencyString!="")
    regex=regex+"(?:"+RegExp.quote(currencyString)+")?";

  regex="^"+regex+"$";

  var rg=new RegExp(regex);
  return rg.test(numStr);
}

function getCurrencyValue(numStr){
  if (!isValidCurrency(numStr))
    return NaN;

  return parseFloat(numStr.replaceAll(Number.groupingSeparator,"").replaceAll(Number.decimalSeparator,".").replace(/[^0123456789.]/,""));
}


function formatCurrency(numberString) {
  return formatNumber(numberString, Number.currencyFormat);
}


function formatNumber(numberString, format) {
  if (!format)
    format="##0.00";

  var dec = Number.decimalSeparator;
  var group = Number.groupingSeparator;
  var neg = Number.minusSign;

  var round = true;

  var validFormat = "0#-,.";

  // strip all the invalid characters at the beginning and the end
  // of the format, and we'll stick them back on at the end
  // make a special case for the negative sign "-" though, so
  // we can have formats like -$23.32
  var prefix = "";
  var negativeInFront = false;
  for (var i = 0; i < format.length; i++) {
    if (validFormat.indexOf(format.charAt(i)) == -1) {
      prefix = prefix + format.charAt(i);
    } else {
      if (i == 0 && format.charAt(i) == '-') {
        negativeInFront = true;
      } else {
        break;
      }
    }
  }
  var suffix = "";
  for (var i = format.length - 1; i >= 0; i--) {
    if (validFormat.indexOf(format.charAt(i)) == -1)
      suffix = format.charAt(i) + suffix;
    else
      break;
  }

  format = format.substring(prefix.length);
  format = format.substring(0, format.length - suffix.length);

  // now we need to convert it into a number
  //while (numberString.indexOf(group) > -1)
  //	numberString = numberString.replace(group, '');
  //var number = new Number(numberString.replace(dec, ".").replace(neg, "-"));
  var number = new Number(numberString);


  var forcedToZero = false;
  if (isNaN(number)) {
    number = 0;
    forcedToZero = true;
  }

  // special case for percentages
  if (suffix == "%")
    number = number * 100;

  var returnString = "";
  if (format.indexOf(".") > -1) {
    var decimalPortion = dec;
    var decimalFormat = format.substring(format.lastIndexOf(".") + 1);

    // round or truncate number as needed
    if (round)
      number = new Number(number.toFixed(decimalFormat.length));
    else {
      var numStr = number.toString();
      numStr = numStr.substring(0, numStr.lastIndexOf('.') + decimalFormat.length + 1);
      number = new Number(numStr);
    }

    var decimalValue = number % 1;
    var decimalString = new String(decimalValue.toFixed(decimalFormat.length));
    decimalString = decimalString.substring(decimalString.lastIndexOf(".") + 1);

    for (var i = 0; i < decimalFormat.length; i++) {
      if (decimalFormat.charAt(i) == '#' && decimalString.charAt(i) != '0') {
        decimalPortion += decimalString.charAt(i);
      } else if (decimalFormat.charAt(i) == '#' && decimalString.charAt(i) == '0') {
        var notParsed = decimalString.substring(i);
        if (notParsed.match('[1-9]')) {
          decimalPortion += decimalString.charAt(i);
        } else{
          break;
        }
      } else if (decimalFormat.charAt(i) == "0"){
        decimalPortion += decimalString.charAt(i);
      }
    }
    returnString += decimalPortion;
  } else{
    number = Math.round(number);
  }
  var ones = Math.floor(number);
  if (number < 0)
    ones = Math.ceil(number);

  var onesFormat = "";
  if (format.indexOf(".") == -1)
    onesFormat = format;
  else
    onesFormat = format.substring(0, format.indexOf("."));

  var onePortion = "";
  if (!(ones == 0 && onesFormat.substr(onesFormat.length - 1) == '#') || forcedToZero) {
    // find how many digits are in the group
    var oneText = new String(Math.abs(ones));
    var groupLength = 9999;
    if (onesFormat.lastIndexOf(",") != -1)
      groupLength = onesFormat.length - onesFormat.lastIndexOf(",") - 1;
    var groupCount = 0;
    for (var i = oneText.length - 1; i > -1; i--) {
      onePortion = oneText.charAt(i) + onePortion;
      groupCount++;
      if (groupCount == groupLength && i != 0) {
        onePortion = group + onePortion;
        groupCount = 0;
      }
    }

    // account for any pre-data padding
    if (onesFormat.length > onePortion.length) {
      var padStart = onesFormat.indexOf('0');
      if (padStart != -1) {
        var padLen = onesFormat.length - padStart;

        // pad to left with 0's or group char
        var pos = onesFormat.length - onePortion.length - 1;
        while (onePortion.length < padLen) {
          var padChar = onesFormat.charAt(pos);
          // replace with real group char if needed
          if (padChar == ',')
            padChar = group;
          onePortion = padChar + onePortion;
          pos--;
        }
      }
    }
  }

  if (!onePortion && onesFormat.indexOf('0', onesFormat.length - 1) !== -1)
    onePortion = '0';

  returnString = onePortion + returnString;

  // handle special case where negative is in front of the invalid characters
  if (number < 0 && negativeInFront && prefix.length > 0)
    prefix = neg + prefix;
  else if (number < 0)
    returnString = neg + returnString;

  if (returnString.lastIndexOf(dec) == returnString.length - 1) {
    returnString = returnString.substring(0, returnString.length - 1);
  }
  returnString = prefix + returnString + suffix;
  return returnString;
}




RegExp.quote = function(str) {
  return str.replace(/([.?*+^$[\]\\(){}-])/g, "\\$1");
};

/* ----- millis format --------- */
/**
 * @param         str         - Striga da riempire
 * @param         len         - Numero totale di caratteri, comprensivo degli "zeri"
 * @param         ch          - Carattere usato per riempire
 */
function pad(str, len, ch){
  if ((str+"").length<len){
    return new Array(len-(''+str).length+1).join(ch) + str;
  } else{
    return str
  }
}

function getMillisInHours(millis) {
  if (!millis)
    return "";
  var sgn=millis>=0?1:-1;
  var hour = Math.floor(millis / 3600000);
  return  (sgn>0?"":"-")+pad(hour,2,"0");
}
function getMillisInHoursMinutes(millis) {
  if (typeof(millis)!="number" )
    return "";

  var sgn=millis>=0?1:-1;
  millis=Math.abs(millis);
  var hour = Math.floor(millis / 3600000);
  var min = Math.floor((millis % 3600000) / 60000);
  return  (sgn>0?"":"-")+pad(hour,1,"0") + ":" + pad(min,2,"0");
}

function getMillisInDaysHoursMinutes(millis) {
  if (!millis)
    return "";
  // millisInWorkingDay is set on partHeaderFooter
  var sgn=millis>=0?1:-1;
  millis=Math.abs(millis);
  var days = Math.floor(millis / millisInWorkingDay);
  var hour = Math.floor((millis % millisInWorkingDay) / 3600000);
  var min = Math.floor((millis-days*millisInWorkingDay-hour*3600000) / 60000);
  return (sgn>=0?"":"-")+(days > 0 ? days + "  " : "") + pad(hour,1,"0") + ":" + pad(min,2,"0");
}

function millisFromHourMinute(stringHourMinutes) { //All this format are valid: "12:58" "13.75"  "63635676000" (this is already in milliseconds)
  var result = 0;
  stringHourMinutes.replace(",",".");
  var semiColSeparator = stringHourMinutes.indexOf(":");
  var dotSeparator = stringHourMinutes.indexOf(".");

  if (semiColSeparator < 0 && dotSeparator < 0 && stringHourMinutes.length > 5) {
    return parseInt(stringHourMinutes, 10); //already in millis
  } else {

    if (dotSeparator > -1) {
      var d = parseFloat(stringHourMinutes);
      result = d * 3600000;
    } else {
      var hour = 0;
      var minute = 0;
      if (semiColSeparator == -1)
        hour = parseInt(stringHourMinutes, 10);
      else {
        hour = parseInt(stringHourMinutes.substring(0, semiColSeparator), 10);
        minute = parseInt(stringHourMinutes.substring(semiColSeparator + 1), 10);
      }
      result = hour * 3600000 + minute * 60000;
    }
    if (typeof(result)!="number")
      result=NaN;
    return result;
  }
}


/**
 * @param string              "3y 4d", "4D:08:10", "12M/3d", "2H4D", "3M4d,2h", "12:30", "11", "3", "1.5", "2m/3D", "12/3d", "1234"
 *                            by default 2 means 2 hours 1.5 means 1:30
 * @param considerWorkingdays if true day lenght is from global.properties CompanyCalendar.MILLIS_IN_WORKING_DAY  otherwise in 24
 * @return milliseconds. 0 if invalid string
 */
function millisFromString(string,considerWorkingdays) {
  if (!string)
    return 0;

  var regex = new RegExp("(\\d+[Yy])|(\\d+[M])|(\\d+[Ww])|(\\d+[Dd])|(\\d+[Hh])|(\\d+[m])|(\\d+[Ss])|(\\d+:\\d+)|(:\\d+)|(\\d*[\\.,]\\d+)|(\\d+)","g");

  var matcher = regex.exec(string);
  var totMillis=0;

  if (!matcher)
    return NaN;

  while (matcher!=null) {
    for (var i = 1; i < matcher.length; i++) {
      var match = matcher[i];
      if (match) {
        var number = 0;
        try {
          number = parseInt(match);
        } catch (e) {
        }
        if (i == 1) { // years
          totMillis = totMillis + number * (considerWorkingdays ? millisInWorkingDay * workingDaysPerWeek * 52 : 3600000 * 24 * 365);
        } else if (i == 2) { // months
          totMillis = totMillis + number * (considerWorkingdays ? millisInWorkingDay * workingDaysPerWeek * 4 : 3600000 * 24 * 30);
        } else if (i == 3) { // weeks
          totMillis = totMillis + number * (considerWorkingdays ? millisInWorkingDay * workingDaysPerWeek : 3600000 * 24 * 7);
        } else if (i == 4) { // days
          totMillis = totMillis + number * (considerWorkingdays ? millisInWorkingDay : 3600000 * 24);
        } else if (i == 5) { // hours
          totMillis = totMillis + number * 3600000;
        } else if (i == 6) { // minutes
          totMillis = totMillis + number * 60000;
        } else if (i == 7) { // seconds
          totMillis = totMillis + number * 1000;
        } else if (i == 8) { // hour:minutes
          totMillis = totMillis + millisFromHourMinute(match);
        } else if (i == 9) { // :minutes
          totMillis = totMillis + millisFromHourMinute(match);
        } else if (i == 10) { // hour.minutes
          totMillis = totMillis + millisFromHourMinute(match);
        } else if (i == 11) { // hours
          totMillis = totMillis + number * 3600000;
        }
      }
    }
    matcher=regex.exec(string);
  }

  return totMillis;
}

/**
 * @param string              "3y 4d", "4D:08:10", "12M/3d", "2H4D", "3M4d,2h", "12:30", "11", "3", "1.5", "2m/3D", "12/3d", "1234"
 *                            by default 2 means 2 hours 1.5 means 1:30
 * @param considerWorkingdays if true day lenght is from global.properties CompanyCalendar.MILLIS_IN_WORKING_DAY  otherwise in 24
 * @return milliseconds. 0 if invalid string
 */
function daysFromString(string,considerWorkingdays) {
  if (!string)
    return undefined;

  var regex = new RegExp("(\\d+[Yy])|(\\d+[Mm])|(\\d+[Ww])|(\\d+[Dd])|(\\d*[\\.,]\\d+)|(\\d+)","g");

  var matcher = regex.exec(string);
  var totDays=0;

  if (!matcher)
    return NaN;

  while (matcher != null) {
    for (var i = 1; i < matcher.length; i++) {
      var match = matcher[i];
      if (match) {
        var number = 0;
        try {
          number = parseInt(match);
        } catch (e) {
        }
        if (i == 1) { // years
          totDays = totDays + number * (considerWorkingdays ? workingDaysPerWeek * 52 : 365);
        } else if (i == 2) { // months
          totDays = totDays + number * (considerWorkingdays ? workingDaysPerWeek * 4 : 30);
        } else if (i == 3) { // weeks
          totDays = totDays + number * (considerWorkingdays ? workingDaysPerWeek : 7);
        } else if (i == 4) { // days
          totDays = totDays + number;
        } else if (i == 5) { // days.minutes
          totDays = totDays + number;
        } else if (i == 6) { // days
          totDays = totDays + number;
        }
      }
    }
    matcher=regex.exec(string);
  }

  return totDays;
}



/* Object Functions */

function stopBubble(e) {
  if ($.browser.msie && event){
    event.cancelBubble = true;
    event.returnValue = false;

  }else if (e){
    e.stopPropagation();
    e.preventDefault();
  }
  return false;
}

//validation functions - used by textfield and datefield
function validateField(ev) {
  var  el = $(this);
  var rett=true;
  el.clearErrorAlert();
  // check serverside only if not empty
  var value = el.val();
  if (value) {

    var type = el.attr('entryType').toUpperCase();

    if (type == "INTEGER") {
      rett = isValidInteger(value);
    } else if (type == "DOUBLE") {
      rett = isValidDouble(value);
    } else if (type == "PERCENTILE") {
      rett = isValidDouble(value);
    } else if (type == "URL") {
      rett = isValidURL(value);
    } else if (type == "EMAIL") {
      rett = isValidEmail(value);
    } else if (type == "DURATIONMILLIS") {
      rett = isValidDurationMillis(value);
    } else if (type == "DURATIONDAYS") {
      rett = isValidDurationDays(value);
    } else if (type == "DATE") {
      rett = Date.isValid(value,el.attr("format"));
    } else if (type == "TIME") {
      rett = isValidTime(value);
    } else if (type == "CURRENCY") {
      rett = isValidCurrency(value);
    }

    if (!rett) {
      el.createErrorAlert(i18n.ERROR_ON_FIELD,i18n.INVALID_DATA);
    }
  }
  return rett;
}

jQuery.fn.clearErrorAlert= function(){
  this.each(function(){
    var el = $(this);
    el.removeAttr("invalid").removeClass("formElementsError");
    $("#"+el.attr("id")+"error").remove();
  });
  return this;
};

jQuery.fn.createErrorAlert = function(errorCode, message) {
  this.each(function() {
    var el = $(this);
    el.attr("invalid", "true").addClass("formElementsError");
    if ($("#" + el.attr("id") + "error").size() <= 0) {
      var errMess = (errorCode?errorCode:"") + ": " + (message?message:"");
      var err = "<img width='17' heigh='17' id=\"" + el.attr("id") + "error\" error='1'";
      err += " onclick=\"alert($(this).attr('title'))\" border='0' align='absmiddle'>";
      err=$(err);
      err.attr("title",errMess).attr("src","res/alert.gif");
      el.after(err);
    }
  });
  return this;
};


//errors =[{ceName:ceErrorCode},...]
function jsonErrorHandling(response){
  if (!response.ok){
    if (response.message)
      alert("ERROR:\n"+ response.message);
    for (var i in response.clientEntryErrors){
      var err=response.clientEntryErrors[i];
      $(":input[name="+err.name+"]").createErrorAlert(err.error);
    }
  }
}



// ---------------------------------- oldvalues management
// update all values selected
jQuery.fn.updateOldValue= function(){
  this.each(function(){
    var el = $(this);
    el.data("_oldvalue",el.val());
  });
  return this;
};

// return true if at least one element has changed
jQuery.fn.isValueChanged=function (){
  var ret=false;
  this.each(function(){
    var el = $(this);
    if (el.val()+"" != el.data("_oldvalue") + ""){
      //console.debug("io sono diverso "+el.attr("id")+ " :"+el.val()+" != "+el.data("_oldvalue"));
      ret=true;
      return false;
    }
  });
  return ret;
};

jQuery.fn.getOldValue=function(){
  return $(this).data("_oldvalue");
};




$.fn.unselectable=function(){
  this.each(function(){
    $(this).addClass("unselectable").attr("unselectable","on");
  });
  return $(this);
};

$.fn.clearUnselectable=function(){
  this.each(function(){
    $(this).removeClass("unselectable").removeAttr("unselectable");
  });
  return $(this);
};


// ----------------------------------  PROFILING ------------------------------------------
var __profiler = {};
/**
 * usage: instantiate a new Profiler("a name") at the beginning of the code you want to profile  var p= new Profiler("testLoop")
 *        call p.stop() at the end of the code you want test.
 *        call Profiler.displayAll() or p.display() to see how many times the code has been executed and millisecond spent.
 *        call Profiler.resetAll() or p.reset() to restart profiler.
 * @param name
 */
function Profiler(name) {
  this.startTime = new Date().getTime();
  this.name = name;

  this.stop = function() {
    if (!__profiler[this.name])
      __profiler[this.name] = {millis:0,count:0};
    __profiler[this.name].millis += new Date().getTime() - this.startTime;
    __profiler[this.name].count++;
  };
  this.display = function() {
    console.debug(__profiler[this.name]);
  };

  this.reset = function() {
    delete __profiler[this.name];
  };
}

Profiler.reset = function() {
    __profiler = {};
};

Profiler.displayAll = function() {
  var ret = "";
  var totMillis = 0;
  for (var key in  __profiler) {
    var p = __profiler[key];
    var extraspace="                          ".substr(0,30-key.length);
    ret += key + extraspace+ "\t millis:" + p.millis+"\t count:" + p.count  + "\n";
    totMillis += p.millis;
  }
  console.debug(ret);
};


$(document).ready(function() {
  $(":input[oldValue]").livequery(function(){$(this).updateOldValue();});
  $('.validated').livequery('blur', validateField);
});

function openBlackPopup(url,width,height,onCloseCallBack,iframeId){
  if(!iframeId)
    iframeId="bwinPopup";

  if (!width)
    width='900px';
  if (!height)
    height='730px';

  $("#__blackpopup__").remove();

  var bg=$("<div>").attr("id","__blackpopup__");
  //bg.css({position:'fixed',top:0, left:0,width:'100%',height:'100%', backgroundImage:"url('"+contextPath+"/applications/teamwork/images/black_70.png')",textAlign:'center'});
  bg.css({position:'fixed',top:0, left:0,width:'100%',height:'100%',textAlign:'center'});

  //add black only if not already in blackpupup
  if(window.name!=iframeId)
    bg.css({backgroundImage:"url('"+contextPath+"/applications/teamwork/images/black_70.png')"});

  bg.append("<iframe id='"+iframeId+"' name='"+iframeId+"' frameborder='0'></iframe>");
  bg.bringToFront();


  //close call callback
  bg.bind("close",function(){
    bg.slideUp(300,function(){
      bg.remove();
      if (typeof(onCloseCallBack)=="function")
        onCloseCallBack();
    });
  });

  //destroy do not call callback
  bg.bind("destroy",function(){
    bg.remove();
  });

  bg.find("iframe:first").attr("src",url).css({width:width, height:height,top:100,border:'8px solid #909090', backgroundColor:'#ffffff'});

  var bdiv= $("<div>").css({width:width,position:"relative",height:"5px", textAlign:"right", margin:"auto" });
  bdiv.append("<img src=\"res/closeBig.png\" style='cursor:pointer;position:absolute;right:-40px;top:30px;'>");
  bdiv.find("img:first").click( function(){
    bg.trigger("close");

  });

  bg.prepend(bdiv);
  $("body").append(bg);
}


//returns a jquery object where to write content
function createBlackPage(width,height,onCloseCallBack){
  if (!width)
    width='900px';
  if (!height)
    height='730px';

  $("#__blackpopup__").remove();

  var bg=$("<div>").attr("id","__blackpopup__");
  bg.css({position:'fixed',top:"0px",paddingTop:"50px", left:0,width:'100%',height:'100%',  backgroundImage:"url('res/img/black_70.png')"});
  bg.append("<div id='bwinPopupd' name='bwinPopupd'></div>");
  bg.bringToFront();

  var ret=bg.find("#bwinPopupd");
  ret.css({width:width, height:height,top:10, "-moz-box-shadow":'1px 1px 6px #333333',overflow:'auto',"-webkit-box-shadow":'1px 1px 6px #333333', border:'8px solid #777', backgroundColor:"#fff", margin:"auto" });

  var bdiv= $("<div>").css({width:width,position:"relative",height:"0px", textAlign:"right", margin:"auto" });
  var img=$("<img src='res/closeBig.png' style='cursor:pointer;position:absolute;right:-40px;top:5px;' title='close'>");
  bdiv.append(img);
  img.click( function(){
    bg.trigger("close");
  });

  bg.prepend(bdiv);
  $("body").append(bg);

  //close call callback
  bg.bind("close",function(){
    bg.slideUp(300,function(){
      bg.remove();
      if (typeof(onCloseCallBack)=="function")
        onCloseCallBack();
    });
  });

  //destroy do not call callback
  bg.bind("destroy",function(){
    bg.remove();
  });
  return ret;
}


function getBlackPopup(){
  var ret=$("#__blackpopup__");
  if (typeof(top)!="undefined"){
    ret= window.parent.$("#__blackpopup__");
  }
  return ret;
}


function closeBlackPopup(){
  getBlackPopup().trigger("close");
}



//------------------------------------------------ TEAMWORK SPECIFIC FUNCTIONS   --------------------------------------------------------
function openIssueEditorInBlack(issueId,command,params){
  if (!command)
    command="ED";
  var editUrl=contextPath+"/applications/teamwork/issue/issueEditor.jsp?CM="+command+"&OBJID="+issueId;
  if (params)
    editUrl=editUrl+params;
  openBlackPopup(editUrl,1020,$(window).height()-50, function(){$("#"+issueId).effect("highlight", { color: "yellow" }, 1500);});
}

function openBoardInBlack(boardId,command,params,callback){
  if (!command)
    command="ED";
  var editUrl=contextPath+"/applications/teamwork/board/boardEditor.jsp?CM="+command+"&OBJID="+boardId;
  if (params)
    editUrl=editUrl+params;
  openBlackPopup(editUrl,$(window).width()-100,$(window).height()-50,callback );
}

