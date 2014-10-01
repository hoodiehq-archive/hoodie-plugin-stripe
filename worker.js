/**
 * Hoodie plugin template
 * An example plugin worker, this is where you put your backend code (if any)
 */
var async = require('async');

var exports = module.exports = function hoodie_plugin_stripe(hoodie, callback) {

  async.applyEach([
    exports.create_plugin_db,
    exports.create_user_index
    ], hoodie, callback);
    // plugin initialisation complete
};

// create plugin database
exports.create_plugin_db = function create_plugin_db(hoodie, callback) {
  hoodie.database.add('plugin/stripe', function (error) {
    if (error && error.error !== 'file_exists') {
      console.log(error);
      return callback(error);
    }
    callback();
  });
};

// create /_users/_design/plugin%2fstripe
// with _view/by-id
exports.create_user_index = function create_user_index(hoodie, callback) {
  var users_db = hoodie.database('_users');
  var index_name = 'stripe-by-id';

  var mapReduce = {
    map: function(doc) {
      if(doc.stripeCustomer && doc.stripeCustomer.id) {
        emit(doc.stripeCustomer.id);
      }
    }
  };
  users_db.addIndex(index_name, mapReduce, callback)
};
