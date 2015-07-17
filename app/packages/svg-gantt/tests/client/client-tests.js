Tinytest.add('Is the grindage template available on the client?', function( test ) {
    // Here we're using the javascript typeof operator to check whether or not
    // Template.grindage is an object. If Template.grindage is defined, its type
    // should be an object. If it's not, this would return undefined.
    test.equal( typeof Template.grindage, "tacos" );
    // Here we can see the inverse of the test above. Here we're saying
    // "Template.grindage should not equal undefined." This and the above test
    // achieve the same thing, so pick whichever syntax is easier to grok.
    test.notEqual( typeof Template.grindage, "undefined" );
});

Tinytest.add('Is the Grindage function available on the client?', function( test ) {
    // This tests does nearly the same thing as our template test above. Again, we
    // check that the typeof our variable is actually something (in this case, function).
    // We could do the notEqual inverse here just like above, but we'll skip it for brevity.
    test.equal( typeof Grindage, "function" );
});

Tinytest.add('Is the FoodGroups collection available on the client?', function( test ) {
    // In order to test for a collection, we do something a bit different. Instead
    // of looking at the typeof for our collection variable (this would be "object"),
    // we look at its constructor. All collections are defined using the
    // Mongo.Collection constructor function in Meteor. Testing for this here
    // ensures that FoodGroups is actuall a collection and not just an empty object.
    test.equal( FoodGroups.constructor, Mongo.Collection );
});

Tinytest.addAsync('Does the FoodGroups collection have documents on the client?', function( test, next ) {
    // Because we're on the client, we need to subscribe to our foodGroups
    // publication. The trick, here, is that instead of using Tinytest.add we're
    // using Tinytest.addAsync. The difference is that using the .addAsync method
    // allows us to "pause" our test and tell it manually when to continue.

    // We use that "pause" technique to wait until we've subscribed to our data
    // and then we attempt to run our test (looking up data). To do it, we use our
    // Meteor.subscribe method's onReady callback function and inside call the
    // next() function that we added to the arguments in our test declaration.
    Meteor.subscribe('foodGroups', function() {
        // After our subscription is ready, we perform the query on our database.
        getGroups = FoodGroups.find().fetch();
        // Next, we test that our query returns the expected number of documents.
        test.equal( getGroups.length, 4 );
        // Lastly, we tell our async test to continue.
        next();
    });
});

Tinytest.add('Does the Grindage function return TRUE for an existing group?', function( test ) {
    // Call our Grindage function, passing a food group we're certain exists.
    var testGroup = Grindage( 'dairy' );
    // Confirm that our function returns true as expected.
    test.equal( testGroup, true );
});

Tinytest.add('Does the Grindage function return FALSE for a non-existent group?', function( test ) {
    // Call our Grindage function, passing a food group we're certain DOES NOT exist.
    var testGroup = Grindage( 'tacos' );
    // Confirm that our function returns false as expected.
    test.equal( testGroup, false );
});
