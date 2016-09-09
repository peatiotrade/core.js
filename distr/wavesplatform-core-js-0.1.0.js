// Blake2B in pure Javascript
// Adapted from the reference implementation in RFC7693
// Ported to Javascript by DC - https://github.com/dcposch

/* util */
var ERROR_MSG_INPUT = 'Input must be an string, Buffer or Uint8Array'

// For convenience, let people hash a string, not just a Uint8Array
function normalizeInput (input) {
    var ret
    if (input instanceof Uint8Array) {
        ret = input
    } else if (input instanceof Buffer) {
        ret = new Uint8Array(input)
    } else if (typeof (input) === 'string') {
        ret = new Uint8Array(new Buffer(input, 'utf8'))
    } else {
        throw new Error(ERROR_MSG_INPUT)
    }
    return ret
}

// Converts a Uint8Array to a hexadecimal string
// For example, toHex([255, 0, 255]) returns "ff00ff"
function toHex (bytes) {
    return Array.prototype.map.call(bytes, function (n) {
        return (n < 16 ? '0' : '') + n.toString(16)
    }).join('')
}

// Converts any value in [0...2^32-1] to an 8-character hex string
function uint32ToHex (val) {
    return (0x100000000 + val).toString(16).substring(1)
}

// For debugging: prints out hash state in the same format as the RFC
// sample computation exactly, so that you can diff
function debugPrint (label, arr, size) {
    var msg = '\n' + label + ' = '
    for (var i = 0; i < arr.length; i += 2) {
        if (size === 32) {
            msg += uint32ToHex(arr[i]).toUpperCase()
            msg += ' '
            msg += uint32ToHex(arr[i + 1]).toUpperCase()
        } else if (size === 64) {
            msg += uint32ToHex(arr[i + 1]).toUpperCase()
            msg += uint32ToHex(arr[i]).toUpperCase()
        } else throw new Error('Invalid size ' + size)
        if (i % 6 === 4) {
            msg += '\n' + new Array(label.length + 4).join(' ')
        } else if (i < arr.length - 2) {
            msg += ' '
        }
    }
    console.log(msg)
}

// For performance testing: generates N bytes of input, hashes M times
// Measures and prints MB/second hash performance each time
function testSpeed (hashFn, N, M) {
    var startMs = new Date().getTime()

    var input = new Uint8Array(N)
    for (var i = 0; i < N; i++) {
        input[i] = i % 256
    }
    var genMs = new Date().getTime()
    console.log('Generated random input in ' + (genMs - startMs) + 'ms')
    startMs = genMs

    for (i = 0; i < M; i++) {
        var hashHex = hashFn(input)
        var hashMs = new Date().getTime()
        var ms = hashMs - startMs
        startMs = hashMs
        console.log('Hashed in ' + ms + 'ms: ' + hashHex.substring(0, 20) + '...')
        console.log(Math.round(N / (1 << 20) / (ms / 1000) * 100) / 100 + ' MB PER SECOND')
    }
}


/********/

// 64-bit unsigned addition
// Sets v[a,a+1] += v[b,b+1]
// v should be a Uint32Array
function ADD64AA (v, a, b) {
    var o0 = v[a] + v[b]
    var o1 = v[a + 1] + v[b + 1]
    if (o0 >= 0x100000000) {
        o1++
    }
    v[a] = o0
    v[a + 1] = o1
}

// 64-bit unsigned addition
// Sets v[a,a+1] += b
// b0 is the low 32 bits of b, b1 represents the high 32 bits
function ADD64AC (v, a, b0, b1) {
    var o0 = v[a] + b0
    if (b0 < 0) {
        o0 += 0x100000000
    }
    var o1 = v[a + 1] + b1
    if (o0 >= 0x100000000) {
        o1++
    }
    v[a] = o0
    v[a + 1] = o1
}

// Little-endian byte access
function B2B_GET32 (arr, i) {
    return (arr[i] ^
    (arr[i + 1] << 8) ^
    (arr[i + 2] << 16) ^
    (arr[i + 3] << 24))
}

// G Mixing function
// The ROTRs are inlined for speed
function B2B_G (a, b, c, d, ix, iy) {
    var x0 = m[ix]
    var x1 = m[ix + 1]
    var y0 = m[iy]
    var y1 = m[iy + 1]

    ADD64AA(v, a, b) // v[a,a+1] += v[b,b+1] ... in JS we must store a uint64 as two uint32s
    ADD64AC(v, a, x0, x1) // v[a, a+1] += x ... x0 is the low 32 bits of x, x1 is the high 32 bits

    // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
    var xor0 = v[d] ^ v[a]
    var xor1 = v[d + 1] ^ v[a + 1]
    v[d] = xor1
    v[d + 1] = xor0

    ADD64AA(v, c, d)

    // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
    xor0 = v[b] ^ v[c]
    xor1 = v[b + 1] ^ v[c + 1]
    v[b] = (xor0 >>> 24) ^ (xor1 << 8)
    v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8)

    ADD64AA(v, a, b)
    ADD64AC(v, a, y0, y1)

    // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
    xor0 = v[d] ^ v[a]
    xor1 = v[d + 1] ^ v[a + 1]
    v[d] = (xor0 >>> 16) ^ (xor1 << 16)
    v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16)

    ADD64AA(v, c, d)

    // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
    xor0 = v[b] ^ v[c]
    xor1 = v[b + 1] ^ v[c + 1]
    v[b] = (xor1 >>> 31) ^ (xor0 << 1)
    v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1)
}

// Initialization Vector
var BLAKE2B_IV32 = new Uint32Array([
    0xF3BCC908, 0x6A09E667, 0x84CAA73B, 0xBB67AE85,
    0xFE94F82B, 0x3C6EF372, 0x5F1D36F1, 0xA54FF53A,
    0xADE682D1, 0x510E527F, 0x2B3E6C1F, 0x9B05688C,
    0xFB41BD6B, 0x1F83D9AB, 0x137E2179, 0x5BE0CD19
])

var SIGMA8 = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
    11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
    7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
    9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
    2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
    12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
    13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
    6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
    10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3
]

// These are offsets into a uint64 buffer.
// Multiply them all by 2 to make them offsets into a uint32 buffer,
// because this is Javascript and we don't have uint64s
var SIGMA82 = new Uint8Array(SIGMA8.map(function (x) { return x * 2 }))

// Compression function. 'last' flag indicates last block.
// Note we're representing 16 uint64s as 32 uint32s
var v = new Uint32Array(32)
var m = new Uint32Array(32)
function blake2b_compress (ctx, last) {
    var i = 0

    // init work variables
    for (i = 0; i < 16; i++) {
        v[i] = ctx.h[i]
        v[i + 16] = BLAKE2B_IV32[i]
    }

    // low 64 bits of offset
    v[24] = v[24] ^ ctx.t
    v[25] = v[25] ^ (ctx.t / 0x100000000)
    // high 64 bits not supported, offset may not be higher than 2**53-1

    // last block flag set ?
    if (last) {
        v[28] = ~v[28]
        v[29] = ~v[29]
    }

    // get little-endian words
    for (i = 0; i < 32; i++) {
        m[i] = B2B_GET32(ctx.b, 4 * i)
    }

    // twelve rounds of mixing
    // uncomment the DebugPrint calls to log the computation
    // and match the RFC sample documentation
    // util.debugPrint('          m[16]', m, 64)
    for (i = 0; i < 12; i++) {
        // util.debugPrint('   (i=' + (i < 10 ? ' ' : '') + i + ') v[16]', v, 64)
        B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1])
        B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3])
        B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5])
        B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7])
        B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9])
        B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11])
        B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13])
        B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15])
    }
    // util.debugPrint('   (i=12) v[16]', v, 64)

    for (i = 0; i < 16; i++) {
        ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16]
    }
    // util.debugPrint('h[8]', ctx.h, 64)
}

