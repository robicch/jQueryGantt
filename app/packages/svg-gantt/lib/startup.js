Meteor.startup(function(){

    if(Meteor.isClient){

        Template.SvgGantt.rendered = function(){

            $.fn.loadTemplates = new JST();
            $.fn.loadTemplates.loadTemplates($("#gantEditorTemplates")); //.remove();
            $.gridify = Gridify;
            $.splittify = Splitify;
            LoadSVG();

            ge = new GanttMaster();
            var workSpace = $("#svg-gantt");
            workSpace.css({width:$(window).width() - 20,height:$(window).height() - 100});
            ge.init(workSpace);
        }
    }
});
