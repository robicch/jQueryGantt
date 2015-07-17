Meteor.startup(function() {

    // Here, we make sure that our collection FoodGroups is available and is
    // actually a Mongo collection. We could just do if ( FoodGroups ) here, but
    // this allows us to be certain our variable is a collection. Hat tip to
    // @chicagogrooves (Dean Radcliffe) for this technique!
    if ( typeof FoodGroups == "object" && FoodGroups.constructor == Mongo.Collection ) {

        var groups = [
            { name: "dairy",     example: "Milk Duds" },
            { name: "fruit",     example: "SweetTarts" },
            { name: "vegetable", example: "Corn Nuts" },
            { name: "meat",      example: "Burrito" }
        ];

        for ( var i = 0; i < groups.length; i++ ) {
            var group       = groups[i],
                groupExists = FoodGroups.findOne( group );

            if ( !groupExists ) {
                FoodGroups.insert( group );
            }
        }
    }
});
