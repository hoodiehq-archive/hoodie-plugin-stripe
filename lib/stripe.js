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

  var username = doc.name.replace(/^user\//, '');
  stripe.customers.create({
    description: 'Customer for ' + username,
    card: doc.stripeToken,
    plan: 'test10'
  }, function(error, customer) {
    if (error) {
      console.log('STRIPE CUSTOMER CREATION ERROR: "%j"', error);
      doc.error = error
      return callback(error);
    } else {
      doc.stripeCustomer = customer;
      doc.confirmed = true;
    }
    hoodie.account.update('user', doc.id, doc, function(error) {
      if (error) {
        console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT: "%j"', error);
        return callback(error);
      }
      return callback(null);
    });
  });
}