var ChunkInterface = require('./chunkinterface')
  , util   = require('util')

module.exports = KeyFrame
util.inherits(KeyFrame, ChunkInterface)

function KeyFrame(game, id) {
    ChunkInterface.call(this, game, id)
    this.isKeyFrame = true
}

KeyFrame.prototype.getNextChunkId = function() {
    return this.info.nextChunkId
}


KeyFrame.prototype.downloadUrl = function() {
    return this.game.baseUrl + 'consumer/getKeyFrame/' + this.game.region + '/' + this.game.id + '/' + this.id + '/token'
}