// Creates a BLAKE2b hashing context
// Requires an output length between 1 and 64 bytes
// Takes an optional Uint8Array key
function blake2b_init (outlen, key) {
    if (outlen === 0 || outlen > 64) {
        throw new Error('Illegal output length, expected 0 < length <= 64')
    }
    if (key && key.length > 64) {
        throw new Error('Illegal key, expected Uint8Array with 0 < length <= 64')
    }

    // state, 'param block'
    var ctx = {
        b: new Uint8Array(128),
        h: new Uint32Array(16),
        t: 0, // input count
        c: 0, // pointer within buffer
        outlen: outlen // output length in bytes
    }

    // initialize hash state
    for (var i = 0; i < 16; i++) {
        ctx.h[i] = BLAKE2B_IV32[i]
    }
    var keylen = key ? key.length : 0
    ctx.h[0] ^= 0x01010000 ^ (keylen << 8) ^ outlen

    // key the hash, if applicable
    if (key) {
        blake2b_update(ctx, key)
        // at the end
        ctx.c = 128
    }

    return ctx
}

// Updates a BLAKE2b streaming hash
// Requires hash context and Uint8Array (byte array)
function blake2b_update (ctx, input) {
    for (var i = 0; i < input.length; i++) {
        if (ctx.c === 128) { // buffer full ?
            ctx.t += ctx.c // add counters
            blake2b_compress(ctx, false) // compress (not last)
            ctx.c = 0 // counter to zero
        }
        ctx.b[ctx.c++] = input[i]
    }
}

// Completes a BLAKE2b streaming hash
// Returns a Uint8Array containing the message digest
function blake2b_final (ctx) {
    ctx.t += ctx.c // mark last block offset

    while (ctx.c < 128) { // fill up with zeros
        ctx.b[ctx.c++] = 0
    }
    blake2b_compress(ctx, true) // final block flag = 1

    // little endian convert and store
    var out = new Uint8Array(ctx.outlen)
    for (var i = 0; i < ctx.outlen; i++) {
        out[i] = ctx.h[i >> 2] >> (8 * (i & 3))
    }
    return out
}

// Computes the BLAKE2B hash of a string or byte array, and returns a Uint8Array
//
// Returns a n-byte Uint8Array
//
// Parameters:
// - input - the input bytes, as a string, Buffer or Uint8Array
// - key - optional key Uint8Array, up to 64 bytes
// - outlen - optional output length in bytes, default 64
function blake2b (input, key, outlen) {
    // preprocess inputs
    outlen = outlen || 64
    input = normalizeInput(input)

    // do the math
    var ctx = blake2b_init(outlen, key)
    blake2b_update(ctx, input)
    return blake2b_final(ctx)
}

// Computes the BLAKE2B hash of a string or byte array
//
// Returns an n-byte hash in hex, all lowercase
//
// Parameters:
// - input - the input bytes, as a string, Buffer, or Uint8Array
// - key - optional key Uint8Array, up to 64 bytes
// - outlen - optional output length in bytes, default 64
function blake2bHex (input, key, outlen) {
    var output = blake2b(input, key, outlen)
    return toHex(output)
}



