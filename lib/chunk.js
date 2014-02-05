var ChunkInterface = require('./chunkinterface')
  , util   = require('util')

module.exports = Chunk
util.inherits(Chunk, ChunkInterface)

function Chunk(game, id) {
    ChunkInterface.call(this, game, id)
}
