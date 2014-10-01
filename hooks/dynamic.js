/*
  Hooks allow you to alter the behaviour of hoodie-server,
  Hoodie’s core backend module.

  This is possible:
  - get a notification when something in hoodie-server happens
  - extend core features of hoodie-server from a plugin

  A hook is defined as a function that takes a number of arguments
  and possibly a return value. Each hook has its own conventions,
  based on where in hoodie-server it hooks into.

  There are fundamentally two types of hooks:
  - static hooks (see static.js)
  - dynamic hooks (this file)

  The core difference is that static hooks work standalone and just
  receive a number of arguments and maybe return a value. Dynamic
  hooks get initialised with a live instance of the hoodie object,
  that is also available in worker.js, with access to the database,
  and other convenience libraries.
*/
var stripe = require('../lib/stripe');
var async = require('async');

module.exports = function (hoodie) {

  var handleConfirm = function(doc, callback) {
    stripe.signUp(hoodie, doc, function(err) {
      // map async.every to regular node conventions
      if (err && err == 'ignore') {
        callback(false); // async.every
      } else {
        callback(true);
      }
    });
  }

  var plugin_db = hoodie.database('plugin/stripe');
  var users_db = hoodie.database('_users');
  var handleWebHook = function(request, reply) {

    // create a new doc in /plugin/stripe/
    // with userid/timestamp
    var userDocForCustomerId = function(callback) {
      var customerId = request.payload.data.object.customer;
      if (customerId == undefined) {
        // this is a creating a customer event
        customerId = request.payload.data.object.id;
      }
      var queryArgs = {
        include_docs: true,
        startkey: customerId,
        limit: 1
      };
      users_db.query('stripe-by-id', queryArgs, function(error, rows) {
        if (error) {
          return callback(new Error(error));
        }
        callback(null, {
          hoodieId: rows[0].doc.hoodieId,
          docId: rows._id
        });
      });
    };

    var storeWebHook = function(userId, callback) {
      var event = request.payload;
      event.stripe_id = event.id;
      event.stripe_type = event.type;
      event.hoodie_user_id = userId.docId;
      event.id = [userId.hoodieId, event.created, event.id].join('/');

      callback(null, event);
    };

    var handleStoreWebHook = function(event, callback) {
      plugin_db.add('event', event, function(error) {
        if(error) {
          return callback(new Error(error));
        }
        callback(null, event);
      });
    }

    var maybeStoreErrorOnUserDoc = function(event, callback) {
      var failureEvents = [
        'charge.failed',
        'invoice.payment_failed'
      ];

      if (failureEvents.indexOf(event.stripe.type) === -1) {
        // no errarrr, we can jump out
        return callback();
      }

      // store stripe error on user doc
      var hoodieError = {
        name: event.data.object.failure_code,
        message: event.data.object.failure_message
      };
      users_db.find('user', event.hoodie_doc_id, function(error, doc) {
        if(error) {
          return callback(new Error(error));
        }
        doc.$error = hoodieError;
        users_db.update('user', event.hoodie_doc_id, doc, callback);
      });
    };

    var done = function(error) {
      if (error) {
        return reply(new Error(error));
      }
      // 200 imlplied by hapi, stripe needs 2xx response
      reply('ok\n');
    };

    // get user doc for customerId
    // store webhook doc at
    async.waterfall([
      userDocForCustomerId,
      storeWebHook,
      handleStoreWebHook,
      maybeStoreErrorOnUserDoc
      ], done);
  };

  return {
    /*
      group: server.api.*
      description: The server.api group allows you to extend the
        /_api endpoint from hoodie-server.
    */
    /*
      name: server.api.plugin-request
      description: This hook handles any request to
        `/_api/_plugins/{pluginname}/_api`. It gets the regular
         hapi request and reply objects as parameters.
         See https://github.com/spumko/hapi/blob/master/docs/Reference.md#request-object
         and https://github.com/spumko/hapi/blob/master/docs/Reference.md#reply-interface
         for details.

      parameters:
      - request: the hapi request object
      - reply: the hapi reply object

      return value: boolen
        false determines that the hook didn’t run successfully and causes Hoodie to
        return a 500 error.
    */
    // 'server.api.plugin-request': function (/* request, reply */) {
    //   console.log('server.api.plugin-request hook called');

    //   Use `hoodie` like you would in worker.js to access the
    //   main data store

    //   return true
    // }
    'server.api.plugin-request': handleWebHook,
    'plugin.user.confirm': handleConfirm,
    'plugin.user.confirm.changeUsername': handleConfirm,
  };
};
