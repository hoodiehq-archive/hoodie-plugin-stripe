/**
 * Hoodie plugin template
 * An example plugin worker, this is where you put your backend code (if any)
 */
var Stripe = require('stripe');

module.exports = function (hoodie, callback) {

  // subscribe to users db.
  // for new user id stripeToken but not stripePlan
  // subscribe to stripePlan
  // log anything into plugin-stripe database

  var stripeKey = hoodie.config.get('stripeKey')
  if (!stripeKey) {
    console.log('NO STRIPE KEY CONFIGURED, PLEASE SET IT IN THE ADMIN UI');
    console.log('NO PAYMENT RELATED ACTIONS WILL BE RUN');
    return;
  }

  var stripe = Stripe(stripeKey);

  var handleUserChange = function(doc) {
    // worarkound for https://github.com/hoodiehq/hoodie-plugins-api/issues/6
    if (doc.doc) {
      doc = doc.doc
    }

    if (!doc.stripeToken) {
      // no stripe token yet, we can’t do anything
      return;
    }

    if (doc.stripeCustomer) {
      // this user is already subscribed to a plan, do nothing
      return;
    }

    if (doc.stripeError) {
      // something is wrong with this user, don’t do anything
      return;
    }

    var username = doc.name.replace(/^user\//, '');
    stripe.customers.create({
      description: 'Customer for ' + username,
      card: doc.stripeToken,
      plan: 'test10'
    }, function(error, customer) {
      if (error) {
        console.log('STRIPE CUSTOMER CREATION ERROR: "%j"', error);
        doc.stripeError = error
      } else {
        doc.stripeCustomer = customer;
      }
      hoodie.account.update('user', doc.id, doc, function(error) {
        if (error) {
          console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT: "%j"', error);
        }
      });
    });
  }

  hoodie.account.on('user:change', handleUserChange);

  // plugin initialization complete
  callback();

};
