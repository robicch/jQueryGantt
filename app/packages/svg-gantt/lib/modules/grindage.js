/**
* themeteorchef:grindage
* A tool for checking whether Stoney thinks our food group is legit.
*
* @see {@link https://github.com/themeteor chef/grindage|Grindage on GitHub}
* @license MIT
*/

/**
* @function Grindage
* @public
*
* Takes the passed food group and checks whether it's valid.
*
* @param {string} foodGroup - The name of the food group to test.
*/
Grindage = function( foodGroup ) {
    if ( foodGroup ) {
        var groupExists = _loopFoodGroups( foodGroup.toLowerCase() );
        return groupExists ? true : false;
    } else {
        alert( "Need a food group, buddddy." );
    }
};

/**
* @type {Array.<Object>}
* @private
*
* Contains an array of valid food group objects.
*/
var _getFoodGroups = function() {
    var getFoodGroups = FoodGroups.find( {}, { fields: { "_id": 1 } } ).fetch();
    return getFoodGroups;
}

/**
* @function _loopFoodGroups
* @private
*
* Loops the _foodGroups array and calls _foodGroupExists on the passed item.
*
* @param {string} foodGroup - The name of the food group to find in the _foodGroups array.
*/
var _loopFoodGroups = function( foodGroup ) {
    var groups = _getFoodGroups();
    for( var i = 0; i < groups.length; i++ ) {
        return _checkIfFoodGroupExists( foodGroup ) ? true : false;
    }
};

/**
* @function _checkIfFoodGroupExists
* @private
*
* Loops the _foodGroups array and calls _foodGroupExists on the passed item.
*
* @param {string} foodGroup - The name of the food group to find in the _foodGroups array.
*/
var _checkIfFoodGroupExists = function( foodGroup ) {
    return FoodGroups.findOne({"name": foodGroup});
};
