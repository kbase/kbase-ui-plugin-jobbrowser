define(["require", "exports", "./HttpUtils", "bluebird"], function (require, exports, HttpUtils_1, Promise) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Promise.config({
        cancellation: true
    });
    class HttpHeader {
        static fromXHR(xhr) {
            let responseHeaders = xhr.getAllResponseHeaders();
            if (!responseHeaders) {
                return {};
            }
            let fieldsArray = responseHeaders.split(/\n/);
            var fieldsMap = {};
            fieldsArray.forEach((field) => {
                let firstColon = field.indexOf(':', 0);
                let name = field.substr(0, firstColon).trim();
                let value = field.substr(firstColon + 1).trim();
                fieldsMap[name.toLowerCase()] = value;
            });
            return fieldsMap;
        }
        static fromMap(header) {
            var fieldsMap = {};
            Object.keys(header).forEach((name) => {
                fieldsMap[name.toLowerCase()] = header[name];
            });
            return fieldsMap;
        }
        constructor(initialHeaders) {
            if (typeof initialHeaders === 'undefined') {
                this.header = {};
            }
            else if (initialHeaders instanceof XMLHttpRequest) {
                this.header = HttpHeader.fromXHR(initialHeaders);
            }
            else {
                this.header = HttpHeader.fromMap(initialHeaders);
            }
        }
        getHeader(fieldName) {
            return this.header[fieldName.toLowerCase()];
        }
        setHeader(fieldName, fieldValue) {
            this.header[fieldName.toLowerCase()] = fieldValue;
        }
        exportHeader(xhr) {
            Object.keys(this.header)
                .filter((key) => {
                if (this.getHeader(key) === undefined ||
                    this.getHeader(key) === null) {
                    return false;
                }
                return true;
            })
                .forEach((key) => {
                var stringValue = (function (value) {
                    switch (typeof value) {
                        case 'string': return value;
                        case 'number': return String(value);
                        case 'boolean': return String(value);
                        default:
                            throw new Error('Invalid type for header value: ' + typeof value);
                    }
                }(this.getHeader(key)));
                xhr.setRequestHeader(key, stringValue);
            });
        }
        getContentType() {
            let value = this.header['content-type'];
            if (!value) {
                return {
                    mediaType: null,
                    charset: null
                };
            }
            let values = value.split(';').map((x) => x.trim());
            return {
                mediaType: values[0],
                charset: values[1] || null
            };
        }
    }
    exports.HttpHeader = HttpHeader;
    class TimeoutError extends Error {
        constructor(timeout, elapsed, message, xhr) {
            super(message);
            Object.setPrototypeOf(this, TimeoutError.prototype);
            this.name = 'TimeoutError';
            this.stack = new Error().stack;
            this.timeout = timeout;
            this.elapsed = elapsed;
            this.xhr = xhr;
        }
        toString() {
            if (this.message) {
                return this.message;
            }
        }
    }
    exports.TimeoutError = TimeoutError;
    class GeneralError extends Error {
        constructor(message, xhr) {
            super(message);
            Object.setPrototypeOf(this, GeneralError.prototype);
            this.name = 'GeneralError';
            this.stack = new Error().stack;
            this.xhr = xhr;
        }
        toString() {
            return this.message;
        }
    }
    exports.GeneralError = GeneralError;
    class AbortError extends Error {
        constructor(message, xhr) {
            super(message);
            Object.setPrototypeOf(this, AbortError.prototype);
            this.name = 'AbortError';
            this.stack = new Error().stack;
            this.xhr = xhr;
        }
        toString() {
            return this.message;
        }
    }
    exports.AbortError = AbortError;
    class HttpClient {
        constructor() {
        }
        request(options) {
            let startTime = new Date().getTime();
            let that = this;
            return new Promise((resolve, reject, onCancel) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = () => {
                    resolve({
                        status: xhr.status,
                        response: xhr.response,
                        responseType: xhr.responseType,
                        header: new HttpHeader(xhr)
                    });
                };
                xhr.ontimeout = () => {
                    var elapsed = (new Date().getTime()) - startTime;
                    reject(new TimeoutError(options.timeout, elapsed, 'Request timeout', xhr));
                };
                xhr.onerror = () => {
                    reject(new GeneralError('General request error ' + options.url, xhr));
                };
                xhr.onabort = () => {
                    reject(new AbortError('Request was aborted', xhr));
                };
                var url = options.url;
                if (options.query) {
                    url += '?' + new HttpUtils_1.HttpQuery(options.query).toString();
                }
                const rt = (options.responseType || 'text');
                xhr.responseType = rt;
                try {
                    xhr.open(options.method, url, true);
                }
                catch (ex) {
                    reject(new GeneralError('Error opening request ' + ex.name, xhr));
                    return;
                }
                if (options.timeout) {
                    xhr.timeout = options.timeout;
                }
                xhr.withCredentials = options.withCredentials || false;
                try {
                    if (options.header) {
                        options.header.exportHeader(xhr);
                    }
                }
                catch (ex) {
                    reject(new GeneralError('Error applying header before send ' + ex.name, xhr));
                }
                try {
                    if (typeof options.data === 'string') {
                        xhr.send(options.data);
                        if (onCancel) {
                            onCancel(() => {
                                xhr.abort();
                            });
                        }
                    }
                    else if (options.data instanceof Array) {
                        xhr.send(new Uint8Array(options.data));
                    }
                    else if (typeof options.data === 'undefined') {
                        xhr.send();
                    }
                    else if (options.data === null) {
                        xhr.send();
                    }
                    else {
                        reject(new Error('Invalid type of data to send: ' + typeof options.data));
                    }
                }
                catch (ex) {
                    reject(new GeneralError('Error sending data in request', xhr));
                }
            });
        }
    }
    exports.HttpClient = HttpClient;
});