/******************************************************************************
 * Copyright © 2013-2016 The Nxt Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Nxt software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

var converters = function() {
	var charToNibble = {};
	var nibbleToChar = [];
	var i;
	for (i = 0; i <= 9; ++i) {
		var character = i.toString();
		charToNibble[character] = i;
		nibbleToChar.push(character);
	}

	for (i = 10; i <= 15; ++i) {
		var lowerChar = String.fromCharCode('a'.charCodeAt(0) + i - 10);
		var upperChar = String.fromCharCode('A'.charCodeAt(0) + i - 10);

		charToNibble[lowerChar] = i;
		charToNibble[upperChar] = i;
		nibbleToChar.push(lowerChar);
	}

	return {
		byteArrayToHexString: function(bytes) {
			var str = '';
			for (var i = 0; i < bytes.length; ++i) {
				if (bytes[i] < 0) {
					bytes[i] += 256;
				}
				str += nibbleToChar[bytes[i] >> 4] + nibbleToChar[bytes[i] & 0x0F];
			}

			return str;
		},
		stringToByteArray: function(str) {
			str = unescape(encodeURIComponent(str));

			var bytes = new Array(str.length);
			for (var i = 0; i < str.length; ++i)
				bytes[i] = str.charCodeAt(i);

			return bytes;
		},
		hexStringToByteArray: function(str) {
			var bytes = [];
			var i = 0;
			if (0 !== str.length % 2) {
				bytes.push(charToNibble[str.charAt(0)]);
				++i;
			}

			for (; i < str.length - 1; i += 2)
				bytes.push((charToNibble[str.charAt(i)] << 4) + charToNibble[str.charAt(i + 1)]);

			return bytes;
		},
		stringToHexString: function(str) {
			return this.byteArrayToHexString(this.stringToByteArray(str));
		},
		hexStringToString: function(hex) {
			return this.byteArrayToString(this.hexStringToByteArray(hex));
		},
		checkBytesToIntInput: function(bytes, numBytes, opt_startIndex) {
			var startIndex = opt_startIndex || 0;
			if (startIndex < 0) {
				throw new Error('Start index should not be negative');
			}

			if (bytes.length < startIndex + numBytes) {
				throw new Error('Need at least ' + (numBytes) + ' bytes to convert to an integer');
			}
			return startIndex;
		},
		byteArrayToSignedShort: function(bytes, opt_startIndex) {
			var index = this.checkBytesToIntInput(bytes, 2, opt_startIndex);
			var value = bytes[index];
			value += bytes[index + 1] << 8;
			return value;
		},
		byteArrayToSignedInt32: function(bytes, opt_startIndex) {
			var index = this.checkBytesToIntInput(bytes, 4, opt_startIndex);
			value = bytes[index];
			value += bytes[index + 1] << 8;
			value += bytes[index + 2] << 16;
			value += bytes[index + 3] << 24;
			return value;
		},
		byteArrayToBigInteger: function(bytes, opt_startIndex) {
			var index = this.checkBytesToIntInput(bytes, 8, opt_startIndex);

			var value = new BigInteger("0", 10);

			var temp1, temp2;

			for (var i = 7; i >= 0; i--) {
				temp1 = value.multiply(new BigInteger("256", 10));
				temp2 = temp1.add(new BigInteger(bytes[opt_startIndex + i].toString(10), 10));
				value = temp2;
			}

			return value;
		},
		// create a wordArray that is Big-Endian
		byteArrayToWordArray: function(byteArray) {
			var i = 0,
				offset = 0,
				word = 0,
				len = byteArray.length;
			var words = new Uint32Array(((len / 4) | 0) + (len % 4 == 0 ? 0 : 1));

			while (i < (len - (len % 4))) {
				words[offset++] = (byteArray[i++] << 24) | (byteArray[i++] << 16) | (byteArray[i++] << 8) | (byteArray[i++]);
			}
			if (len % 4 != 0) {
				word = byteArray[i++] << 24;
				if (len % 4 > 1) {
					word = word | byteArray[i++] << 16;
				}
				if (len % 4 > 2) {
					word = word | byteArray[i++] << 8;
				}
				words[offset] = word;
			}
			var wordArray = new Object();
			wordArray.sigBytes = len;
			wordArray.words = words;

			return wordArray;
		},
		// assumes wordArray is Big-Endian
		wordArrayToByteArray: function(wordArray) {
			return converters.wordArrayToByteArrayImpl(wordArray, true);
		},
		wordArrayToByteArrayImpl: function(wordArray, isFirstByteHasSign) {
			var len = wordArray.words.length;
			if (len == 0) {
				return new Array(0);
			}
			var byteArray = new Array(wordArray.sigBytes);
			var offset = 0,
				word, i;
			for (i = 0; i < len - 1; i++) {
				word = wordArray.words[i];
				byteArray[offset++] = isFirstByteHasSign ? word >> 24 : (word >> 24) & 0xff;
				byteArray[offset++] = (word >> 16) & 0xff;
				byteArray[offset++] = (word >> 8) & 0xff;
				byteArray[offset++] = word & 0xff;
			}
			word = wordArray.words[len - 1];
			byteArray[offset++] = isFirstByteHasSign ? word >> 24 : (word >> 24) & 0xff;
			if (wordArray.sigBytes % 4 == 0) {
				byteArray[offset++] = (word >> 16) & 0xff;
				byteArray[offset++] = (word >> 8) & 0xff;
				byteArray[offset++] = word & 0xff;
			}
			if (wordArray.sigBytes % 4 > 1) {
				byteArray[offset++] = (word >> 16) & 0xff;
			}
			if (wordArray.sigBytes % 4 > 2) {
				byteArray[offset++] = (word >> 8) & 0xff;
			}
			return byteArray;
		},
		byteArrayToString: function(bytes, opt_startIndex, length) {
			if (length == 0) {
				return "";
			}

			if (opt_startIndex && length) {
				var index = this.checkBytesToIntInput(bytes, parseInt(length, 10), parseInt(opt_startIndex, 10));

				bytes = bytes.slice(opt_startIndex, opt_startIndex + length);
			}

			return decodeURIComponent(escape(String.fromCharCode.apply(null, bytes)));
		},
		byteArrayToShortArray: function(byteArray) {
			var shortArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			var i;
			for (i = 0; i < 16; i++) {
				shortArray[i] = byteArray[i * 2] | byteArray[i * 2 + 1] << 8;
			}
			return shortArray;
		},
		shortArrayToByteArray: function(shortArray) {
			var byteArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			var i;
			for (i = 0; i < 16; i++) {
				byteArray[2 * i] = shortArray[i] & 0xff;
				byteArray[2 * i + 1] = shortArray[i] >> 8;
			}

			return byteArray;
		},
		shortArrayToHexString: function(ary) {
			var res = "";
			for (var i = 0; i < ary.length; i++) {
				res += nibbleToChar[(ary[i] >> 4) & 0x0f] + nibbleToChar[ary[i] & 0x0f] + nibbleToChar[(ary[i] >> 12) & 0x0f] + nibbleToChar[(ary[i] >> 8) & 0x0f];
			}
			return res;
		},
		/**
		 * Produces an array of the specified number of bytes to represent the integer
		 * value. Default output encodes ints in little endian format. Handles signed
		 * as well as unsigned integers. Due to limitations in JavaScript's number
		 * format, x cannot be a true 64 bit integer (8 bytes).
		 */
		intToBytes_: function(x, numBytes, unsignedMax, opt_bigEndian) {
			var signedMax = Math.floor(unsignedMax / 2);
			var negativeMax = (signedMax + 1) * -1;
			if (x != Math.floor(x) || x < negativeMax || x > unsignedMax) {
				throw new Error(
					x + ' is not a ' + (numBytes * 8) + ' bit integer');
			}
			var bytes = [];
			var current;
			// Number type 0 is in the positive int range, 1 is larger than signed int,
			// and 2 is negative int.
			var numberType = x >= 0 && x <= signedMax ? 0 :
				x > signedMax && x <= unsignedMax ? 1 : 2;
			if (numberType == 2) {
				x = (x * -1) - 1;
			}
			for (var i = 0; i < numBytes; i++) {
				if (numberType == 2) {
					current = 255 - (x % 256);
				} else {
					current = x % 256;
				}

				if (opt_bigEndian) {
					bytes.unshift(current);
				} else {
					bytes.push(current);
				}

				if (numberType == 1) {
					x = Math.floor(x / 256);
				} else {
					x = x >> 8;
				}
			}
			return bytes;

		},
		int32ToBytes: function(x, opt_bigEndian) {
			return converters.intToBytes_(x, 4, 4294967295, opt_bigEndian);
		},
        /**
         * Based on https://groups.google.com/d/msg/crypto-js/TOb92tcJlU0/Eq7VZ5tpi-QJ
         * Converts a word array to a Uint8Array.
         * @param {WordArray} wordArray The word array.
         * @return {Uint8Array} The Uint8Array.
         */
        wordArrayToByteArrayEx: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;

            // Convert
            var u8 = new Uint8Array(sigBytes);
            for (var i = 0; i < sigBytes; i++) {
                var byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                u8[i]=byte;
            }

            return u8;
        },
        /**
         * Converts a Uint8Array to a word array.
         * @param {string} u8Str The Uint8Array.
         * @return {WordArray} The word array.
         */
        byteArrayToWordArrayEx: function (u8arr) {
            // Shortcut
            var len = u8arr.length;

            // Convert
            var words = [];
            for (var i = 0; i < len; i++) {
                words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8);
            }

            return CryptoJS.lib.WordArray.create(words, len);
        }
	}
}();
/******************************************************************************
 * Copyright © 2013-2016 The Nxt Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Nxt software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

var __entityMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': '&quot;',
	"'": '&#39;'
};

String.prototype.escapeHTML = function() {
	return String(this).replace(/[&<>"']/g, function(s) {
		return __entityMap[s];
	});
};

String.prototype.unescapeHTML = function() {
	return String(this).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace('&quot;', '"').replace('&#39;', "'").replace('&#x2F;', "/");
};

String.prototype.nl2br = function() {
	return String(this).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
};

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

Number.prototype.pad = function(size) {
	var s = String(this);
	if (typeof(size) !== "number") {
		size = 2;
	}

	while (s.length < size) {
		s = "0" + s;
	}
	return s;
};

if (typeof Object.keys !== "function") {
	(function() {
		Object.keys = Object_keys;

		function Object_keys(obj) {
			var keys = [],
				name;
			for (name in obj) {
				if (obj.hasOwnProperty(name)) {
					keys.push(name);
				}
			}
			return keys;
		}
	})();
}

//https://github.com/bryanwoods/autolink-js/blob/master/autolink.js
String.prototype['autoLink'] = function () {
	var output = String(this).escapeHTML();
	var pattern = /(^|\s)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
	//noinspection HtmlUnknownTarget
	return output.replace(pattern, "$1<a href='$2' target='_blank'>$2</a>");
};

/******************************************************************************
 * Copyright © 2016 The Waves Developers.                                *
 *                                                                            *
 * See the LICENSE files at                                                   *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Waves software, including this file, may be copied, modified, propagated,  *
 * or distributed except according to the terms contained in the LICENSE      *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @requires {decimal.js}
 */

