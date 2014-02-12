/*
exports.findSubstr = function(haystack, needle, offset, max) {
    var found = 0
    var start = 0
    if(max) {
        var maxl = Math.min(haystack.length, offset+max)
    }
    else {
        var maxl = haystack.length
    }
    for(var i = offset;i<maxl;i++) {
        if(haystack[i] === needle[found]) {
            if(found === 0) {
                start = i
            }
            found++;
            if(found == needle.length) {
                return start
            }
        }
        else {
            found = 0
            start = 0
        }
    }
    return false
}*/

exports.masteryToTalentId = function(buffer) {
    var row = (buffer[0] >> 0x04) - 3
    var col = (buffer[0]  & 0x0F)

    var tree = (buffer[1] - 0x74)  // 0 off, 1 def, 2 util

    //console.log('row', row, 'col', col, 'tree', tree)
    return 4100 + tree * 100 + row * 10 + col
}

exports.findSubstr = function(haystack, needle, offset) {
    var found = 0
    var start = 0
    var needlen = needle.length
    var maxl = haystack.length - needlen
    for(var i = offset;i<maxl;i++) {
        if( equals(haystack.slice(i, i+needlen), needle) ) {
            return i
        }
    }
    return false

    function equals(bufa, bufb) {
        if(bufa.length !== bufb.length) {
            return false
        }

        for(var i=0;i<bufa.length;i++) {
            if(bufa[i] !== bufb[i]) {
                return false
            }
        }
        return true
    }
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

exports.parseLeBo = function(buffer) {
    var value = 1
    var total = 0
    for(var i=0;i<buffer.length;i++) {
        total += buffer[i] * value
        value *= 256
    }
    return total
}
