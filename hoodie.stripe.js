Hoodie.extend(function (hoodie, lib, utils) {
  'use strict';

  function couchDbUsername(username) {
    var type = 'user';
    if (hoodie.account.hasAnonymousAccount()){
      username = hoodie.id();
      type = 'user_anonymous';
    }
    return type+'/' + username;
  }
  function userDocUrl(username) {
    return '/_users/org.couchdb.user:' + encodeURIComponent( couchDbUsername(username) );
  }
  function getHeaders(username, password) {
    return {
      'Authorization': 'Basic '+btoa(couchDbUsername(username) + ':' + password)
    };
  }

  var storeStripeToken = function (stripeToken, username, password) {
    console.log('> storeStripeToken');
    username = username.toLowerCase();
    $.ajax({
      type: 'get',
      url: '/_api' + userDocUrl(username),
      headers: getHeaders(username, password)
    })
    .done(function(userDoc) {
      userDoc.stripeToken = stripeToken;
      $.ajax({
        type: 'put',
        url: '/_api' + userDocUrl(username),
        headers: getHeaders(username, password),
        data: JSON.stringify(userDoc),
        contentType: 'application/json'
      })
      .done(function() {
        console.log('stripe token stored');
      })
      .fail(function() {
        console.log('failed storing stripe token');
      });
    })
    .fail(function() {
      console.log('failed loading user doc');
    });
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
      .progress(storeStripeToken.bind(this, stripeToken, username, password))
      .fail(handleSignUpError);
  };
});