var Currency = function(data) {
    data = data || {};

    this.roundingMode = Decimal.ROUND_HALF_UP;
    this.displayName = data.displayName;
    this.symbol = data.symbol;
    this.precision = data.precision;
    if (data.roundingMode !== undefined)
        this.roundingMode = data.roundingMode;

    return this;
};

Currency.WAV = new Currency({
    displayName: 'Wave',
    symbol: '',
    precision: 8
});

Currency.BTC = new Currency({
    displayName: 'Bitcoin',
    symbol: 'B',
    precision: 8
});

Currency.USD = new Currency({
    displayName: 'US Dollar',
    symbol: '$',
    precision: 2
});

Currency.EUR = new Currency({
    displayName: 'Euro',
    symbol: '€',
    precision: 2
});

Currency.CNY = new Currency({
    displayName: 'Chinese Yuan',
    symbol: '¥',
    precision: 2
});

var Money = function(amount, currency) {
    if (amount === undefined)
        throw Error('Amount is required');

    if (currency === undefined)
        throw Error('Currency is required');

    this.amount = new Decimal(amount);
    this.currency = currency;

    var integerPart = function (value) {
        return value.trunc();
    };

    var fractionPart = function (value) {
        return value.minus(integerPart(value));
    };

    var format = function (value) {
        return value.toFixed(currency.precision, currency.roundingMode);
    };

    var validateCurrency = function (expected, actual) {
        if (expected.currency !== actual.currency)
            throw Error('Currencies must be the same for operands. Expected: ' +
                expected.currency.displayName + '; Actual: ' + actual.currency.displayName);
    };

    var fromTokensToCoins = function (valueInTokens, currencyPrecision) {
        return valueInTokens.mul(Math.pow(10, currencyPrecision)).trunc();
    };

    var fromCoinsToTokens = function (valueInCoins, currencyPrecision) {
        return valueInCoins.trunc().div(Math.pow(10, currencyPrecision));
    };

    this.formatAmount = function (stripZeroes) {
        if (stripZeroes)
            return this.toTokens().toString();

        return format(this.amount);
    };

    this.formatIntegerPart = function () {
        return integerPart(this.amount).toFixed(0);
    };

    this.formatFractionPart = function () {
        var valueWithLeadingZero = format(fractionPart(this.amount));

        return valueWithLeadingZero.slice(1); // stripping the leading zero
    };

    this.toTokens = function () {
        var result = fromCoinsToTokens(fromTokensToCoins(this.amount, this.currency.precision),
            this.currency.precision);

        return result.toNumber();
    };

    this.toCoins = function () {
        return fromTokensToCoins(this.amount, this.currency.precision).toNumber();
    };

    this.plus = function (money) {
        validateCurrency(this.currency, money.currency);

        return new Money(this.amount.plus(money.amount), this.currency);
    };

    this.minus = function (money) {
        validateCurrency(this.currency, money.currency);

        return new Money(this.amount.minus(money.amount), this.currency);
    };

    this.greaterThan = function (other) {
        validateCurrency(this.currency, other.currency);

        return this.amount.greaterThan(other.amount);
    };

    this.lessThan = function (other) {
        validateCurrency(this.currency, other.currency);

        return this.amount.lessThan(other.amount);
    };

    return this;
};

Money.fromTokens = function (amount, currency) {
    return new Money(amount, currency);
};

Money.fromCoins = function (amount, currency) {
    currency = currency || {};
    if (currency.precision === undefined)
        throw new Error('A valid currency must be provided');

    amount = new Decimal(amount);
    amount = amount.div(Math.pow(10, currency.precision));

    return new Money(amount, currency);
};

// set up decimal to format 0.00000001 as is instead of 1e-8
Decimal.config({toExpNeg: -(Currency.WAV.precision + 1)});


(function() {
    'use strict';

    angular.module('waves.core', [
        'waves.core.services'
    ]);
})();

(function() {
    'use strict';

    angular
        .module('waves.core')
        .constant('constants.core', {
            CLIENT_VERSION: '0.4.1a',
            NODE_ADDRESS: 'http://52.30.47.67:6869',
            NETWORK_NAME: 'devel',
            ADDRESS_VERSION: 1,
            NETWORK_CODE: 'T',
            INITIAL_NONCE: 0
        });

    angular
        .module('waves.core')
        .constant('constants.address', {
            RAW_ADDRESS_LENGTH : 35,
            ADDRESS_PREFIX: '1W',
            MAINNET_ADDRESS_REGEXP: /^[a-zA-Z0-9]{35}$/
        });

    angular
        .module('waves.core')
        .constant('constants.ui', {
            MINIMUM_PAYMENT_AMOUNT : 1e-8,
            MINIMUM_TRANSACTION_FEE : 0.001,
            AMOUNT_DECIMAL_PLACES : 8
        });
})();

(function() {
    'use strict';

    angular.module('waves.core.services', ['waves.core', 'restangular'])
        .run(['Restangular', 'constants.core', function(rest, constants) {
            rest.setBaseUrl(constants.NODE_ADDRESS);
        }]);
})();

