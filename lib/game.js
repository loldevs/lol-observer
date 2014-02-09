var request = require('request')
  , moment  = require('moment')
  , http    = require('http')
  , zlib    = require('zlib')
  , crypto  = require('crypto')
  , mkdirp  = require('mkdirp')
  , fs      = require('fs')
  , helpers = require('./helper.js')
  , co      = require('co')
  , util    = require('util')
  , events  = require('events')
  , KeyFrame = require('./keyframe.js')
  , Chunk    = require('./chunk.js')

module.exports = Game

util.inherits(Game, events.EventEmitter)

var mapIds = {
    1: "Summoner's Rift"
}

function Game(info, baseUrl) {

    events.EventEmitter.call(this)

    this.info = info
    this.baseUrl = baseUrl

    this.id        = info.gameId
    this.region    = info.platformId

    if(info.gameStartTime) {
        this.startTime = new Date(info.gameStartTime)
    }
    if(info.mapId) {
        this.map       = mapIds[info.mapId] || 'unkown(#' + info.mapId + ')'
    }
    this.mode      = info.gameMode || undefined
    this.type      = info.gameType || undefined
    this.summoners = info.participants || undefined
    this.banned    = info.bannedChampions || undefined
    this.createTime = undefined

    this.biggestKeyFrameId = 0
    this.biggestChunkId    = 0

    this.chunks = []
    this.keyframes = []

    this.obsKey = undefined
    if(info.obsKey) {
        this.obsKey = info.obsKey
    } else if(info.observers) {
        this.obsKey = info.observers.encryptionKey || undefined
    }
    if(this.obsKey) {
        this.cryptoKey = decrypt(this.id, this.obsKey)
    }
}

Game.prototype.getMetadata = function(cb) {
    var url = this.baseUrl + 'consumer/getGameMetaData/' + this.region + '/' + this.id + '/1/token'
    cb = cb || function() {}
    request.get(url, function(err, res, body) {
        if(err) {
            return cb(err)
        }
        try {
            var data = JSON.parse(body)
        } catch(e) {
            console.error(e)
            console.error(body)
            return
        }
        this.readMetadata(data)
        cb(null, data, this)
    }.bind(this))
}

Game.prototype.readMetadata = function(data) {
    this.startTime  = helpers.parseRiotTime(data.startTime)
    this.createTime = helpers.parseRiotTime(data.createTime)
    this.ended      = !!data.gameEnded
    for(var i=0;i<data.pendingAvailableChunkInfo.length;i++) {
        //console.log(chunkInfo)
        var chunkInfo = data.pendingAvailableChunkInfo[i]
        if(!this.chunkStatus[chunkInfo.id]) {
            this.chunkStatus[chunkInfo.id] = {
                id: chunkInfo.id,
                duration: chunkInfo.duration,
                time: helpers.parseRiotTime(chunkInfo.receivedTime),
                status: undefined
            }
        }
    }
}

Game.prototype.getLastChunkInfo = function(cb) {
    var url = this.baseUrl + 'consumer/getLastChunkInfo/' + this.region + '/' + this.id + '/1/token'
    cb = cb || function() {}
    request.get(url, function(err, res, body) {

        if(err) {
            return cb(err)
        }
        try {
            var data = JSON.parse(body)
        } catch(e) {
            console.error(e)
            console.error(body)
            return
        }
        cb(null, data, this)
    }.bind(this))
}

Game.prototype.startSpectate = function() {
    this.pollForChunk()
}

Game.prototype.pollForChunk = co(function *() {
    var result = yield this.getLastChunkInfo.bind(this)
    var chunkdata = result[0]
    if(chunkdata.keyFrameId > this.biggestKeyFrameId) {
        var kf = new KeyFrame(this, chunkdata.keyFrameId, chunkdata)
        this.biggestKeyFrameId = chunkdata.keyFrameId
        this.keyframes[chunkdata.keyFrameId] = kf
        this.emit('keyframe.available', kf)
    }
    if(chunkdata.chunkId > this.biggestChunkId) {
        var chunk = new Chunk(this, chunkdata.chunkId, chunkdata)
        this.biggestChunkId = chunkdata.chunkId
        this.chunks[chunkdata.chunkId] = chunk
        this.emit('chunk.available', chunk)

        if(chunkdata.endGameChunkId === chunkdata.chunkId) {
            this.ended = true
            this.emit('end')
        }
    }
    setTimeout(this.pollForChunk.bind(this), chunkdata.nextAvailableChunk)
})

/*
Game.prototype.startDownload = co(function *(outputDirectory) {

    var result = yield this.getLastChunkInfo.bind(this)
    var chunkdata = result[0]
    var chunk = this.chunkStatus[chunkdata.chunkId]
    if(chunk.status === undefined) {
        this.downloadChunk(outputDirectory, chunk.id)
        console.log('downloadChunk', chunk.id, outputDirectory, chunk)
    }
    if(chunkdata.endGameChunkId !== chunkdata.chunkId) {
        setTimeout(this.startDownload.bind(this, outputDirectory), chunkdata.nextAvailableChunk)
    }
})*/

Game.prototype.downloadChunk = co(function *(dir, id) {
    try {
        yield mkdirp.bind(null, dir + '/chunks')
    }
    catch (err) {
        return console.error(err)
    }
    var ws       = fs.createWriteStream(dir + '/chunks/' + id)
    var decipher = crypto.createDecipheriv('bf-ecb', this.cryptoKey, "")
    var gunzip   = zlib.createGunzip()
    var url      = this.baseUrl + 'consumer/getGameDataChunk/' + this.region + '/' + this.id + '/' + id + '/token'

    console.log('[', id, '] GET ', url)
    var req = http.request(url, function(res) {
        console.log('[', id, ']', res.statusCode)
        if(res.statusCode !== 200) {
            console.log('ERR[', id, '] HTTP:', res.statusCode, res.headers)
            return;
        }
        res.pipe(decipher).pipe(gunzip).pipe(ws)
        gunzip.on('error', function(err) {
            console.log('ERR[', id, '] GZIP:', err)
        })
        ws.on('finish', function() {
            console.log('[', id, '] done')
            this.chunkStatus[id].status = 'done'
        }.bind(this))
    }.bind(this))
    req.on('error', function(err) {
            console.log('ERR[', id, '] HTTP:', err)
    })
    req.end();
})

function decrypt(pass, data) {
    if(!Buffer.isBuffer(pass)) {
        pass  = new Buffer(pass.toString());
    }
    var decipher  = crypto.createDecipheriv('bf-ecb', pass, "")
    var inBuf = new Buffer(data, 'base64');
    decipher.write(inBuf);
    //decipher.end();
    return decipher.read();
}


