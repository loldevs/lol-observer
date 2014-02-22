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

KeyframeParser.prototype.readPlayer = function *(reader) {
    var hasNext = true
    var possibleHeaders = [
        [0xb3, 0x01, 0xc3, 0x4b, 0x00],
        [0xb3, 0x00, 0xc3, 0x4b, 0x00],
        [0x93, 0x01, 0xC3, 0x4B, 0x00, 0x00, 0x00, 0x00],
        [0x93, 0x00, 0xC3, 0x4B, 0x00, 0x00, 0x00, 0x00]
    ]
    do {
        var data = {}
        data.start = reader.offset
        if(reader.buffer[reader.offset] === 0xb3) {
            data.header = reader.read(5)
        }
        else if(reader.buffer[reader.offset] === 0x93) {
            data.header = reader.read(8)
        }
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
                    tid: helper.masteryToTalentId(mastery),
                    points: mastery[4],
                    full: mastery
                })
                data.masteryPointsTotal += mastery[4]
            }
        }
        //reader.skipTo(0x1e).skip(9)
        reader.skip(9)
        data.items = this.readItems(reader)

        reader.skipTo([0xB3, 0x00, 0x03, 0x15]).skip(4)
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
        try {
            reader.skipTo(endMarker).skip(endMarker.length)
            data.end = reader.offset
            //console.log('end marker for (%s) found at ', data.entity[0].toString(16), data.end)
        }
        catch(e) {
            console.log('end_marker ', endMarker, ' not found')
        }

        // find next header
        var min = false
        for(var h=0;h<possibleHeaders.length;h++) {
            var nextPos = reader.nextIndexOf(possibleHeaders[h])
            if(nextPos !== false && (min === false || nextPos < min)) {
                min = nextPos
            }
        }
        var offset = min
        if(offset === false) {
            //console.log(reader.buffer.slice(reader.offset-20, reader.offset+10))
            hasNext = false
        }
        if(hasNext) {
            reader.seek(offset)
        }
        yield data

    } while(hasNext)
}

KeyframeParser.prototype.readTower = function *(reader) {
    var hasNext = true
    var lastStart = undefined
    do {
        try {
            reader.skipTo([0x4A, 0x9C, 0x01])
        }
        catch(e) {
            hasNext = false
            break
        }
        var tower = {}
        reader.skip(-2) // hack, we need the byte BEFORE the substr
        tower.start = reader.offset
        tower.offset = lastStart ? tower.start - lastStart : 0
        lastStart = tower.start
        if(reader.byteValue() === 0x93) {
            reader.skip(3)
            tower.headerLength = 8
        } else {
            tower.headerLength = 5
        }
        reader.skip(5)
        tower.entity = reader.read(0x04)
        tower.name = reader.skip(1).readCString(0x40)

        //there might be dragons
        tower.unknown    = reader.read(0x05)

        // items
        tower.itemHeader = reader.read(0x07)
        tower.items      = this.readItems(reader)
        tower.end = reader.offset
        yield tower
    } while(hasNext)
}

KeyframeParser.prototype.readItems = function(reader) {
    var items = []
    for(var i=0;i<9;i++) { // yep 9. why riot?
        var item = reader.read(7)
        if(item.readUInt32LE(0) === 0 || item.readUInt32LE(0) === 2001)  {
            //continue
        }
        items.push({
            id: item.readUInt32LE(0),
            slot: item[4],
            qty:  item[5],
           // full: item
        })
    }
    for(var i=0;i<9;i++) {
        var cd = reader.readFloatLE()
        //console.log(reader.offset)
        items[i].cooldown = cd
    }
    return items
}

KeyframeParser.prototype.parse = function(buffer, callback) {
    var reader = new BufferReader(buffer)
    var fn = function (cb) {
        var keyframe = {
            players: [],
            towers:  [],
        }

        reader.seek(0x01)
        keyframe.time = reader.readFloatLE()
        keyframe.byteSize = reader.buffer.length
        reader.seek(0x10)

        // players
        var iter = this.readPlayer(reader)
        var player
        while(player = iter.next()) {
            if(player.done) {
                break
            }
            keyframe.players.push(player.value)
        }
        // towers
        var iter = this.readTower(reader)
        var tower
        while(tower = iter.next()) {
            if(tower.done) {
                break
            }
            keyframe.towers.push(tower.value)
        }
        cb(keyframe)
    }.bind(this)

    if(callback) {
        return fn(callback)
    }
    else {
        return fn
    }
}
