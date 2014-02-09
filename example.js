var Observer = require('./lib/observer.js')
  , KeyframeParser = require('./lib/parser/keyframe.js')
  , co = require('co')

var euw = new Observer('sk')

euw.getFeaturedGames(function (err, games) {
    if(err) {
        console.error(err)
        return
    }

    /*games[0].getMetadata(function(err, data, game) {
        console.log(game)
    })*/

    for(var i=0;i<games.length;i++)
        spectate(games[i])

})

/*
euw.getGame('1265814599', 'EUW1', function(err, game) {
    game.getMetadata()
})
*/



function spectate(game) {
    var first = true
    game
        .on('keyframe.available', function(data) {
            console.log('new keyframe: ', data.id)
            var buffers = []
            var stream = data.download()
            stream.on('data', function(bfr) {
                buffers.push(bfr)
            })
            stream.on('end', function() {
                var full = Buffer.concat(buffers)
                console.log('loaded keyframe ' + data.id + '#'+ game.id +' Bytes: ' + full.length)
                try {
                    KeyframeParser().parse(full, dump);
                }
                catch(e) {
                    console.log(e)
                }

                function dump(data) {
                    console.log('time: ', data.time)
                    console.log('%s players:', data.players.length)
                    /*for(var pid in data.players) {
                        console.log("player data: %s - %s", data.players[pid].start, data.players[pid].end)
                        console.log("player[%s]: %s", data.players[pid].entity[0], data.players[pid].name)
                        //console.log(data.players[pid].rubish)
                        //console.log(data.players[pid].masteryPointsTotal)
                        //console.log(data.players[pid].items)
                    }*/
                    /*console.log('%s towers:', data.towers.length)
                    for(var tid in data.towers) {
                        if(data.towers[tid].itemHeader[1]) {
                            console.log(data.towers[tid].entity[0], data.towers[tid].name)
                            console.log(data.towers[tid].unknown)
                            console.log(data.towers[tid].itemHeader)
                            console.log(data.towers[tid].items)
                        }
                    }*/
                }
            })
        })
        .on('chunk.available', function(data) {
            //console.log('new chunk: ', data.id)
        })
        .on('end', function(data) {
            console.log('END')
        })
        .startSpectate()
    console.log('spectating game: ' + game.id + ' ' + game.region)
}