//https://github.com/bitcoin/bips/blob/master/bip-0039/bip-0039-wordlists.md
(function() {
    'use strict';

    angular
        .module('waves.core.services')
        .constant('wordList', [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access',
            'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act', 'action',
            'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
            'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent', 'agree', 'ahead', 'aim', 'air',
            'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost',
            'alone', 'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused',
            'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle', 'announce', 'annual',
            'another', 'answer', 'antenna', 'antique', 'anxiety', 'any', 'apart', 'apology', 'appear', 'apple',
            'approve', 'april', 'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around',
            'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault',
            'asset', 'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract',
            'auction', 'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
            'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge', 'bag',
            'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base',
            'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become', 'beef', 'before', 'begin',
            'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit', 'best', 'betray', 'better', 'between',
            'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black', 'blade', 'blame',
            'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush',
            'board', 'boat', 'body', 'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow',
            'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze',
            'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother',
            'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk', 'bullet', 'bundle',
            'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage',
            'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm', 'camera', 'camp', 'can', 'canal', 'cancel',
            'candy', 'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card',
            'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog', 'catch',
            'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census',
            'century', 'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge',
            'chase', 'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child',
            'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle',
            'citizen', 'city', 'civil', 'claim', 'clap', 'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever', 'click',
            'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog', 'close', 'cloth', 'cloud', 'clown', 'club',
            'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut', 'code', 'coffee', 'coil', 'coin', 'collect',
            'color', 'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company', 'concert', 'conduct',
            'confirm', 'congress', 'connect', 'consider', 'control', 'convince', 'cook', 'cool', 'copper', 'copy',
            'coral', 'core', 'corn', 'correct', 'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin',
            'cover', 'coyote', 'crack', 'cradle', 'craft', 'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy',
            'cream', 'credit', 'creek', 'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch',
            'crowd', 'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture',
            'cup', 'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle', 'dad',
            'damage', 'damp', 'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal', 'debate',
            'debris', 'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define',
            'defy', 'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny', 'depart', 'depend',
            'deposit', 'depth', 'deputy', 'derive', 'describe', 'desert', 'design', 'desk', 'despair', 'destroy',
            'detail', 'detect', 'develop', 'device', 'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel',
            'diet', 'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt', 'disagree',
            'discover', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide', 'divorce',
            'dizzy', 'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door',
            'dose', 'double', 'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw', 'dream', 'dress', 'drift', 'drill',
            'drink', 'drip', 'drive', 'drop', 'drum', 'dry', 'duck', 'dumb', 'dune', 'during', 'dust', 'dutch', 'duty',
            'dwarf', 'dynamic', 'eager', 'eagle', 'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology',
            'economy', 'edge', 'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric',
            'elegant', 'element', 'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge',
            'emotion', 'employ', 'empower', 'empty', 'enable', 'enact', 'end', 'endless', 'endorse', 'enemy', 'energy',
            'enforce', 'engage', 'engine', 'enhance', 'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure',
            'enter', 'entire', 'entry', 'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion',
            'error', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil', 'evoke',
            'evolve', 'exact', 'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute', 'exercise',
            'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire', 'explain', 'expose',
            'express', 'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty', 'fade', 'faint', 'faith',
            'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy', 'fantasy', 'farm', 'fashion', 'fat', 'fatal',
            'father', 'fatigue', 'fault', 'favorite', 'feature', 'february', 'federal', 'fee', 'feed', 'feel', 'female',
            'fence', 'festival', 'fetch', 'fever', 'few', 'fiber', 'fiction', 'field', 'figure', 'file', 'film',
            'filter', 'final', 'find', 'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'fit',
            'fitness', 'fix', 'flag', 'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float', 'flock',
            'floor', 'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow', 'food',
            'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward', 'fossil', 'foster', 'found',
            'fox', 'fragile', 'frame', 'frequent', 'fresh', 'friend', 'fringe', 'frog', 'front', 'frost', 'frown',
            'frozen', 'fruit', 'fuel', 'fun', 'funny', 'furnace', 'fury', 'future', 'gadget', 'gain', 'galaxy',
            'gallery', 'game', 'gap', 'garage', 'garbage', 'garden', 'garlic', 'garment', 'gas', 'gasp', 'gate',
            'gather', 'gauge', 'gaze', 'general', 'genius', 'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant',
            'gift', 'giggle', 'ginger', 'giraffe', 'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'glide',
            'glimpse', 'globe', 'gloom', 'glory', 'glove', 'glow', 'glue', 'goat', 'goddess', 'gold', 'good', 'goose',
            'gorilla', 'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape', 'grass',
            'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery', 'group', 'grow', 'grunt', 'guard', 'guess',
            'guide', 'guilt', 'guitar', 'gun', 'gym', 'habit', 'hair', 'half', 'hammer', 'hamster', 'hand', 'happy',
            'harbor', 'hard', 'harsh', 'harvest', 'hat', 'have', 'hawk', 'hazard', 'head', 'health', 'heart', 'heavy',
            'hedgehog', 'height', 'hello', 'helmet', 'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip',
            'hire', 'history', 'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood', 'hope',
            'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub', 'huge', 'human', 'humble',
            'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt', 'husband', 'hybrid', 'ice', 'icon', 'idea',
            'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness', 'image', 'imitate', 'immense', 'immune',
            'impact', 'impose', 'improve', 'impulse', 'inch', 'include', 'income', 'increase', 'index', 'indicate',
            'indoor', 'industry', 'infant', 'inflict', 'inform', 'inhale', 'inherit', 'initial', 'inject', 'injury',
            'inmate', 'inner', 'innocent', 'input', 'inquiry', 'insane', 'insect', 'inside', 'inspire', 'install',
            'intact', 'interest', 'into', 'invest', 'invite', 'involve', 'iron', 'island', 'isolate', 'issue', 'item',
            'ivory', 'jacket', 'jaguar', 'jar', 'jazz', 'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join', 'joke',
            'journey', 'joy', 'judge', 'juice', 'jump', 'jungle', 'junior', 'junk', 'just', 'kangaroo', 'keen', 'keep',
            'ketchup', 'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite', 'kitten',
            'kiwi', 'knee', 'knife', 'knock', 'know', 'lab', 'label', 'labor', 'ladder', 'lady', 'lake', 'lamp',
            'language', 'laptop', 'large', 'later', 'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit',
            'layer', 'lazy', 'leader', 'leaf', 'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend', 'leisure',
            'lemon', 'lend', 'length', 'lens', 'leopard', 'lesson', 'letter', 'level', 'liar', 'liberty', 'library',
            'license', 'life', 'lift', 'light', 'like', 'limb', 'limit', 'link', 'lion', 'liquid', 'list', 'little',
            'live', 'lizard', 'load', 'loan', 'lobster', 'local', 'lock', 'logic', 'lonely', 'long', 'loop', 'lottery',
            'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage', 'lumber', 'lunar', 'lunch', 'luxury', 'lyrics',
            'machine', 'mad', 'magic', 'magnet', 'maid', 'mail', 'main', 'major', 'make', 'mammal', 'man', 'manage',
            'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble', 'march', 'margin', 'marine', 'market',
            'marriage', 'mask', 'mass', 'master', 'match', 'material', 'math', 'matrix', 'matter', 'maximum', 'maze',
            'meadow', 'mean', 'measure', 'meat', 'mechanic', 'medal', 'media', 'melody', 'melt', 'member', 'memory',
            'mention', 'menu', 'mercy', 'merge', 'merit', 'merry', 'mesh', 'message', 'metal', 'method', 'middle',
            'midnight', 'milk', 'million', 'mimic', 'mind', 'minimum', 'minor', 'minute', 'miracle', 'mirror', 'misery',
            'miss', 'mistake', 'mix', 'mixed', 'mixture', 'mobile', 'model', 'modify', 'mom', 'moment', 'monitor',
            'monkey', 'monster', 'month', 'moon', 'moral', 'more', 'morning', 'mosquito', 'mother', 'motion', 'motor',
            'mountain', 'mouse', 'move', 'movie', 'much', 'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom',
            'music', 'must', 'mutual', 'myself', 'mystery', 'myth', 'naive', 'name', 'napkin', 'narrow', 'nasty',
            'nation', 'nature', 'near', 'neck', 'need', 'negative', 'neglect', 'neither', 'nephew', 'nerve', 'nest',
            'net', 'network', 'neutral', 'never', 'news', 'next', 'nice', 'night', 'noble', 'noise', 'nominee',
            'noodle', 'normal', 'north', 'nose', 'notable', 'note', 'nothing', 'notice', 'novel', 'now', 'nuclear',
            'number', 'nurse', 'nut', 'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain', 'obvious',
            'occur', 'ocean', 'october', 'odor', 'off', 'offer', 'office', 'often', 'oil', 'okay', 'old', 'olive',
            'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only', 'open', 'opera', 'opinion', 'oppose',
            'option', 'orange', 'orbit', 'orchard', 'order', 'ordinary', 'organ', 'orient', 'original', 'orphan',
            'ostrich', 'other', 'outdoor', 'outer', 'output', 'outside', 'oval', 'oven', 'over', 'own', 'owner',
            'oxygen', 'oyster', 'ozone', 'pact', 'paddle', 'page', 'pair', 'palace', 'palm', 'panda', 'panel', 'panic',
            'panther', 'paper', 'parade', 'parent', 'park', 'parrot', 'party', 'pass', 'patch', 'path', 'patient',
            'patrol', 'pattern', 'pause', 'pave', 'payment', 'peace', 'peanut', 'pear', 'peasant', 'pelican', 'pen',
            'penalty', 'pencil', 'people', 'pepper', 'perfect', 'permit', 'person', 'pet', 'phone', 'photo', 'phrase',
            'physical', 'piano', 'picnic', 'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink', 'pioneer',
            'pipe', 'pistol', 'pitch', 'pizza', 'place', 'planet', 'plastic', 'plate', 'play', 'please', 'pledge',
            'pluck', 'plug', 'plunge', 'poem', 'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony', 'pool',
            'popular', 'portion', 'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder', 'power',
            'practice', 'praise', 'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price', 'pride',
            'primary', 'print', 'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce', 'profit',
            'program', 'project', 'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public',
            'pudding', 'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase', 'purity', 'purpose',
            'purse', 'push', 'put', 'puzzle', 'pyramid', 'quality', 'quantum', 'quarter', 'question', 'quick', 'quit',
            'quiz', 'quote', 'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio', 'rail', 'rain', 'raise', 'rally',
            'ramp', 'ranch', 'random', 'range', 'rapid', 'rare', 'rate', 'rather', 'raven', 'raw', 'razor', 'ready',
            'real', 'reason', 'rebel', 'rebuild', 'recall', 'receive', 'recipe', 'record', 'recycle', 'reduce',
            'reflect', 'reform', 'refuse', 'region', 'regret', 'regular', 'reject', 'relax', 'release', 'relief',
            'rely', 'remain', 'remember', 'remind', 'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat',
            'replace', 'report', 'require', 'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire',
            'retreat', 'return', 'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich',
            'ride', 'ridge', 'rifle', 'right', 'rigid', 'ring', 'riot', 'ripple', 'risk', 'ritual', 'rival', 'river',
            'road', 'roast', 'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie', 'room', 'rose', 'rotate',
            'rough', 'round', 'route', 'royal', 'rubber', 'rude', 'rug', 'rule', 'run', 'runway', 'rural', 'sad',
            'saddle', 'sadness', 'safe', 'sail', 'salad', 'salmon', 'salon', 'salt', 'salute', 'same', 'sample', 'sand',
            'satisfy', 'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene',
            'scheme', 'school', 'science', 'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub', 'sea',
            'search', 'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek', 'segment', 'select',
            'sell', 'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session', 'settle', 'setup',
            'seven', 'shadow', 'shaft', 'shallow', 'share', 'shed', 'shell', 'sheriff', 'shield', 'shift', 'shine',
            'ship', 'shiver', 'shock', 'shoe', 'shoot', 'shop', 'short', 'shoulder', 'shove', 'shrimp', 'shrug',
            'shuffle', 'shy', 'sibling', 'sick', 'side', 'siege', 'sight', 'sign', 'silent', 'silk', 'silly', 'silver',
            'similar', 'simple', 'since', 'sing', 'siren', 'sister', 'situate', 'six', 'size', 'skate', 'sketch', 'ski',
            'skill', 'skin', 'skirt', 'skull', 'slab', 'slam', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim',
            'slogan', 'slot', 'slow', 'slush', 'small', 'smart', 'smile', 'smoke', 'smooth', 'snack', 'snake', 'snap',
            'sniff', 'snow', 'soap', 'soccer', 'social', 'sock', 'soda', 'soft', 'solar', 'soldier', 'solid',
            'solution', 'solve', 'someone', 'song', 'soon', 'sorry', 'sort', 'soul', 'sound', 'soup', 'source', 'south',
            'space', 'spare', 'spatial', 'spawn', 'speak', 'special', 'speed', 'spell', 'spend', 'sphere', 'spice',
            'spider', 'spike', 'spin', 'spirit', 'split', 'spoil', 'sponsor', 'spoon', 'sport', 'spot', 'spray',
            'spread', 'spring', 'spy', 'square', 'squeeze', 'squirrel', 'stable', 'stadium', 'staff', 'stage', 'stairs',
            'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steel', 'stem', 'step', 'stereo', 'stick', 'still',
            'sting', 'stock', 'stomach', 'stone', 'stool', 'story', 'stove', 'strategy', 'street', 'strike', 'strong',
            'struggle', 'student', 'stuff', 'stumble', 'style', 'subject', 'submit', 'subway', 'success', 'such',
            'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'summer', 'sun', 'sunny', 'sunset', 'super', 'supply',
            'supreme', 'sure', 'surface', 'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain', 'swallow',
            'swamp', 'swap', 'swarm', 'swear', 'sweet', 'swift', 'swim', 'swing', 'switch', 'sword', 'symbol',
            'symptom', 'syrup', 'system', 'table', 'tackle', 'tag', 'tail', 'talent', 'talk', 'tank', 'tape', 'target',
            'task', 'taste', 'tattoo', 'taxi', 'teach', 'team', 'tell', 'ten', 'tenant', 'tennis', 'tent', 'term',
            'test', 'text', 'thank', 'that', 'theme', 'then', 'theory', 'there', 'they', 'thing', 'this', 'thought',
            'three', 'thrive', 'throw', 'thumb', 'thunder', 'ticket', 'tide', 'tiger', 'tilt', 'timber', 'time', 'tiny',
            'tip', 'tired', 'tissue', 'title', 'toast', 'tobacco', 'today', 'toddler', 'toe', 'together', 'toilet',
            'token', 'tomato', 'tomorrow', 'tone', 'tongue', 'tonight', 'tool', 'tooth', 'top', 'topic', 'topple',
            'torch', 'tornado', 'tortoise', 'toss', 'total', 'tourist', 'toward', 'tower', 'town', 'toy', 'track',
            'trade', 'traffic', 'tragic', 'train', 'transfer', 'trap', 'trash', 'travel', 'tray', 'treat', 'tree',
            'trend', 'trial', 'tribe', 'trick', 'trigger', 'trim', 'trip', 'trophy', 'trouble', 'truck', 'true',
            'truly', 'trumpet', 'trust', 'truth', 'try', 'tube', 'tuition', 'tumble', 'tuna', 'tunnel', 'turkey',
            'turn', 'turtle', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two', 'type', 'typical', 'ugly',
            'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undo', 'unfair', 'unfold', 'unhappy',
            'uniform', 'unique', 'unit', 'universe', 'unknown', 'unlock', 'until', 'unusual', 'unveil', 'update',
            'upgrade', 'uphold', 'upon', 'upper', 'upset', 'urban', 'urge', 'usage', 'use', 'used', 'useful', 'useless',
            'usual', 'utility', 'vacant', 'vacuum', 'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor',
            'various', 'vast', 'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb', 'verify', 'version',
            'very', 'vessel', 'veteran', 'viable', 'vibrant', 'vicious', 'victory', 'video', 'view', 'village',
            'vintage', 'violin', 'virtual', 'virus', 'visa', 'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice',
            'void', 'volcano', 'volume', 'vote', 'voyage', 'wage', 'wagon', 'wait', 'walk', 'wall', 'walnut', 'want',
            'warfare', 'warm', 'warrior', 'wash', 'wasp', 'waste', 'water', 'wave', 'way', 'wealth', 'weapon', 'wear',
            'weasel', 'weather', 'web', 'wedding', 'weekend', 'weird', 'welcome', 'west', 'wet', 'whale', 'what',
            'wheat', 'wheel', 'when', 'where', 'whip', 'whisper', 'wide', 'width', 'wife', 'wild', 'will', 'win',
            'window', 'wine', 'wing', 'wink', 'winner', 'winter', 'wire', 'wisdom', 'wise', 'wish', 'witness', 'wolf',
            'woman', 'wonder', 'wood', 'wool', 'word', 'work', 'world', 'worry', 'worth', 'wrap', 'wreck', 'wrestle',
            'wrist', 'write', 'wrong', 'yard', 'year', 'yellow', 'you', 'young', 'youth', 'zebra', 'zero', 'zone', 'zoo'
        ]);
})();

