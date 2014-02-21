var helper = require('./parser/helper')
  , util   = require('util')

module.exports = BufferReader

function BufferReader(buffer) {
    this.buffer = buffer
    this.offset = 0
}

BufferReader.prototype.skip = function(bytes) {
    this.offset += bytes
    return this
}

BufferReader.prototype.skipTo = function(search) {
    var next = this.nextIndexOf(search)
    if(!next) {
        var err = new Error('search "' + search + '" not found in buffer')
        err.err = 'NOT_FOUND'
        throw err
    }
    this.offset = next
    return this
}

BufferReader.prototype.seek = function(offset) {
    if(this.offset > offset) {
        console.warn('backward seek (%s -> %s)', this.offset, offset)
    }
    this.offset = offset
    return this
}

BufferReader.prototype.read = function(bytes) {
    var slice = this.buffer.slice(this.offset, this.offset+bytes)
    this.offset += bytes
    return slice
}

BufferReader.prototype.byteValue = function() {
    return this.buffer[this.offset]
}

BufferReader.prototype.readCString = function(bytes, encoding) {
    var end = this.nextIndexOf(0x00) || this.offset+bytes
    var slice = this.buffer.slice(this.offset, end)
    var str = slice.toString(encoding)
    this.offset += bytes
    return str
}

BufferReader.prototype.readFloatLE = function() {
    var fl = this.buffer.readFloatLE(this.offset)
    this.offset += 4
    return fl
}

BufferReader.prototype.nextIndexOf = function(search) {
    if(util.isArray(search) || Buffer.isBuffer(search)) {
        return helper.findSubstr(this.buffer, search, this.offset)
    }
    else {
        for(var i = this.offset;i<this.buffer.length;i++) {
            if(this.buffer[i] === search) {
                return i
            }
        }
        return false
    }
}
