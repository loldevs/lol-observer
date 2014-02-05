var events = require('events')
  , util   = require('util')
  , crypto = require('crypto')
  , http   = require('http')
  , zlib   = require('zlib')
  , stream = require('stream')
  , debug  = require('debug')


module.exports = ChunkInterface

util.inherits(ChunkInterface, events.EventEmitter)

function ChunkInterface(game, id, chunkinfo) {
    events.EventEmitter.call(this)
    this.game = game
    this.id   = id
    this.info = chunkinfo
    this.isKeyFrame = false
}

ChunkInterface.prototype.getNextChunkId = function() {
    return this.id + 1
}

ChunkInterface.prototype.downloadUrl = function() {
    return this.game.baseUrl + 'consumer/getGameDataChunk/' + this.game.region + '/' + this.game.id + '/' + this.id + '/token'
}

ChunkInterface.prototype.download = function () {
    var id       = this.id
    var decipher = crypto.createDecipheriv('bf-ecb', this.game.cryptoKey, "")
    var gunzip   = zlib.createGunzip()
    var url      = this.downloadUrl()
    var ps       = new stream.PassThrough()

    gunzip.on('error', function(err) {
        debug('ERR[' + id + '] GZIP: ' + err)
        ps.emit('error', err)
    })
    gunzip.on('end', function() {
        debug('['+id+'] DONE')
        ps.emit('done')
    })
    decipher.on('error', function(err) {
        debug('ERR[' + id + '] DECRYPT: ' + err)
        ps.emit('error', err)
    })
    debug('[' + id + '] GET ' + url)
    var req = http.request(url, function(res) {
        debug('[', id, ']', res.statusCode)
        if(res.statusCode !== 200) {
            debug('ERR[' + id + '] HTTP: ' + res.statusCode)
            return;
        }
        res.pipe(decipher).pipe(gunzip).pipe(ps)
    })
    req.on('error', function(err) {
            debug('ERR[' + id + '] HTTP: ' + err)
            ps.emit('error', err)
    })
    req.end();

    return ps
}
