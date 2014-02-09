exports.findSubstr = function(haystack, needle, offset) {
    var needlen = needle.length
    var maxl = haystack.length - needlen
    for(var i = offset;i<maxl;i++) {
        if( haystack[i] === needle[0] &&
            bufferEquals(haystack.slice(i, i+needlen), needle) ) {
            return i
        }
    }
    return false
}

exports.bufferEquals = function bufferEquals(a, b) {
    if(a.length !== bufa.length) {
        return false
    }

    for(var i=0;i<a.length;i++) {
        if(a[i] !== bufa[i]) {
            return false
        }
    }
    return true
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
