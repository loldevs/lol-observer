var events = require('events')
  , util   = require('util')
  , helper = require('./helper.js')
  , BufferReader = require('../bufferreader')

module.exports = KeyframeParser

function KeyframeParser(options) {
    if(!(this instanceof KeyframeParser)) {
        return new KeyframeParser(options)
    }
}

KeyframeParser.prototype.parse = function(buffer, callback) {
    var reader = new BufferReader(buffer)
    var fn = function (cb) {
        var keyframe = {}
        keyframe.players = []
        keyframe.towers  = []

        reader.seek(0x10)
        keyframe.time = buffer.readFloatLE(1)

        for(var player = 0;player<10;player++) {
            var data = {}
            data.start = reader.offset
            data.header = reader.read(5)
            data.entity = reader.read(4)
            data.playernr = reader.read(4)
            reader.skip(10) // skip unknown bytes

            data.name = reader.readCString(128, 'utf8')
            data.plnameLength = Buffer.byteLength(data.name)
            data.champname = reader.readCString(55, 'utf8')

            data.runesHeader = reader.read(5)
            data.runes = []
            for(var i=0;i<30;i++) {
                data.runes.push(reader.read(4))
            }

            data.masteryHeader = reader.read(8)
            data.masteries = []
            data.masteryPointsTotal = 0
            for(var i=0;i<80;i++) {
                var mastery = reader.read(5)
                if(!helper.allZero(mastery)) {
                    data.masteries.push({
                        tid: mastery[0],
                        points: mastery[4],
                        full: mastery
                    })
                    data.masteryPointsTotal += mastery[4]
                }
            }
            //reader.skipTo(0x1e).skip(9)
            reader.skip(9)
            data.items = []
            for(var i=0;i<9;i++) { // yep 9. why riot?
                var item = reader.read(7)
                data.items.push({
                    id: item.readUInt32LE(0),
                    slot: item[4],
                    qty:  item[5],
                    full: item
                })
            }

            reader.skipTo(0xB3).skip(4)
            data.skills = []
            for(var i=0;i<4;i++) {
                var skillData = reader.read(7)
                data.skills.push({
                    level: skillData[2],
                    data: skillData
                })
            }

            // find end
            var endMarker = Buffer.concat([
                new Buffer([0x00, 0x00, 0x15, 0x01]),
                data.entity
            ])
            //console.log(endMarker)
            //endMarker = new Buffer([0x00, 0x00, 0x15, 0x01])
            try {
                reader.skipTo(endMarker).skip(endMarker.length)
                data.end = reader.offset
            }
            catch(e) {
                console.log('end_marker ', endMarker, ' not found')
            }

            keyframe.players.push(data)
            // find next header
            var next_a = reader.nextIndexOf([0xb3, 0x01, 0xc3, 0x4b])
            var next_b = reader.nextIndexOf([0xb3, 0x00, 0xc3, 0x4b])
            var offset = reader.offset
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
            if(!data.end) {
                console.log(reader.buffer.slice(offset-10, offset))
            }
            reader.seek(offset)
        }

        /*for(var tower = 0;tower<24;tower++) {
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
        }*/
        cb(keyframe)
    }

    if(callback) {
        return fn(callback)
    }
    else {
        return fn
    }
}
