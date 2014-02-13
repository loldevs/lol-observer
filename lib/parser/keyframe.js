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

KeyframeParser.prototype.readPlayer = function(reader) {
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
        return false
    }
    if(!data.end) {
        console.log(reader.buffer.slice(offset-10, offset))
    }
    reader.seek(offset)

    return data
}

KeyframeParser.prototype.readTower = function(reader) {
    try {
        reader.skipTo([0x00, 0x4A, 0x9C])
    }
    catch(e) {
        if(e.err === 'NOT_FOUND') {
            return false
        }
        throw e
    }
    var tower = {}
    reader.skip(-1) // hack, we need the byte BEFORE the substr

    if(reader.byteValue() === 0x93) {
        reader.skip(3)
    }
    reader.skip(5)
    tower.entity = reader.read(0x04)
    tower.name = reader.skip(1).readCString(0x40)

    //there might be dragons
    tower.unknown    = reader.read(0x05)

    // items
    tower.itemHeader = reader.read(0x07)
    tower.items      = this.readItems(reader)

    return tower
}

KeyframeParser.prototype.readItems = function(reader) {
    var items = []
    for(var i=0;i<9;i++) { // yep 9. why riot?
        var item = reader.read(7)
        items.push({
            id: item.readUInt32LE(0),
            slot: item[4],
            qty:  item[5],
            full: item
        })
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
        reader.seek(0x10)

        // players
        for(var pnr=0;pnr<10;pnr++) {
            var player = this.readPlayer(reader)
            if(!player) {
                break
            }
            keyframe.players.push(player)
        }
        // towers
        for(var tnr=0;tnr<24;tnr++) {
            var tower = this.readTower(reader)
            if(!tower) {
                break
            }
            keyframe.towers.push(tower)
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
