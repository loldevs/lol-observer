var events = require('events')
  , util   = require('util')
  , helper = require('./helper.js')

module.exports = KeyframeParser

function KeyframeParser(options) {
    if(!(this instanceof KeyframeParser)) {
        return new KeyframeParser(options)
    }
}


KeyframeParser.prototype.parse = function(buffer, callback) {
    var fn = function (cb) {
        var offset = 0x10
        var players = []
        for(var player = 0;player<10;player++) {
            console.log('player ', player, 'of', 10)
            var data = {}
            data.header = buffer.slice(offset, offset + 4)
            offset += 5
            data.entity = buffer.slice(offset, offset + 4)
            offset += 4
            data.playernr = buffer.slice(offset, offset + 4)
            offset += 4
            offset += 10// skip unknown bytes

            data.playername = buffer.slice(offset, offset + 128)
            offset += 128
            data.champname = buffer.slice(offset, offset + 55)
            offset += 55


            data.playername = helper.toString(data.playername)
            data.champname = helper.toString(data.champname)

            data.runesHeader = buffer.slice(offset, offset + 5)
            offset += 5
            data.runes = []
            for(var i=0;i<30;i++) {
                data.runes.push(buffer.slice(offset, offset+4))
                offset += 4
            }
            var tmp = offset
            offset = helper.findSubstr(buffer, new Buffer([0xa8, 0x6e, 0x49, 0x06]), offset)
            data.masteryOffset = offset-tmp
            data.masteryOffsetContents = buffer.slice(tmp, offset)
            data.masteryHeader = buffer.slice(offset, offset+4)
            offset += 4
            data.masteries = []
            data.masteryPointsTotal = 0
            for(var i=0;i<80;i++) {
                var mastery = buffer.slice(offset, offset+5)
                offset += 5
                if(!helper.allZero(mastery)) {
                    data.masteries.push({
                        tid: 0xFCE - mastery[0],
                        points: mastery[4],
                        full: mastery
                    })
                    data.masteryPointsTotal += mastery[4]
                }
            }
            offset = helper.find(buffer, 0x1e, offset)
            offset += 9
            data.items = []
            for(var i=0;i<9;i++) { // yep 9. why riot?
                var item = buffer.slice(offset, offset + 7)
                offset += 7
                data.items.push({
                    id: helper.parseLeBo(item.slice(0, 4)),
                    slot: item[4],
                    qty:  item[5],
                    full: item
                })
            }
            players.push(data)
            // find next header
            var lastOffset = offset
            var next_a = helper.findSubstr(buffer, new Buffer([0xb3, 0x01, 0xc3, 0x4b]), offset)
            var next_b = helper.findSubstr(buffer, new Buffer([0xb3, 0x00, 0xc3, 0x4b]), offset)
            if(next_a === false) {
                offset = next_b
            }
            else if (next_b === false) {
                offset = next_a
            }
            else  {
                offset = Math.min(next_a, next_b)
            }
            if(offset === false) {
                break;
            }

        }
        cb(players)
    }

    if(callback) {
        console.log('call')
        return fn(callback)
    }
    else {
        return fn
    }
}
