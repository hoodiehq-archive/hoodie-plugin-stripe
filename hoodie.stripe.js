/**
 * Hoodie plugin template
 * An example plugin, this is where you put your frontend code (if any)
 */

/* global Hoodie */

Hoodie.extend(function (hoodie) {
  'use strict';

  var userDocUrl = function(username) {
    return '/_users/org.couchdb.user:user%2f' + encodeURIComponent(username);
  };

  var storeStripeToken = function (stripeToken, username) {
    username = username.toLowerCase();
    hoodie.account.request('GET', userDocUrl(username))
    .done(function(userDoc) {
      userDoc.stripeToken = stripeToken;
      var options = {
        data: JSON.stringify(userDoc),
        contentType: 'application/json'
      }
      hoodie.account.request('PUT', userDocUrl(username), options)
      .done(function() {
        console.log('stripe token stored');
      })
      .fail(function() {
        console.log('failed storing stripe token');
      });
    })
    .fail(function() {
      console.log('failed loading user doc')
    })
  };
  
  var handleSignUpError = function () {
    console.log(arguments);
  };
  
  var validateType = function (type) {
    if (type !== 'stripe') {
      console.log('not a stripe: ' + type);
    }
  };

  // extend the hoodie.js API
  hoodie.account.signUpWith = function (type, username, password, stripeToken) {
    console.log('> hoodie.account.signUpWith');
    validateType(type);

    return hoodie.account.signUp(username, password)
      .done(storeStripeToken.bind(this, stripeToken))
      .fail(handleSignUpError);
  };
});
