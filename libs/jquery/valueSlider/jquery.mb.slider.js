/*******************************************************************************
 * jquery.mb.components
 * file: jquery.mb.slider.js
 * last modified: 18/11/17 18.21
 * Version:  {{ version }}
 * Build:  {{ buildnum }}
 *
 * Open Lab s.r.l., Florence - Italy
 * email: matteo@open-lab.com
 * site:  http://pupunzi.com
 *  http://open-lab.com
 * blog:  http://pupunzi.open-lab.com
 *
 * Licences: MIT, GPL
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * Copyright (c) 2001-2017. Matteo Bicocchi (Pupunzi)
 ******************************************************************************/

(function ($) {

	$.mbSlider = {
		name   : "mb.slider",
		author : "Matteo Bicocchi",
		version: "1.6.0",

		defaults: {
			minVal       : 0,
			maxVal       : 100,
			grid         : 0,
			showVal      : true,
			labelPos     : "top",
			rangeColor   : "#000",
			negativeColor: "#e20000",
			formatValue  : function (val) {return parseFloat(val)},
			onSlideLoad  : function (o) {},
			onStart      : function (o) {},
			onSlide      : function (o) {},
			onStop       : function (o) {}
		},

		buildSlider: function (options) {
			return this.each(function () {
				var slider = this;
				var $slider = $(slider);
				$slider.addClass("mb_slider");

				slider.options = {};
				slider.metadata = $slider.data("property") && typeof $slider.data("property") == "string" ? eval('(' + $slider.data("property") + ')') : $slider.data("property");
				$.extend(slider.options, $.mbSlider.defaults, options, this.metadata);
				slider.options.element = slider;

				if (slider.options.grid == 0)
					slider.options.grid = 1;

				if (this.options.startAt < 0 && this.options.startAt < slider.options.minVal)
					slider.options.minVal = parseFloat(this.options.startAt);

				slider.actualPos = this.options.startAt;

				/**
				 * Slider UI builder
				 */
				slider.sliderStart = $("<div class='mb_sliderStart'/>");
				slider.sliderEnd = $("<div class='mb_sliderEnd'/>");
				slider.sliderValue = $("<div class='mb_sliderValue'/>").css({color: this.options.rangeColor});
				slider.sliderZeroLabel = $("<div class='mb_sliderZeroLabel'>0</div>").css({position: "absolute", top: (slider.options.labelPos == "top" ? -18 : 29)});
				slider.sliderValueLabel = $("<div class='mb_sliderValueLabel'/>").css({position: "absolute", borderTop: "2px solid " + slider.options.rangeColor});

				slider.sliderBar = $("<div class='mb_sliderBar'/>").css({position: "relative", display: "block"});
				slider.sliderRange = $("<div class='mb_sliderRange'/>").css({background: slider.options.rangeColor});
				slider.sliderZero = $("<div class='mb_sliderZero'/>").css({});
				slider.sliderHandler = $("<div class='mb_sliderHandler'/>");

				$(slider).append(slider.sliderBar);
				slider.sliderBar.append(slider.sliderValueLabel);

				if (slider.options.showVal) $(slider).append(slider.sliderEnd);
				if (slider.options.showVal) $(slider).prepend(slider.sliderStart);
				slider.sliderBar.append(slider.sliderRange);
				slider.sliderBar.append(slider.sliderRange);

				if (slider.options.minVal < 0) {
					slider.sliderBar.append(slider.sliderZero);
					slider.sliderBar.append(slider.sliderZeroLabel);
				}

				slider.sliderBar.append(slider.sliderHandler);
				slider.rangeVal = slider.options.maxVal - slider.options.minVal;
				slider.zero = slider.options.minVal < 0 ? (slider.sliderBar.outerWidth() * Math.abs(slider.options.minVal)) / slider.rangeVal : 0;
				slider.sliderZero.css({left: 0, width: slider.zero});
				slider.sliderZeroLabel.css({left: slider.zero - 5});

				$(slider).find("div").css({display: "inline-block", clear: "left"});

				$(slider).attr("unselectable", "on");
				$(slider).find("div").attr("unselectable", "on");

				var sliderVal = parseFloat(this.options.startAt) >= slider.options.minVal ? parseFloat(this.options.startAt) : slider.options.minVal;
				slider.sliderValue.html(sliderVal);
				slider.sliderValueLabel.html(slider.options.formatValue(sliderVal));

				slider.sliderStart.html(slider.options.formatValue(slider.options.minVal));
				slider.sliderEnd.html(slider.options.formatValue(slider.options.maxVal));

				if (slider.options.startAt < slider.options.minVal || !slider.options.startAt)
					this.options.startAt = slider.options.minVal;

				slider.evalPosGrid = parseFloat(slider.actualPos);
				$(slider).mbsetVal(slider.evalPosGrid);

				function setNewPosition(e) {

					e.preventDefault();
					e.stopPropagation();

					var mousePos = e.clientX - slider.sliderBar.offset().left;
					var grid = (slider.options.grid * slider.sliderBar.outerWidth()) / slider.rangeVal;
					var posInGrid = grid * Math.round(mousePos / grid);
					var evalPos = ((slider.options.maxVal - slider.options.minVal) * posInGrid) / (slider.sliderBar.outerWidth() - (slider.sliderHandler.outerWidth() / 2)) + parseFloat(slider.options.minVal);

					slider.evalPosGrid = Math.max(slider.options.minVal, Math.min(slider.options.maxVal, slider.options.grid * Math.round(evalPos / slider.options.grid)));

					if (typeof slider.options.onSlide == "function" && slider.gridStep != posInGrid) {
						slider.gridStep = posInGrid;
						slider.options.onSlide(slider);
					}

					$(slider).mbsetVal(slider.evalPosGrid);

				}

				/**
				 * Slider Events
				 *
				 * Add start event both on slider bar and on slider handler
				 */
				var sliderElements = slider.sliderBar.add(slider.sliderHandler);

				sliderElements.on("mousedown.mb_slider", function (e) {

					if (!$(e.target).is(slider.sliderHandler))
						setNewPosition(e);

					if (typeof slider.options.onStart == "function")
						slider.options.onStart(slider);

					$(document).on("mousemove.mb_slider", function (e) {
						setNewPosition(e);
					});

					$(document).on("mouseup.mb_slider", function () {
						$(document).off("mousemove.mb_slider").off("mouseup.mb_slider");
						if (typeof slider.options.onStop == "function")
							slider.options.onStop(slider);
					});

				});

				$(window).on("resize", function() {
          $(slider).mbsetVal(slider.evalPosGrid);
        })

				if (typeof slider.options.onSlideLoad == "function")
					slider.options.onSlideLoad(slider);
			});
		},

		setVal: function (val) {
			var slider = $(this).get(0);
			if (val > slider.options.maxVal) val = slider.options.maxVal;
			if (val < slider.options.minVal) val = slider.options.minVal;
			var startPos = val == slider.options.minVal ? 0 : Math.round(((val - slider.options.minVal) * slider.sliderBar.outerWidth()) / slider.rangeVal);
			startPos = startPos >= 0 ? startPos : slider.zero + val;
			var grid = (slider.options.grid * slider.sliderBar.outerWidth()) / slider.rangeVal;
			var posInGrid = grid * Math.round(startPos / grid);

			slider.evalPosGrid = slider.options.grid * Math.round(val / slider.options.grid);
			slider.sliderHandler.css({left: posInGrid - slider.sliderHandler.outerWidth()/2});
			slider.sliderValueLabel.css({left: posInGrid - (slider.sliderHandler.outerWidth() / 2) - (slider.sliderValueLabel.outerWidth() - slider.sliderHandler.outerWidth()) / 2});

			if (slider.evalPosGrid >= 0) {
				slider.sliderValueLabel.css({borderTop: "2px solid " + slider.options.rangeColor});
				slider.sliderRange.css({left: 0, width: posInGrid, background: slider.options.rangeColor}).removeClass("negative");
				slider.sliderZero.css({width: slider.zero});
			} else {
				slider.sliderValueLabel.css({borderTop: "2px solid " + slider.options.negativeColor});
				slider.sliderRange.css({left: 0, width: slider.zero, background: slider.options.negativeColor}).addClass("negative");
				slider.sliderZero.css({width: posInGrid + (slider.sliderHandler.outerWidth() / 2)});
			}

			if (startPos >= slider.sliderBar.outerWidth() && slider.sliderValueLabel.outerWidth() > 40)
				slider.sliderValueLabel.addClass("right");

			else if (startPos <= 0 && slider.sliderValueLabel.outerWidth() > 40)
				slider.sliderValueLabel.addClass("left");

			else
				slider.sliderValueLabel.removeClass("left right");


			slider.sliderValue.html(val >= slider.options.minVal ? slider.evalPosGrid : slider.options.minVal);
			slider.sliderValueLabel.html(slider.options.formatValue(val >= slider.options.minVal ? slider.evalPosGrid : slider.options.minVal));
		},

		getVal: function () {
			var slider = $(this).get(0);
			return slider.evalPosGrid;
		}
	};

	$.fn.mbSlider = $.mbSlider.buildSlider;
	$.fn.mbsetVal = $.mbSlider.setVal;
	$.fn.mbgetVal = $.mbSlider.getVal;

})(jQuery);

