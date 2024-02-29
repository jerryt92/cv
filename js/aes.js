// 依赖crypto-js

const mode = {
    // CryptoJS.MD5必须转为字符串！
    // 密钥偏移量，ECB模式不需要
    // iv: CryptoJS.enc.Utf8.parse((""+CryptoJS.MD5("tjlaes2022")).slice(8, 24)),
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
}

// AES字符串加密

// 加密方法
function aesEncryptBase64(key, data) {
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Utf8.parse(key);
    let srcs = CryptoJS.enc.Utf8.parse(data);
    let encrypted = CryptoJS.AES.encrypt(srcs, key, mode);
    return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
}
// 解密方法
function aesDecryptBase64(key, data) {
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Utf8.parse(key);
    let encryptedHexStr = CryptoJS.enc.Base64.parse(data);
    let srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    let decrypt = CryptoJS.AES.decrypt(srcs, key, mode);
    return decrypt.toString(CryptoJS.enc.Utf8);
}
// 加密方法
function aesEncryptHex(key, data) {
    key = CryptoJS.enc.Utf8.parse(key);
    let encrypted = CryptoJS.AES.encrypt(data, key, mode);
    let cipherText = encrypted.toString();
    cipherText = CryptoJS.enc.Hex.stringify(CryptoJS.enc.Base64.parse(cipherText));
    return cipherText;
}
// 解密方法
function aesDecryptHex(key, data) {
    let cipherText;
    cipherText = CryptoJS.enc.Hex.parse(data)
    key = CryptoJS.enc.Utf8.parse(key);
    let decrypted = CryptoJS.AES.decrypt({
        ciphertext: cipherText
    }, key, mode);
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// AES文件加密

// 加密
function aesFileEncrypt(key, data) {
    // data为ArrayBuffer类型的数据
    data = arrayBufferToWordArray(data);
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Hex.parse(key);
    let encrypted = CryptoJS.AES.encrypt(data, key, mode);
    return wordArrayToArrayBuffer(encrypted.ciphertext);
}
// 解密
function aesFileDecrypt(key, data) {
    // data为ArrayBuffer类型的数据
    data = arrayBufferToWordArray(data);
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Hex.parse(key);
    let decrypt = CryptoJS.AES.decrypt({ ciphertext: data }, key, mode);
    return wordArrayToArrayBuffer(decrypt);
}

function arrayBufferToWordArray(arrayBuffer) {
    const u8 = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
    const len = u8.length;
    const words = [];
    for (let i = 0; i < len; i += 1) {
        words[i >>> 2] |= (u8[i] & 0xff) << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, len);
}

function wordArrayToArrayBuffer(wordArray) {
    const { words } = wordArray;
    const { sigBytes } = wordArray;
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i += 1) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        u8[i] = byte;
    }
    return u8;
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
