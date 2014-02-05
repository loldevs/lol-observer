var Observer = require('./lib/observer.js')
  , KeyframeParser = require('./lib/parser/keyframe.js')
  , co = require('co')

var euw = new Observer('euw')

euw.getFeaturedGames(function (err, games) {
    if(err) {
        console.error(err)
        return
    }

    /*games[0].getMetadata(function(err, data, game) {
        console.log(game)
    })*/

    games[0]
        .on('keyframe.available', function(data) {
            console.log('new keyframe: ', data.id)
            var buffers = []
            var stream = data.download()
            stream.on('data', function(bfr) {
                buffers.push(bfr)
            })
            stream.on('end', function() {
                var full = Buffer.concat(buffers)
                console.log('loaded keyframe ' + data.id + ' Bytes: ' + full.length)
                KeyframeParser().parse(full, function(data) {
                    console.log(data)
                });
            })
        })
        .on('chunk.available', function(data) {
            console.log('new chunk: ', data.id)
        })
        .on('end', function(data) {
            console.log('END')
        })
        .startSpectate()
})

/*
euw.getGame('1265814599', 'EUW1', function(err, game) {
    game.getMetadata()
})
*/

