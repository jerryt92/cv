// 依赖crypto-js v4.2.0
// https://github.com/jerryt92/js_encrypto - 2022/10/1

// AES加密模式配置
const mode = {
    // CryptoJS.MD5必须转为字符串！
    // 密钥偏移量，ECB模式不需要
    // iv: CryptoJS.enc.Utf8.parse((""+CryptoJS.MD5("tjlaes2022")).slice(8, 24)),
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
}
// 密钥编码方式
const cipherEncode = "base64";
// 数据编码方式
const dataEncode = "hex";

// AES字符串加密

// 加密方法
function aesEncrypt(cipher, data) {
    // CryptoJS.MD5必须转为字符串！
    if (cipherEncode.toLowerCase() == "base64") {
        cipher = CryptoJS.enc.Base64.parse(cipher);
    } else if (cipherEncode.toLowerCase() == "utf8") {
        cipher = CryptoJS.enc.Utf8.parse(cipher);
    } else {
        throw new Error("Unsupport cipher encode: " + cipherEncode);
    }
    let srcs = CryptoJS.enc.Utf8.parse(data);
    let encrypted = CryptoJS.AES.encrypt(srcs, cipher, mode);
    if (dataEncode.toLowerCase() == "base64") {
        return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
    } else if (dataEncode.toLowerCase() == "hex") {
        return CryptoJS.enc.Hex.stringify(encrypted.ciphertext);
    } else {
        throw new Error("Unsupport data encode: " + dataEncode);
    }
}

// 解密方法
function aesDecrypt(cipher, data) {
    if (cipherEncode.toLowerCase() == "base64") {
        cipher = CryptoJS.enc.Base64.parse(cipher);
    } else if (cipherEncode.toLowerCase() == "utf8") {
        cipher = CryptoJS.enc.Utf8.parse(cipher);
    }
    if (dataEncode.toLowerCase() == "base64") {
        let decrypt = CryptoJS.AES.decrypt(data, cipher, mode);
        return decrypt.toString(CryptoJS.enc.Utf8);
    } else if (dataEncode.toLowerCase() == "hex") {
        let cipherText = CryptoJS.enc.Hex.parse(data)
        let decrypted = CryptoJS.AES.decrypt({
            ciphertext: cipherText
        }, cipher, mode);
        return decrypted.toString(CryptoJS.enc.Utf8);
    } else {
        throw new Error("Unsupport data encode: " + dataEncode);
    }
}


// AES文件加密

// 加密
function aesFileEncrypt(cipher, data) {
    data = arrayBufferToWordArray(data);
    // CryptoJS.MD5必须转为字符串！
    cipher = CryptoJS.enc.Utf8.parse(cipher);
    let encrypted = CryptoJS.AES.encrypt(data, cipher, mode);
    return wordArrayToArrayBuffer(encrypted.ciphertext);
}

// 解密
function aesFileDecrypt(cipher, data) {
    data = arrayBufferToWordArray(data);
    // CryptoJS.MD5必须转为字符串！
    cipher = CryptoJS.enc.Utf8.parse(cipher);
    let decrypt = CryptoJS.AES.decrypt({ciphertext: data}, cipher, mode);
    return wordArrayToArrayBuffer(decrypt);
}

function arrayBufferToWordArray(arrayBuffer) {
    const bytes = new Int8Array(arrayBuffer, 0, arrayBuffer.byteLength);
    const len = bytes.length;
    const words = [];
    for (let i = 0; i < len; i += 1) {
        words[i >>> 2] |= (bytes[i] & 0xff) << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, len);
}

function wordArrayToArrayBuffer(wordArray) {
    const {words} = wordArray;
    const {sigBytes} = wordArray;
    const bytes = new Int8Array(sigBytes);
    for (let i = 0; i < sigBytes; i += 1) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        bytes[i] = byte;
    }
    return bytes;
}

function arrayBufferToBinaryString(arrayBuffer) {
    //第一步，将ArrayBuffer转为二进制字符串
    var binaryString = '';
    var bytes = new Uint8Array(arrayBuffer);
    for (var len = bytes.byteLength, i = 0; i < len; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return binaryString;
}

function binaryStringToArrayBuffer(binaryString) {
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferToBase64(arrayBuffer) {
    //第一步，将ArrayBuffer转为二进制字符串
    var binaryString = '';
    var bytes = new Uint8Array(arrayBuffer);
    for (var len = bytes.byteLength, i = 0; i < len; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}

function base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