(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('passPhraseService', ['wordList', '$window', function (wordList, $window) {
            this.generate = function () {
                var crypto = $window.crypto || $window.msCrypto;
                var bits = 160;
                var wordCount = 2048;
                var random = new Uint32Array(bits / 32);
                var passPhrase = '';

                crypto.getRandomValues(random);

                var i = 0,
                    l = random.length,
                    n = wordCount,
                    words = [],
                    x, w1, w2, w3;

                for (; i < l; i++) {
                    x = random[i];
                    w1 = x % n;
                    w2 = (((x / n) >> 0) + w1) % n;
                    w3 = (((((x / n) >> 0) / n) >> 0) + w2) % n;

                    words.push(wordList[w1]);
                    words.push(wordList[w2]);
                    words.push(wordList[w3]);
                }

                passPhrase = words.join(' ');

                crypto.getRandomValues(random);

                return passPhrase;
            };
        }]);
})();

(function() {
    'use strict';

    angular
        .module('waves.core.services')
        .service('accountService', ['storageService', function(storageService) {
            this.addAccount = function (accountInfo, onDataUpdatedCallback) {
                storageService.loadState(function (state) {
                    state = state || {};
                    if (!state.accounts)
                        state.accounts = [];

                    state.accounts.push(accountInfo);
                    storageService.saveState(state, onDataUpdatedCallback);
                });
            };

            this.removeAccount = function (accountIndex, onAccountRemovedCallback) {
                storageService.loadState(function (state) {
                    state.accounts.splice(accountIndex, 1);

                    storageService.saveState(state, onAccountRemovedCallback);
                });
            };

            this.getAccounts = function (onAccountsLoadedCallback) {
                storageService.loadState(function (state) {
                    state = state || {};
                    if (!state.accounts)
                        state.accounts = [];

                    onAccountsLoadedCallback(state.accounts);
                });
            };
        }]);
})();

