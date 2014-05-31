$(function () {

    var getConfig = _.partial(couchr.get, '/_api/app/config');
    var setConfig = _.partial(couchr.put, '/_api/app/config');

    function updateConfig(obj, callback) {
        getConfig(function (err, doc) {
            if (err) {
                return callback(err);
            }
            doc.config = _.extend(doc.config, obj);
            setConfig(doc, callback);
        });
    }

    // set initial form values
    getConfig(function (err, doc) {
        if (err) {
            return alert(err);
        }
        $('[name=stripeKey]').val(doc.config.stripeKey);
    });

    // save config on submit
    $('#configForm').submit(function (ev) {
        ev.preventDefault();
        var cfg = {
            stripeKey: $('[name=stripeKey]').val(),
        };
        updateConfig(cfg, function (err) {
            if (err) {
                return alert(err);
            }
            else {
                alert('Config saved');
            }
        });
        return false;
    });

});
