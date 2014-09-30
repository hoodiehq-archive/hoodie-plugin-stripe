var _ = require('lodash');
var Stripe = require('stripe');
console.log('stripe code loaded!');

module.exports.signUp = function (hoodie, doc, callback) {
  console.log('stripe.signUp()');

  var stripeKey = hoodie.config.get('stripeKey')
  if (!stripeKey) {
    console.log('NO STRIPE KEY CONFIGURED, PLEASE SET IT IN THE ADMIN UI');
    console.log('NO PAYMENT RELATED ACTIONS WILL BE RUN');
    return callback('ignore');
  }

  var stripe = Stripe(stripeKey);

  // worarkound for https://github.com/hoodiehq/hoodie-plugins-api/issues/6
  if (doc.doc) {
    doc = doc.doc;
  }

  if (!doc.stripeToken) {
    // no stripe token yet, we can’t do anything
    console.log('ignore: no stripe token');
    return callback('ignore');
  }

  if (doc.stripeCustomer) {
    // this user is already subscribed to a plan, do nothing
    console.log('ignore: already a customer');
    return callback('ignore');
  }

  if (doc.error) {
    // something is wrong with this user, don’t do anything
    console.log('ignore: user in error state');
    return callback('ignore');
  }

  var handleUserUpdateResponse = function(error) {
    if (error) {
      console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT');
      return callback(error);
    }
    return callback(null);
  };

  var handleUserGetResponse = function(error, newDoc, props) {
    _.merge(newDoc, props);
    hoodie.account.update('user', newDoc.id, newDoc, handleUserUpdateResponse);
  };

  var handleStripeResponse = function(error, customer) {
    var props = {};
    if (error) {
      console.log('STRIPE CUSTOMER CREATION ERROR: "%j"', error);
      props.error = error; // todo: this never makes it anywhere
      return callback(error);
    } else {
      props.stripeCustomer = customer;
      props.confirmed = true;
    }
    hoodie.account.find('user', doc.id, function(error, newDoc) {
      handleUserGetResponse(error, newDoc, props);
    });
  };

  var username = doc.name.replace(/^user\//, '');
  stripe.customers.create({
    description: 'Customer for ' + username,
    card: doc.stripeToken,
    plan: 'test10'
  }, handleStripeResponse);

}