(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('addressService', ['constants.address', 'cryptoService', function (constants, cryptoService) {

            function WaveAddress(rawAddress) {
                if (rawAddress === undefined)
                    throw new Error('Address must be defined');

                this.getRawAddress = function () { return rawAddress; };

                this.getDisplayAddress = function() { return constants.ADDRESS_PREFIX + rawAddress; };
            }

            this.fromDisplayToRaw = function(displayAddress) {
                var address = displayAddress;
                if (address.length > constants.RAW_ADDRESS_LENGTH || address.startsWith(constants.ADDRESS_PREFIX))
                    address = address.substr(constants.ADDRESS_PREFIX.length,
                        address.length - constants.ADDRESS_PREFIX.length);

                return address;
            };

            this.validateRawAddress = function(rawAddress) {
                return constants.MAINNET_ADDRESS_REGEXP.test(rawAddress);
            };

            this.validateDisplayAddress = function(displayAddress) {
                var address = this.fromDisplayToRaw(displayAddress);

                return this.validateRawAddress(address);
            };

            this.fromRawAddress = function(rawAddress) {
                if (!this.validateRawAddress(rawAddress))
                    throw new Error('Raw address is malformed');

                return new WaveAddress(rawAddress);
            };

            this.fromDisplayAddress = function(displayAddress) {
                if (!this.validateDisplayAddress(displayAddress))
                    throw new Error('Display address is malformed');

                return new WaveAddress(this.fromDisplayToRaw(displayAddress));
            };

            this.buildAddress = function (encodedPublicKey) {
                return this.fromRawAddress(cryptoService.buildRawAddress(encodedPublicKey));
            };
        }]);
})();

/**
 * @requires {blake2b-256.js}
 * @requires {Base58.js}
 */
