// import sha256 from "fast-sha256";
export class WebUtils {
    /**
     * Public only for testing
     */
    static getAppId(options) {
        return this.getOverwritableValue(options, "appId");
    }
    static getOverwritableValue(options, key) {
        let base = options[key];
        if (options.web && options.web[key]) {
            base = options.web[key];
        }
        return base;
    }
    /**
     * Public only for testing
     */
    static getAuthorizationUrl(options) {
        let url = options.authorizationBaseUrl + "?client_id=" + options.appId;
        url += "&response_type=" + options.responseType;
        if (options.redirectUrl) {
            url += "&redirect_uri=" + options.redirectUrl;
        }
        if (options.scope) {
            url += "&scope=" + options.scope;
        }
        url += "&state=" + options.state;
        if (options.additionalParameters) {
            for (const key in options.additionalParameters) {
                url += "&" + key + "=" + options.additionalParameters[key];
            }
        }
        if (options.pkceCodeChallenge) {
            url += "&code_challenge=" + options.pkceCodeChallenge;
            url += "&code_challenge_method=" + options.pkceCodeChallengeMethod;
        }
        return encodeURI(url);
    }
    static getTokenEndpointData(options, code) {
        let data = new FormData();
        data.append('grant_type', 'authorization_code');
        data.append('client_id', options.appId);
        data.append('redirect_uri', options.redirectUrl);
        data.append('code', code);
        data.append('code_verifier', options.pkceCodeVerifier);
        // data.append('scope', options.scope);
        return data;
    }
    /**
     * Public only for testing
     */
    static getUrlParams(urlString) {
        if (urlString && urlString.trim().length > 0) {
            urlString = urlString.trim();
            let idx = urlString.indexOf("#");
            if (idx == -1) {
                idx = urlString.indexOf("?");
            }
            if (idx != -1 && urlString.length > (idx + 1)) {
                const urlParamStr = urlString.slice(idx + 1);
                const keyValuePairs = urlParamStr.split(`&`);
                return keyValuePairs.reduce((acc, hash) => {
                    const [key, val] = hash.split(`=`);
                    if (key && key.length > 0) {
                        return Object.assign({}, acc, { [key]: decodeURIComponent(val) });
                    }
                }, {});
            }
        }
        return undefined;
    }
    static randomString(length = 10) {
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let text = "";
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    static buildWebOptions(configOptions) {
        const webOptions = new WebOptions();
        webOptions.appId = this.getAppId(configOptions);
        webOptions.responseType = this.getOverwritableValue(configOptions, "responseType");
        webOptions.pkceDisabled = this.getOverwritableValue(configOptions, "pkceDisabled");
        if (!webOptions.responseType) {
            webOptions.responseType = "token";
        }
        if (webOptions.responseType == "code") {
            if (!webOptions.pkceDisabled) {
                webOptions.pkceCodeVerifier = this.randomString(64);
                if (CryptoUtils.HAS_SUBTLE_CRYPTO) {
                    CryptoUtils.deriveChallenge(webOptions.pkceCodeVerifier).then(c => {
                        webOptions.pkceCodeChallenge = c;
                        webOptions.pkceCodeChallengeMethod = "S256";
                    });
                }
                else {
                    webOptions.pkceCodeChallenge = webOptions.pkceCodeVerifier;
                    webOptions.pkceCodeChallengeMethod = "plain";
                }
            }
        }
        webOptions.authorizationBaseUrl = configOptions.authorizationBaseUrl;
        webOptions.accessTokenEndpoint = configOptions.accessTokenEndpoint;
        webOptions.resourceUrl = configOptions.resourceUrl;
        webOptions.scope = configOptions.scope;
        webOptions.state = configOptions.state;
        if (!webOptions.state || webOptions.state.length === 0) {
            webOptions.state = this.randomString(20);
        }
        webOptions.redirectUrl = configOptions.web.redirectUrl;
        let mapHelper = this.getOverwritableValue(configOptions, "additionalParameters");
        if (mapHelper) {
            webOptions.additionalParameters = {};
            for (const key in mapHelper) {
                if (key && key.trim().length > 0) {
                    let value = mapHelper[key];
                    if (value && value.trim().length > 0) {
                        webOptions.additionalParameters[key] = value;
                    }
                }
            }
        }
        if (configOptions.web) {
            if (configOptions.web.windowOptions) {
                webOptions.windowOptions = configOptions.web.windowOptions;
            }
            if (configOptions.web.windowTarget) {
                webOptions.windowTarget = configOptions.web.windowTarget;
            }
        }
        return webOptions;
    }
}
export class CryptoUtils {
    static toUint8Array(str) {
        const buf = new ArrayBuffer(str.length);
        const bufView = new Uint8Array(buf);
        for (let i = 0; i < str.length; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return bufView;
    }
    static toBase64Url(base64) {
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    static toBase64(bytes) {
        let len = bytes.length;
        let base64 = "";
        for (let i = 0; i < len; i += 3) {
            base64 += this.BASE64_CHARS[bytes[i] >> 2];
            base64 += this.BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += this.BASE64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += this.BASE64_CHARS[bytes[i + 2] & 63];
        }
        if ((len % 3) === 2) {
            base64 = base64.substring(0, base64.length - 1) + "=";
        }
        else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + "==";
        }
        return base64;
    }
    static deriveChallenge(codeVerifier) {
        if (codeVerifier.length < 43 || codeVerifier.length > 128) {
            return Promise.reject(new Error('ERR_PKCE_CODE_VERIFIER_INVALID_LENGTH'));
        }
        if (!CryptoUtils.HAS_SUBTLE_CRYPTO) {
            return Promise.reject(new Error('ERR_PKCE_CRYPTO_NOTSUPPORTED'));
        }
        return new Promise((resolve, reject) => {
            crypto.subtle.digest('SHA-256', this.toUint8Array(codeVerifier)).then(arrayBuffer => {
                return resolve(this.toBase64Url(this.toBase64(new Uint8Array(arrayBuffer))));
            }, error => reject(error));
        });
    }
}
CryptoUtils.BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
CryptoUtils.HAS_SUBTLE_CRYPTO = typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
export class WebOptions {
    constructor() {
        this.windowTarget = "_blank";
    }
}
//# sourceMappingURL=web-utils.js.map