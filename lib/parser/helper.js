var bufferEquals = require('buffer-equal')

exports.masteryToTalentId = function(buffer) {
    var row = (buffer[0] >> 0x04) - 3
    var col = (buffer[0]  & 0x0F)

    var tree = (buffer[1] - 0x74)  // 0 off, 1 def, 2 util

    return 4100 + tree * 100 + row * 10 + col
}

exports.findSubstr = function(haystack, needle, offset) {
    var needlen = needle.length
    var maxl = haystack.length - needlen
    if(!Buffer.isBuffer(needle)) {
        needle = new Buffer(needle)
    }
    for(var i = offset;i<maxl;i++) {
        if( haystack[i] === needle[0] &&
            bufferEquals(haystack.slice(i, i+needlen), needle) ) {
            return i
        }
    }
    return false
}

exports.find = function(haystack, needle, offset) {
    offset = offset || 0
    for(var i = offset;i<haystack.length;i++) {
        if(haystack[i] === needle) {
            return i
        }
    }
    return false
}

exports.toString = function(buffer) {
    var end = exports.find(buffer, 0x00)
    return buffer.slice(0x00, end).toString('utf-8')
}

exports.allZero = function(buffer) {
    for(var i=0;i<buffer.length;i++) {
        if(buffer[i] !== 0x00) return false
    }
    return true
}