(function() {
    'use strict';

    angular
        .module('waves.core.services')
        .service('cryptoService', ['constants.core', '$window', function(constants, window) {

            var getNetworkIdByte = function() {
                return constants.NETWORK_CODE.charCodeAt(0) & 0xFF;
            };

            var appendUint8Arrays = function(array1, array2) {
                var tmp = new Uint8Array(array1.length + array2.length);
                tmp.set(array1, 0);
                tmp.set(array2, array1.length);
                return tmp;
            };

            var appendNonce = function (originalSeed) {
                // change this is when nonce increment gets introduced
                var nonce = new Uint8Array(converters.int32ToBytes(constants.INITIAL_NONCE, true));

                return appendUint8Arrays(nonce, originalSeed);
            };

            // sha256 accepts messageBytes as Uint8Array or Array
            var sha256 = function (message) {
                var bytes;
                if (typeof(message) == 'string')
                    bytes = converters.stringToByteArray(message);
                else
                    bytes = message;

                var wordArray = converters.byteArrayToWordArrayEx(new Uint8Array(bytes));
                var resultWordArray = CryptoJS.SHA256(wordArray);

                return converters.wordArrayToByteArrayEx(resultWordArray);
            };

            var prepareKey = function (key) {
                var rounds = 1000;
                var digest = key;
                for (var i = 0; i < rounds; i++) {
                    digest = converters.byteArrayToHexString(sha256(digest));
                }

                return digest;
            };

            // blake2b 256 hash function
            this.blake2b = function (input) {
                return blake2b(input, null, 32);
            };

            // keccak 256 hash algorithm
            this.keccak = function(messageBytes) {
                // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
                return keccak_256.array(messageBytes);
                // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
            };

            this.sha256 = sha256;

            this.hashChain = function(noncedSecretPhraseBytes) {
                return this.keccak(this.blake2b(new Uint8Array(noncedSecretPhraseBytes)));
            };

            // Base68 encoding/decoding implementation
            this.base58 = {
                encode: function (buffer) {
                    return Base58.encode(buffer);
                },
                decode: function (string) {
                    return Base58.decode(string);
                }
            };

            this.buildAccountSeedHash = function(seedBytes) {
                var data = appendNonce(seedBytes);
                var seedHash = this.hashChain(data);

                return sha256(Array.prototype.slice.call(seedHash));
            };

            this.buildPublicKey = function (seedBytes) {
                var accountSeedHash = this.buildAccountSeedHash(seedBytes);
                var p = axlsign.generateKeyPair(accountSeedHash);

                return this.base58.encode(p.public);
            };

            this.buildPrivateKey = function (seedBytes) {
                var accountSeedHash = this.buildAccountSeedHash(seedBytes);
                var p = axlsign.generateKeyPair(accountSeedHash);

                return this.base58.encode(p.private);
            };

            this.buildRawAddress = function (encodedPublicKey) {
                var publicKey = this.base58.decode(encodedPublicKey);
                var publicKeyHash = this.hashChain(publicKey);

                var prefix = new Uint8Array(2);
                prefix[0] = constants.ADDRESS_VERSION;
                prefix[1] = getNetworkIdByte();

                var unhashedAddress = appendUint8Arrays(prefix, publicKeyHash.slice(0, 20));
                var addressHash = this.hashChain(unhashedAddress).slice(0, 4);

                return this.base58.encode(appendUint8Arrays(unhashedAddress, addressHash));
            };

            //Returns publicKey built from string
            this.getPublicKey = function(secretPhrase) {
                return this.buildPublicKey(converters.stringToByteArray(secretPhrase));
            };

            //Returns privateKey built from string
            this.getPrivateKey = function(secretPhrase) {
                return this.buildPrivateKey(converters.stringToByteArray(secretPhrase));
            };

            // function accepts buffer with private key and an array with dataToSign
            // returns buffer with signed data
            // 64 randoms bytes are added to the signature
            // method falls back to deterministic signatures if crypto object is not supported
            this.nonDeterministicSign = function(privateKey, dataToSign) {
                var crypto = window.crypto || window.msCrypto;
                var random;
                if (crypto) {
                    random = new Uint8Array(64);
                    crypto.getRandomValues(random);
                }

                var signature = axlsign.sign(privateKey, new Uint8Array(dataToSign), random);

                return this.base58.encode(signature);
            };

            // function accepts buffer with private key and an array with dataToSign
            // returns buffer with signed data
            this.deterministicSign = function(privateKey, dataToSign) {
                var signature = axlsign.sign(privateKey, new Uint8Array(dataToSign));

                return this.base58.encode(signature);
            };

            this.verify = function(senderPublicKey, dataToSign, signatureBytes) {
                return axlsign.verify(senderPublicKey, dataToSign, signatureBytes);
            };

            this.encryptWalletSeed = function (seed, key) {
                var aesKey = prepareKey(key);

                return CryptoJS.AES.encrypt(seed, aesKey);
            };

            this.decryptWalletSeed = function (cipher, key, checksum) {
                var aesKey = prepareKey(key);
                var data = CryptoJS.AES.decrypt(cipher, aesKey);

                var actualChecksum = this.seedChecksum(converters.hexStringToByteArray(data.toString()));
                if (actualChecksum === checksum)
                    return converters.hexStringToString(data.toString());
                else
                    return false;
            };

            this.seedChecksum = function (seed) {
                return converters.byteArrayToHexString(sha256(seed));
            };
        }]);
})();

(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('apiService', ['Restangular', function (rest) {
            var blocksApi = rest.all('blocks');

            this.blocks = {
                height: function() {
                    return blocksApi.get('height');
                },
                last: function() {
                    return blocksApi.get('last');
                },
                list: function (startHeight, endHeight) {
                    return blocksApi.one('seq', startHeight).all(endHeight).getList();
                }
            };

            var addressApi = rest.all('addresses');
            this.address = {
                balance: function (address) {
                    return addressApi.one('balance', address.getRawAddress()).get();
                }
            };

            var transactionApi = rest.all('transactions');
            this.transactions = {
                unconfirmed: function () {
                    return transactionApi.all('unconfirmed').getList();
                },
                list: function (address, max) {
                    max = max || 50;
                    return transactionApi.one('address', address.getRawAddress()).one('limit', max).getList();
                }
            };

            var wavesApi = rest.all('waves');
            this.broadcastPayment = function (signedPaymentTransaction) {
                return wavesApi.all('broadcast-signed-payment').post(signedPaymentTransaction);
            };
        }]);
})();

(function() {
    'use strict';

    angular
        .module('waves.core.services')
        .service('chromeStorageService', [function() {
            var $key = 'WavesAccounts';

            this.saveState = function(state, onSuccessCallback) {
                var json = {};
                json[$key] = state;

                chrome.storage.sync.set(json, onSuccessCallback);
            };

            this.loadState = function(onDataReadCallback) {
                chrome.storage.sync.get($key, function(data) {
                    onDataReadCallback(data[$key]);
                });
            };
        }]);
})();

(function() {
    'use strict';

    angular
        .module('waves.core.services')
        .service('html5StorageService', ['constants.core', '$window', function(constants, window) {
            if (angular.isUndefined(constants.NETWORK_NAME))
                throw new Error('Network name hasn\'t been configured');

            var $key = 'Waves' + constants.NETWORK_NAME;

            this.saveState = function(state, onSuccessCallback) {
                var serialized = angular.toJson(state);

                window.localStorage.setItem($key, serialized);
                if (onSuccessCallback) {
                    onSuccessCallback();
                }
            };

            this.loadState = function(onDataReadCallback) {
                if (!onDataReadCallback)
                    return;

                var data;
                var serialized = window.localStorage.getItem($key);

                if (serialized) {
                    data = angular.fromJson(serialized);
                }

                onDataReadCallback(data);
            };

            this.clear = function(onClearedCallback) {
                window.localStorage.removeItem($key);
                onClearedCallback();
            };
        }]);
})();

(function() {
    'use strict';

    angular
        .module('waves.core.services')
        .provider('storageService', [function () {
            function isLocalStorageEnabled(window) {
                var storage, fail, uid;
                try {
                    uid = String(new Date());
                    (storage = window.localStorage).setItem(uid, uid);
                    fail = storage.getItem(uid) != uid;
                    if (!fail)
                        storage.removeItem(uid);
                    else
                        storage = false;
                }
                catch (exception) {
                }
                return storage;
            }

            this.$get = ['$window', 'chromeStorageService', 'html5StorageService',
                function($window, chromeStorageService, html5StorageService) {
                return isLocalStorageEnabled($window) ? html5StorageService : chromeStorageService;
            }];
        }]);
})();
