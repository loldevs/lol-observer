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
        var keyframe = {}
        keyframe.players = []
        keyframe.towers  = []
        keyframe.time = buffer.readFloatLE(1)

        for(var player = 0;player<10;player++) {
            var data = {}
            data.start = offset
            data.header = buffer.slice(offset, offset + 4)
            offset += 5
            data.entity = buffer.slice(offset, offset + 4)
            offset += 4
            data.playernr = buffer.slice(offset, offset + 4)
            offset += 4
            offset += 10// skip unknown bytes
            data.name = buffer.slice(offset, offset + 128)
            offset += 128
            data.champname = buffer.slice(offset, offset + 55)
            offset += 55

            data.plnameLength = helper.find(data.name, 0x00)
            data.rubish = data.name.slice(0x00, data.plnameLength)
            data.name = helper.toString(data.name)
            data.champname = helper.toString(data.champname)

            data.runesHeader = buffer.slice(offset, offset + 5)
            offset += 5
            data.runes = []
            for(var i=0;i<30;i++) {
                data.runes.push(buffer.slice(offset, offset+4))
                offset += 4
            }
            var tmp = offset
            //offset = helper.findSubstr(buffer, new Buffer([0xa8, 0x6e, 0x49, 0x06]), offset)
            /*data.masteryOffset = offset-tmp
            data.masteryOffsetContents = buffer.slice(tmp, offset)
            data.masteryHeader = buffer.slice(offset, offset+4)
            console.log(buffer.slice(offset, 20))*/
            offset += 8
            data.masteries = []
            data.masteryPointsTotal = 0
            for(var i=0;i<80;i++) {
                var mastery = buffer.slice(offset, offset+5)
                offset += 5
                if(!helper.allZero(mastery)) {
                    data.masteries.push({
                        tid: helper.masteryToTalentId(mastery),
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
                    id: item.readUInt32LE(0),
                    slot: item[4],
                    qty:  item[5],
                    full: item
                })
            }

            offset = helper.findSubstr(buffer, new Buffer([0xB3, 0x00, 0x03, 0x15]), offset)
            offset += 4
            data.skills = []
            for(var i=0;i<4;i++) {
                var skillData = buffer.slice(offset, offset+7)
                offset += 7
                data.skills.push({
                    level: skillData[2],
                    data: skillData
                })
            }

            // find end
            var endMarker = Buffer.concat([
                new Buffer([0x00, 0x00, 0x15, 0x01]),
                data.entity,
                new Buffer([0x00])
            ])
            //console.log(endMarker)
            //endMarker = new Buffer([0x00, 0x00, 0x15, 0x01])
            var end = helper.findSubstr(buffer, endMarker, offset, 1400)
            data.end = end + 9

            keyframe.players.push(data)
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

        for(var tower = 0;tower<24;tower++) {
            offset = helper.findSubstr(buffer, new Buffer([0x00, 0x4A, 0x9C]), offset)
            if(offset === false) {
                break
            }
            offset -= 1

            if(buffer[offset] === 0x93) {
                offset += 3
            }
            var twr = {}
            offset += 5
            twr.entity = buffer.slice(offset, offset+4)
            offset += 5
            twr.name = helper.toString(buffer.slice(offset, offset+0x40))
            offset += 0x40

            //there might be dragons, skip them
            twr.unknown = buffer.slice(offset, offset + 0x05)
            offset += 0x05

            twr.itemHeader = buffer.slice(offset, offset+7)
            offset += 0x07
            twr.items = []
            for(var i=0;i<9;i++) { // yep 9. why riot?
                var item = buffer.slice(offset, offset + 7)
                offset += 7
                twr.items.push({
                    id: item.readUInt32LE(0),
                    slot: item[4],
                    qty:  item[5],
                    full: item
                })
            }
            twr.padding = buffer.slice(offset, offset+0x24)
            keyframe.towers.push(twr)
        }
        cb(keyframe)
    }

    if(callback) {
        return fn(callback)
    }
    else {
        return fn
    }
}
