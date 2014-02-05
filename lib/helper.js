var moment  = require('moment')
exports.parseRiotTime = function(stamp) {
    return moment(stamp + ' -08:00', 'MMM D, YYYY, h:mm:ss ZZ')._d
}
