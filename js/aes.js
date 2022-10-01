// 依赖crypto-js

const mode = {
    // iv: CryptoJS.enc.Utf8.parse("ABCDEF1234123412"), // 十六位十六进制数作为密钥偏移量
    // CryptoJS.MD5必须转为字符串！
    iv: CryptoJS.enc.Utf8.parse((""+CryptoJS.MD5("tjlaes2022")).slice(8, 24)), // 密钥偏移量
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
}

// AES字符串加密

// 加密方法
function aesStringEncrypt(key, data) {
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Utf8.parse(""+CryptoJS.MD5(key));
    let srcs = CryptoJS.enc.Utf8.parse(data);
    let encrypted = CryptoJS.AES.encrypt(srcs, key, mode);
    return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
}
// 解密方法
function aesStringDecrypt(key, data) {
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Utf8.parse(""+CryptoJS.MD5(key));
    let encryptedHexStr = CryptoJS.enc.Base64.parse(data);
    let srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    let decrypt = CryptoJS.AES.decrypt(srcs, key, mode);
    return decrypt.toString(CryptoJS.enc.Utf8);
}

// AES文件加密

// 加密
function aesFileEncrypt(key, data) {
    // data为ArrayBuffer类型的数据
    data = arrayBufferToWordArray(data);
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Hex.parse(""+CryptoJS.MD5(key));
    let encrypted = CryptoJS.AES.encrypt(data, key, mode);
    return wordArrayToArrayBuffer(encrypted.ciphertext);
}
// 解密
function aesFileDecrypt(key, data) {
    // data为ArrayBuffer类型的数据
    data = arrayBufferToWordArray(data);
    // CryptoJS.MD5必须转为字符串！
    key = CryptoJS.enc.Hex.parse(""+CryptoJS.MD5(key));
    console.log("key="+key);
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