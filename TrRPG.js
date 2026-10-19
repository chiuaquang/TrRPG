//=============================================================================
// TrRPG.js
//=============================================================================

/*:
* @plugindesc v2.2.0 TrRPG - Dich truc tiep game RPG Maker MV/MZ (Google / Bing / Index-Translate 35B)
* @author Chiu & Muse
*
* @help
* TrRPG - Plugin dich TRUC TIEP trong game RPG Maker MV/MZ.
* Tu dong dich hoi thoai, lua chon, menu, ten item/skill/quan ao...
* sang ngon ngu dich khi ban choi game. Khong can tool ngoai.
*
* --- Cai dat ---
* 1. Copy TrRPG.js vao thu muc js/plugins/ cua game.
* 2. Mo js/plugins.js, them vao mang plugins (xem HUONG_DAN.md).
* 3. Bat plugin trong RPG Maker (Plugin Manager) hoac de status: true.
* 4. Vao game, bam nut ⚙ goc man hinh de chon engine dich.
*
* --- Engine ho tro (deu MIEN PHI, khong can API key) ---
* - google: Google Dich (nhanh, on dinh)
* - bing: Bing Microsoft (du phong khi Google bi chan)
* - indextranslate: Index-Translate 35B (AI chuyen dich, dich hay nhat,
* cham hon, can mang on dinh)
* Neu engine chinh loi, plugin tu dong thu engine du phong.
*
* --- Luu y ---
* - Can mang internet lan dau de dich. Cau nao dich roi se luu cache,
* lan sau hien ngay khong can mang.
* - Font mac dinh cua game co the thieu dau tieng Viet. Neu chu hien thi
* loi dau, can thay font game bang font ho tro tieng Viet day du.
*
* @param targetLanguage
* @text Ngon ngu dich
* @desc Ma ngon ngu dich: vi, en, ja, ko, zh-CN, zh-TW, fr, de, es...
* @default vi
*
* @param sourceLanguage
* @text Ngon ngu nguon
* @desc auto = tu nhan dien. Neu biet game tieng gi thi dien ma do (ja/en...)
* @default auto
*
* @param engine
* @text Engine dich
* @desc Chon engine dich chinh
* @type select
* @option Google Dich (mien phi)
* @value google
* @option Bing Microsoft (mien phi)
* @value bing
* @option Index-Translate 35B (AI, mien phi)
* @value indextranslate
* @default google
*
* @param fallbackEngine
* @text Engine du phong
* @desc Tu dong dung khi engine chinh loi
* @type select
* @option Google Dich (mien phi)
* @value google
* @option Bing Microsoft (mien phi)
* @value bing
* @option Index-Translate 35B (AI, mien phi)
* @value indextranslate
* @option Tat (khong du phong)
* @value none
* @default google
*
* @param maxParallel
* @text So request song song
* @desc Cang cao dich cang nhanh nhung de bi chan IP tam thoi (429)
* @type number
* @min 1
* @max 5
* @default 2
*
* @param enableCache
* @text Luu cache
* @desc ON = luu ban dich vao may, lan sau khong can dich lai
* @type boolean
* @on ON
* @off OFF
* @default true
*
* @param translatePluginParams
* @text Dich tham so plugin (NGUY HIEM)
* @desc CHI BAT khi hieu ro game. Params chua ca code/formula,
* dich sai lam HONG GAME. Menu custom da duoc dich an toan qua
* lop hien thi (addCommand) nen thuong KHONG CAN bat cai nay.
* @type boolean
* @on ON
* @off OFF
* @default false
*
* @param aggressiveMode
* @text Che do quet manh
* @desc ON = dich ca text ve truc tiep (quest journal, menu custom...). Ton CPU hon.
* @type boolean
* @on ON
* @off OFF
* @default false
*
* @param renderHook
* @text Dich o lop ve chu (khuyen dung)
* @desc ON = dich truc tiep moi text ve len cua so (menu custom, Save/Load/Warp, lua chon do plugin ve...). Giong MTool. Tu ve lai khi dich xong.
* @type boolean
* @on ON
* @off OFF
* @default true
*
* @param autoOff
* @text Tu tat khi dich xong
* @desc ON = khi het viec dich, tu dung cac bo dem nen (khong ton CPU). Co cau moi tu bat lai.
* @type boolean
* @on ON
* @off OFF
* @default true
*
* @param showButton
* @text Hien nut cai dat
* @desc Hien nut ⚙ tren man hinh de doi engine / bat tat dich
* @type boolean
* @on ON
* @off OFF
* @default true
*/

(function() {
'use strict';

//-----------------------------------------------------------------------------
// 0. Cau hinh
//-----------------------------------------------------------------------------
var TrRPG = {};
TrRPG.VERSION = '2.2.0';

var _params = PluginManager.parameters('TrRPG');
TrRPG.config = {
targetLanguage: String(_params['targetLanguage'] || 'vi'),
sourceLanguage: String(_params['sourceLanguage'] || 'auto'),
engine: String(_params['engine'] || 'google'),
fallbackEngine: String(_params['fallbackEngine'] || 'google'),
maxParallel: Math.max(1, Math.min(5, parseInt(_params['maxParallel'] || '2', 10))),
enableCache: String(_params['enableCache'] || 'true') === 'true',
showButton: String(_params['showButton'] || 'true') === 'true',
aggressiveMode: String(_params['aggressiveMode'] || 'false') === 'true',
autoOff: String(_params['autoOff'] || 'true') === 'true',
renderHook: String(_params['renderHook'] || 'true') === 'true' || String(_params['aggressiveMode'] || 'false') === 'true',
translatePluginParams: String(_params['translatePluginParams'] || 'false') === 'true'
};
TrRPG.enabled = true;
TrRPG._memo = Object.create(null); // text -> ket qua cuoi (lop ve chu)
TrRPG._memoN = 0;
TrRPG.translatedCount = 0;
TrRPG._produced = {}; // hash cac ban dich do plugin tao ra -> khong dich lai bao gio
TrRPG.stats = { ok: 0, fail: 0, lastError: '' }; // thong ke de chan doan loi API

// Doc cai dat da luu (nguoi dung doi qua nut ⚙)
try {
var _saved = localStorage.getItem('trrpg_settings');
if (_saved) {
var _s = JSON.parse(_saved);
if (_s.engine) TrRPG.config.engine = _s.engine;
if (_s.targetLanguage) TrRPG.config.targetLanguage = _s.targetLanguage;
if (typeof _s.enabled === 'boolean') TrRPG.enabled = _s.enabled;
if (typeof _s.autoOff === 'boolean') TrRPG.config.autoOff = _s.autoOff;
}
} catch (e) { /* bo qua */}

TrRPG.saveSettings = function() {
TrRPG._memo = Object.create(null); TrRPG._memoN = 0; // doi ngon ngu/bat tat -> xoa memo
try {
localStorage.setItem('trrpg_settings', JSON.stringify({
engine: TrRPG.config.engine,
targetLanguage: TrRPG.config.targetLanguage,
autoOff: TrRPG.config.autoOff,
enabled: TrRPG.enabled
}));
} catch (e) { /* bo qua */}
};

//-----------------------------------------------------------------------------
// 1. Tien ich chung
//-----------------------------------------------------------------------------
// Hash cyrb53: 53-bit, va cham cuc thap cho hang chuc nghin cau
TrRPG.hashKey = function(str) {
var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
for (var i = 0; i < str.length; i++) {
var ch = str.charCodeAt(i);
h1 = Math.imul(h1 ^ ch, 2654435761);
h2 = Math.imul(h2 ^ ch, 1597334677);
}
h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
};

TrRPG.enc = function(s) { return encodeURIComponent(s);};

// XMLHttpRequest boc Promise (tuong thich WebView cu tren Android)
TrRPG.httpGet = function(url, timeoutMs) {
return new Promise(function(resolve, reject) {
var xhr = new XMLHttpRequest();
var done = false;
var timer = setTimeout(function() {
if (!done) { done = true; try { xhr.abort();} catch (e) {}
reject(new Error('timeout'));}
}, timeoutMs || 15000);
xhr.onreadystatechange = function() {
if (xhr.readyState === 4 &&!done) {
done = true; clearTimeout(timer);
if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
else reject(new Error('http ' + xhr.status));
}
};
xhr.onerror = function() {
if (!done) { done = true; clearTimeout(timer); reject(new Error('network'));}
};
try { xhr.open('GET', url, true); xhr.send(null);}
catch (e) { if (!done) { done = true; clearTimeout(timer); reject(e);}}
});
};

TrRPG.httpPost = function(url, body, headers, timeoutMs) {
return new Promise(function(resolve, reject) {
var xhr = new XMLHttpRequest();
var done = false;
var timer = setTimeout(function() {
if (!done) { done = true; try { xhr.abort();} catch (e) {}
reject(new Error('timeout'));}
}, timeoutMs || 30000);
xhr.onreadystatechange = function() {
if (xhr.readyState === 4 &&!done) {
done = true; clearTimeout(timer);
if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
else reject(new Error('http ' + xhr.status));
}
};
xhr.onerror = function() {
if (!done) { done = true; clearTimeout(timer); reject(new Error('network'));}
};
try {
xhr.open('POST', url, true);
if (headers) for (var k in headers) xhr.setRequestHeader(k, headers[k]);
xhr.send(body);
} catch (e) { if (!done) { done = true; clearTimeout(timer); reject(e);}}
});
};

TrRPG.sleep = function(ms) {
return new Promise(function(r) { setTimeout(r, ms);});
};

//-----------------------------------------------------------------------------
// 2. Bao ve control code RPG Maker
//-----------------------------------------------------------------------------
// Truoc khi gui cho API dich: thay \V[1], \N[2], \C[3]... thanh marker 〔T0〕
// Sau khi dich xong: khoi phuc marker ve control code goc.
// (Hoc tu MTool-Translator: API hay xoa/bien dang control code)
TrRPG.Protect = {
// Regex cac control code can bao ve
pattern: /(\\[A-Za-z]+\[[^\]\n]*\]|%\d+|\\[{}\$\.\|!><\^\\])/g,

protect: function(text) {
var map = [];
var out = String(text).replace(/\r\n/g, '\n');
// 1. Bao ve xuong dong truoc (API dich hay nuot mat noi dung sau \n)
out = out.replace(/\n/g, function() {
map.push('\n');
return '〔T' + (map.length - 1) + '〕';
});
// 1b. Bao ve literal \n (plugin command hay dung \n thay vi xuong dong that)
out = out.replace(/\\n/g, function() {
map.push('\\n');
return '〔T' + (map.length - 1) + '〕';
});
// 2. Bao ve control code RPG Maker
out = out.replace(TrRPG.Protect.pattern, function(m) {
map.push(m);
return '〔T' + (map.length - 1) + '〕';
});
return { text: out, map: map };
},

restore: function(text, map) {
var out = String(text);
// Dang 1: khop chinh xac 〔T0〕 (co the co khoang trang do API them vao)
out = out.replace(/〔\s*T\s*(\d+)\s*〕/gi, function(m, n) {
var i = parseInt(n, 10);
return (i >= 0 && i < map.length)? map[i]: m;
});
// Dang 2: bien the ngoac do API "sang tao" lai
out = out.replace(/【\s*T\s*(\d+)\s*】|\[\s*T\s*(\d+)\s*\]/gi, function(m, n1, n2) {
var num = (n1 !== undefined) ? n1 : n2;
var i = parseInt(num, 10);
return (i >= 0 && i < map.length) ? map[i] : m;
});
return out;
}
};

//-----------------------------------------------------------------------------
// 3. Cache ban dich
//-----------------------------------------------------------------------------
TrRPG.Cache = {
    _mem: {},       // hash -> ban dich (trong RAM)
    _order: [],     // thu tu de cat bot khi day
    _dirty: false,
    _saveTimer: null,
    MAX_ENTRIES: 30000,

    load: function() {
        if (!TrRPG.config.enableCache) return;
        try {
            var raw = localStorage.getItem('trrpg_cache');
            if (!raw) return;
            var obj = JSON.parse(raw);
            var count = 0;
            for (var k in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, k)) {
                    TrRPG.Cache._mem[k] = obj[k];
                    TrRPG.Cache._order.push(k);
                    count++;
                }
            }
            TrRPG.translatedCount = count;
            // Danh dau tat ca ban dich da luu: gap lai thi bo qua, khong dich 2 lan
            for (var k2 in TrRPG.Cache._mem) {
                if (Object.prototype.hasOwnProperty.call(TrRPG.Cache._mem, k2)) {
                    TrRPG._produced[TrRPG.hashKey(TrRPG.Cache._mem[k2])] = true;
                }
            }
        } catch (e) { /* cache hong -> bo qua, bat dau moi */ }
    },

    get: function(key) {
        return TrRPG.Cache._mem[key];
    },

    set: function(key, value) {
        if (!TrRPG.Cache._mem.hasOwnProperty(key)) {
            TrRPG.Cache._order.push(key);
        }
        TrRPG.Cache._mem[key] = value;
        TrRPG._produced[TrRPG.hashKey(value)] = true;
        TrRPG.translatedCount++;
        TrRPG.Cache._dirty = true;
        TrRPG.Cache.scheduleSave();
    },

    scheduleSave: function() {
        if (!TrRPG.config.enableCache || TrRPG.Cache._saveTimer) return;
        // Ghi gop: 30 giay/lan, uu tien luc may ranh (JSON.stringify cache lon
        // tren dien thoai co the chan game vai tram ms)
        TrRPG.Cache._saveTimer = setTimeout(function() {
            TrRPG.Cache._saveTimer = null;
            if (window.requestIdleCallback) {
                window.requestIdleCallback(function() { TrRPG.Cache.saveNow(); }, { timeout: 15000 });
            } else {
                TrRPG.Cache.saveNow();
            }
        }, 30000);
    },

    saveNow: function() {
        if (!TrRPG.Cache._dirty) return;
        TrRPG.Cache._dirty = false;
        try {
            // Cat bot entry cu nhat neu vuot gioi han (tranh day localStorage)
            while (TrRPG.Cache._order.length > TrRPG.Cache.MAX_ENTRIES) {
                var old = TrRPG.Cache._order.shift();
                delete TrRPG.Cache._mem[old];
            }
            localStorage.setItem('trrpg_cache', JSON.stringify(TrRPG.Cache._mem));
        } catch (e) {
            // Het dung luong localStorage (~5MB): cat manh hon roi thu lai
            try {
                while (TrRPG.Cache._order.length > 10000) {
                    var old2 = TrRPG.Cache._order.shift();
                    delete TrRPG.Cache._mem[old2];
                }
                localStorage.setItem('trrpg_cache', JSON.stringify(TrRPG.Cache._mem));
            } catch (e2) { /* chiu, giu cache trong RAM */ }
        }
    },

    clear: function() {
        TrRPG._memo = Object.create(null); TrRPG._memoN = 0;
        TrRPG.Cache._mem = {};
        TrRPG.Cache._order = [];
        TrRPG.Cache._dirty = false;
        TrRPG.translatedCount = 0;
        try { localStorage.removeItem('trrpg_cache'); } catch (e) {}
    }
};

//-----------------------------------------------------------------------------
// 4. Bo loc: cau nao can dich, cau nao bo qua
//-----------------------------------------------------------------------------
// (Sua loi cua tool cu: no bo qua ca tieng Nhat/CJK nen game Nhat khong dich
// duoc cau nao, lai di dich ca text rac nhu duong dan file)
TrRPG._viDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

TrRPG.shouldTranslate = function(text) {
    if (!TrRPG.enabled) return false;
    if (text === null || text === undefined) return false;
    var s = String(text);
    // Text nay do chinh plugin dich ra truoc do -> khong bao gio dich lai
    if (TrRPG._produced[TrRPG.hashKey(s)]) return false;
    if (!s.trim()) return false;
    // Loai control-code de kiem tra phan text that
    var stripped = s.replace(TrRPG.Protect.pattern, '').replace(/\n/g, ' ').trim();
    if (!stripped) return false;
    // Chi co so/ky hieu, khong co chu cai -> khong dich
    if (!/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(stripped)) return false;
    // URL, duong dan file -> khong dich
    if (/^(https?:\/\/|www\.|[A-Za-z]:[\\/]|ftp:\/\/)/i.test(stripped)) return false;
    if (/^[\w\-.]+\.(png|jpg|jpeg|ogg|m4a|mp3|wav|json|js)$/i.test(stripped)) return false;
    // Da la tieng Viet (co dau) -> khong dich lai (tranh dich 2 lan)
    if (TrRPG.config.targetLanguage.toLowerCase().indexOf('vi') === 0) {
        if (TrRPG._viDiacritics.test(stripped)) return false;
    }
    return true;
};

//-----------------------------------------------------------------------------
// 5. Cac engine dich (deu MIEN PHI)
//-----------------------------------------------------------------------------
TrRPG.Engines = {};

// --- 5a. Google Dich (free, unofficial API) ---
TrRPG.Engines.google = function(text, src, tgt) {
    var url = 'https://translate.googleapis.com/translate_a/single' +
        '?client=gtx&sl=' + TrRPG.enc(src) + '&tl=' + TrRPG.enc(tgt) +
        '&dt=t&q=' + TrRPG.enc(text);
    return TrRPG.httpGet(url, 8000).then(function(res) {
        var data = JSON.parse(res);
        var out = '';
        if (data && data[0]) {
            for (var i = 0; i < data[0].length; i++) {
                if (data[0][i] && data[0][i][0]) out += data[0][i][0];
            }
        }
        if (!out.trim()) throw new Error('google: empty result');
        return out;
    });
};

// --- 5b. Bing Microsoft (free, unofficial web API) ---
TrRPG.Bing = {
    base: 'https://cn.bing.com',
    altBase: 'https://www.bing.com',
    token: null,      // {ig, iid, key, token, expiry}
    counter: 0,

    langCode: function(lang) {
        lang = String(lang).toLowerCase();
        if (lang === 'auto') return 'auto-detect';
        if (lang === 'zh-cn' || lang === 'zh') return 'zh-Hans';
        if (lang === 'zh-tw') return 'zh-Hant';
        return lang;
    },

    fetchToken: function(base) {
        return TrRPG.httpGet(base + '/translator', 15000).then(function(html) {
            var ig = (html.match(/IG:"([A-F0-9]+)"/) || [])[1] || '';
            var iid = (html.match(/data-iid="([^"]+)"/) || [])[1] ||
                      (html.match(/IID:"([^"]+)"/) || [])[1] || 'translator.5023';
            var ap = html.match(/params_AbusePreventionHelper\s*=\s*\[\s*(\d+)\s*,\s*"([^"]+)"/);
            var key = ap ? ap[1] : '';
            var token = ap ? ap[2] : '';
            if (!ig || !token) throw new Error('bing: cannot get token');
            return { base: base, ig: ig, iid: iid, key: key, token: token,
                     expiry: Date.now() + 3000000 };
        });
    },

    getToken: function() {
        var self = this;
        if (self.token && Date.now() < self.token.expiry) {
            return Promise.resolve(self.token);
        }
        // Thu cn.bing.com truoc, hong thi doi sang www.bing.com
        return self.fetchToken(self.base).catch(function() {
            return self.fetchToken(self.altBase);
        }).then(function(tk) {
            self.token = tk;
            self.base = tk.base;
            return tk;
        });
    },

    translate: function(text, src, tgt) {
        var self = this;
        function attempt(refreshed) {
            return self.getToken().then(function(tk) {
                self.counter++;
                var url = tk.base + '/ttranslatev3?isVertical=1&IG=' + tk.ig +
                    '&IID=' + TrRPG.enc(tk.iid) + '&SFX=' + self.counter;
                var body = 'text=' + TrRPG.enc(text) +
                    '&fromLang=' + TrRPG.enc(self.langCode(src)) +
                    '&to=' + TrRPG.enc(self.langCode(tgt)) +
                    '&token=' + TrRPG.enc(tk.token) +
                    '&key=' + TrRPG.enc(tk.key) +
                    '&tryFetchingGenderDebiasedTranslations=true';
                return TrRPG.httpPost(url, body, {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': tk.base,
                    'Referer': tk.base + '/translator'
                }, 20000).then(function(res) {
                    var data = JSON.parse(res);
                    if (data && data[0] && data[0].translations &&
                        data[0].translations[0] && data[0].translations[0].text) {
                        return data[0].translations[0].text;
                    }
                    throw new Error('bing: bad response');
                });
            }).catch(function(err) {
                // Token het han -> lay token moi roi thu lai 1 lan
                if (!refreshed) {
                    self.token = null;
                    return attempt(true);
                }
                throw err;
            });
        }
        return attempt(false);
    }
};
TrRPG.Engines.bing = function(text, src, tgt) {
    return TrRPG.Bing.translate(text, src, tgt);
};

// --- 5c. Index-Translate 35B (AI chuyen dich, free, khong can key) ---
TrRPG.IndexT = {
    apiBase: 'https://index-translate.bilibili.com/v1',
    model: 'Index-Translate-35B-A3B',
    // Ten ngon ngu theo chuan cua Index-Translate
    langNames: {
        'vi': '越南语', 'en': '英语', 'zh-CN': '中文', 'zh-TW': '中文',
        'ja': '日语', 'ko': '韩语', 'fr': '法语', 'de': '德语',
        'es': '西班牙语', 'pt': '葡萄牙语', 'ru': '俄语', 'ar': '阿拉伯语',
        'it': '意大利语', 'th': '泰语', 'id': '印尼语'
    },

    buildPrompt: function(text, src, tgt) {
        var tgtName = this.langNames[tgt] || tgt;
        var srcName = (src && src !== 'auto') ? (this.langNames[src] || src) : '';
        var head = srcName
            ? '请将以下' + srcName + '游戏文本翻译为' + tgtName + '。'
            : '请将以下游戏文本翻译为' + tgtName + '。';
        // Nhac AI giu nguyen marker bao ve control code
        return head +
            '保留所有形如〔T0〕的标记原样输出，不要翻译、删除或改动它们。' +
            '直接输出翻译结果，不要进行任何解释。\n\n' + text;
    },

    stripThink: function(s) {
        // Loai bo khoi suy luan neu model lo tra ve
        var i = s.indexOf('</think>');
        if (i >= 0) s = s.slice(i + 8);
        return s.replace(/^<think>/, '').trim();
    },

    callApi: function(prompt, maxTokens) {
        var self = this;
        var payload = JSON.stringify({
            model: self.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.0,
            max_tokens: maxTokens || 1024,
            stream: false,
            // Tat suy luan: model dich truc tiep, bat len se lam hong ban dich
            chat_template_kwargs: { enable_thinking: false }
        });
        return TrRPG.httpPost(
            self.apiBase + '/chat/completions',
            payload,
            { 'Content-Type': 'application/json', 'User-Agent': 'TrRPG/1.0' },
            60000
        ).then(function(res) {
            var data = JSON.parse(res);
            var content = data && data.choices && data.choices[0] &&
                          data.choices[0].message && data.choices[0].message.content;
            if (!content || !content.trim()) throw new Error('indextranslate: empty');
            return self.stripThink(content);
        });
    },

    // Dich 1 cau
    translateOne: function(text, src, tgt) {
        return this.callApi(this.buildPrompt(text, src, tgt), 1024);
    },

    // Dich gom nhom: nhieu cau trong 1 request (danh so dong)
    translateBatch: function(texts, src, tgt) {
        var self = this;
        var numbered = texts.map(function(t, i) { return (i + 1) + '. ' + t; }).join('\n');
        var prompt = self.buildPrompt(numbered, src, tgt) +
            '\n\n输入是编号列表，请严格按编号输出，每行格式为"编号. 译文"，不要合并或拆分行。';
        return self.callApi(prompt, 2048).then(function(out) {
            var results = [];
            var lines = out.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var m = lines[i].match(/^\s*(\d+)\s*[\.\、:：]\s*([\s\S]*)$/);
                if (m) results[parseInt(m[1], 10) - 1] = m[2];
            }
            // Chi chap nhan khi du so luong dong
            var ok = results.length === texts.length;
            if (ok) for (var j = 0; j < results.length; j++) {
                if (results[j] === undefined) { ok = false; break; }
            }
            if (!ok) throw new Error('indextranslate: batch parse failed');
            return results;
        });
    }
};
TrRPG.Engines.indextranslate = function(text, src, tgt) {
    return TrRPG.IndexT.translateOne(text, src, tgt);
};
TrRPG.Engines.indextranslateBatch = function(texts, src, tgt) {
    return TrRPG.IndexT.translateBatch(texts, src, tgt);
};

//-----------------------------------------------------------------------------
// 6. Hang doi dich: chong trung, gom batch, tu retry khi loi/429
//-----------------------------------------------------------------------------
TrRPG.Queue = {
    pending: [],        // [{key, raw, resolve, reject}]
    inflight: {},       // key -> true (dang cho trong queue hoac dang dich)
    active: 0,          // so request dang chay
    timer: null,
    failStreak: 0,      // so loi lien tiep (de tam dung khi mat mang)
    pausedUntil: 0,

    enqueue: function(raw, bg) {
        var self = this;
        if (TrRPG.wake) TrRPG.wake();
        var key = TrRPG.hashKey(raw);
        // Da co trong cache -> tra ngay
        var hit = TrRPG.Cache.get(key);
        if (hit !== undefined) return Promise.resolve(hit);
        // Dang dich roi -> cho ket qua chung (chong dich trung tuyet doi)
        if (self.inflight[key]) {
            // Dang co trong hang doi nen (quet map/database) ma gio can gap -> nang uu tien
            if (!bg) {
                for (var q = 0; q < self.pending.length; q++) {
                    if (self.pending[q].key === key && !self.pending[q].dup) self.pending[q].hi = true;
                }
            }
            return new Promise(function(resolve, reject) {
                self.pending.push({ key: key, raw: raw, resolve: resolve,
                                    reject: reject, dup: true });
            });
        }
        self.inflight[key] = true;
        var p = new Promise(function(resolve, reject) {
            self.pending.push({ key: key, raw: raw, resolve: resolve, reject: reject, hi: !bg });
        });
        self.schedule();
        return p;
    },

    // Mang loi / bi chan -> dung bat nguoi choi cho (xem waitTranslated)
    isDegraded: function() {
        return Date.now() < this.pausedUntil || this.failStreak >= 2;
    },

    schedule: function() {
        var self = this;
        if (self.timer) return;
        // Gom cac text xuat hien gan nhau (150ms) thanh 1 dot
        self.timer = setTimeout(function() {
            self.timer = null;
            self.pump();
        }, 150);
    },

    pump: function() {
        var self = this;
        if (Date.now() < self.pausedUntil) {
            self.schedule();
            return;
        }
        var engine = TrRPG.config.engine;
        // Index-Translate: gom toi da 6 cau / 1 request (danh so dong)
        if (engine === 'indextranslate') {
            while (self.pending.length > 0 && self.active < TrRPG.config.maxParallel) {
                var chunk = [];
                // Lay toi da 6 item: uu tien item gap (hoi thoai) truoc, nen sau
                for (var pass = 0; pass < 2 && chunk.length < 6; pass++) {
                    for (var i = 0; i < self.pending.length && chunk.length < 6; i++) {
                        var pi = self.pending[i];
                        if (pi.dup || pi.taken) continue;
                        if (pass === 0 && !pi.hi) continue;
                        pi.taken = true;
                        chunk.push(pi);
                    }
                }
                if (!chunk.length) break;
                self.active++;
                self.runBatch(chunk, engine);
            }
        } else {
            // Google / Bing: 1 cau / request, gioi han song song
            // Item gap (hoi thoai/menu) duoc vuot han muc 2 slot: request nen bi treo
            // khong the chan hoi thoai
            while (self.pending.length > 0 && self.active < TrRPG.config.maxParallel + 2) {
                var item = null, fallback = null;
                for (var j = 0; j < self.pending.length; j++) {
                    var pj = self.pending[j];
                    if (pj.dup || pj.taken) continue;
                    if (pj.hi) { item = pj; break; }   // item gap: lay ngay
                    if (!fallback) fallback = pj;      // item nen: chi lay khi het item gap
                }
                if (!item) item = fallback;
                if (!item) break;
                if (!item.hi && self.active >= Math.max(1, TrRPG.config.maxParallel - 1)) break;
                item.taken = true;
                self.active++;
                self.runOne(item, engine);
            }
        }
        if (self.pending.length > 0) self.schedule();
    },

    // Dich 1 cau voi retry + backoff mu
    runOne: function(item, engine) {
        var self = this;
        var src = TrRPG.config.sourceLanguage;
        var tgt = TrRPG.config.targetLanguage;
        var prot = TrRPG.Protect.protect(item.raw);

        function tryEngine(eng, attempt) {
            return TrRPG.Engines[eng](prot.text, src, tgt).catch(function(err) {
                var msg = String(err && err.message || err);
                var rateLimited = /429/.test(msg);
                // 429 hoac loi mang: doi roi thu lai (toi da 4 lan)
                if ((rateLimited || /timeout|network/i.test(msg)) && attempt < 2) {
                    var wait = Math.pow(2, attempt) * 1000 * (0.7 + Math.random() * 0.6);
                    return TrRPG.sleep(wait).then(function() {
                        return tryEngine(eng, attempt + 1);
                    });
                }
                throw err;
            });
        }

        tryEngine(engine, 0).catch(function() {
            // Engine chinh that bai -> thu engine du phong
            var fb = TrRPG.config.fallbackEngine;
            if (fb && fb !== 'none' && fb !== engine && TrRPG.Engines[fb]) {
                return tryEngine(fb, 0);
            }
            throw new Error('all engines failed');
        }).then(function(translatedProt) {
            var finalText = TrRPG.Protect.restore(translatedProt, prot.map);
            self.finishItem(item, finalText, null);
            self.failStreak = 0;
        }).catch(function(err) {
            self.failStreak++;
            // Loi lien tiep -> co the mat mang: tam dung 60s
            if (self.failStreak >= 5) self.pausedUntil = Date.now() + 60000;
            if (self.failStreak === 3) {
                TrRPG.Toast.show('Loi API dich (' + String((err && err.message) || err).slice(0,40) + '). Kiem tra mang!');
                setTimeout(function(){ TrRPG.Toast.hide(); }, 4000);
            }
            self.finishItem(item, null, err);
        }).then(function() {
            self.active--;
            self.pump();
        });
    },

    // Dich batch (Index-Translate): nhieu cau / 1 request
    runBatch: function(chunk, engine) {
        var self = this;
        var src = TrRPG.config.sourceLanguage;
        var tgt = TrRPG.config.targetLanguage;
        var prots = chunk.map(function(it) { return TrRPG.Protect.protect(it.raw); });
        var texts = prots.map(function(p) { return p.text; });

        function attempt(attemptN) {
            return TrRPG.Engines.indextranslateBatch(texts, src, tgt).catch(function(err) {
                var msg = String(err && err.message || err);
                if ((/429/.test(msg) || /timeout|network/i.test(msg)) && attemptN < 1) {
                    var wait = Math.pow(2, attemptN) * 1500 * (0.7 + Math.random() * 0.6);
                    return TrRPG.sleep(wait).then(function() { return attempt(attemptN + 1); });
                }
                throw err;
            });
        }

        attempt(0).catch(function() {
            // Batch hong -> roi ve dich tung cau bang engine du phong
            var fb = (TrRPG.config.fallbackEngine && TrRPG.config.fallbackEngine !== 'none')
                ? TrRPG.config.fallbackEngine : 'google';
            var seq = Promise.resolve();
            chunk.forEach(function(it, idx) {
                seq = seq.then(function() {
                    return TrRPG.Engines[fb](prots[idx].text, src, tgt).then(function(r) {
                        self.finishItem(it, TrRPG.Protect.restore(r, prots[idx].map), null);
                    }).catch(function() {
                        self.finishItem(it, null, new Error('batch fallback failed'));
                    });
                });
            });
            return seq;
        }).then(function(results) {
            // results chi co khi batch thanh cong
            if (results) {
                for (var i = 0; i < chunk.length; i++) {
                    var finalText = TrRPG.Protect.restore(results[i], prots[i].map);
                    self.finishItem(chunk[i], finalText, null);
                }
                self.failStreak = 0;
            }
        }).catch(function() {
            self.failStreak++;
            if (self.failStreak >= 5) self.pausedUntil = Date.now() + 60000;
        }).then(function() {
            self.active--;
            self.pump();
        });
    },

    finishItem: function(item, finalText, err) {
        var self = this;
        // Xoa khoi pending
        for (var i = self.pending.length - 1; i >= 0; i--) {
            if (self.pending[i].key === item.key) {
                var it = self.pending.splice(i, 1)[0];
                if (err) {
                    delete self.inflight[it.key];
                    TrRPG.stats.fail++;
                    TrRPG.stats.lastError = String((err && err.message) || err).slice(0, 80);
                    it.reject(err);
                } else {
                    TrRPG.stats.ok++;
                    TrRPG._needMenuRefresh = true;
                    if (TrRPG.scheduleRefresh) TrRPG.scheduleRefresh();
                    // Luu cache truoc khi tra ket qua
                    TrRPG.Cache.set(it.key, finalText);
                    delete self.inflight[it.key];
                    it.resolve(finalText);
                }
            }
        }
    }
};

//-----------------------------------------------------------------------------
// 7. API dich chinh
//-----------------------------------------------------------------------------
// t(): dong bo - tra ban dich neu co trong cache, khong thi tra text goc
// va dua vao hang doi dich ngam.
// 7b. TU DIEN VIET SAN: cac tu menu/thong dung dich NGAY LAP TUC,
// khong can doi API. Chi dung khi targetLanguage = 'vi'.
// (Hoc tu MTool: glossary uu tien hon engine dich)
TrRPG.GlossaryVI = {
'save': 'L\u01b0u', 'load': 'T\u1ea3i', 'warp': 'D\u1ecbch chuy\u1ec3n',
'difficulty': '\u0110\u1ed9 kh\u00f3', 'new game': 'Ch\u01a1i m\u1edbi',
'continue': 'Ti\u1ebfp t\u1ee5c', 'options': 'T\u00f9y ch\u1ecdn',
'quit game': 'Tho\u00e1t game', 'quit': 'Tho\u00e1t',
'title screen': 'M\u00e0n h\u00ecnh ch\u00ednh',
'fight': '\u0110\u00e1nh', 'escape': 'Ch\u1ea1y tr\u1ed1n',
'attack': 'T\u1ea5n c\u00f4ng', 'defend': 'Ph\u00f2ng th\u1ee7',
'guard': 'Ph\u00f2ng th\u1ee7', 'item': 'V\u1eadt ph\u1ea9m',
'skill': 'K\u1ef9 n\u0103ng', 'skills': 'K\u1ef9 n\u0103ng',
'equipment': 'Trang b\u1ecb', 'status': 'Tr\u1ea1ng th\u00e1i',
'sort': 'S\u1eafp x\u1ebfp', 'weapon': 'V\u0169 kh\u00ed',
'armor': 'Gi\u00e1p', 'key item': 'V\u1eadt ph\u1ea9m quan tr\u1ecdng',
'key items': 'V\u1eadt ph\u1ea9m quan tr\u1ecdng',
'best equipment': 'Trang b\u1ecb t\u1ed1t nh\u1ea5t',
'unequip all': 'Th\u00e1o h\u1ebft',
'buy': 'Mua', 'sell': 'B\u00e1n', 'cancel': 'H\u1ee7y',
'ok': '\u0110\u1ed3ng \u00fd', 'yes': 'C\u00f3', 'no': 'Kh\u00f4ng',
'level': 'C\u1ea5p', 'exp': 'Kinh nghi\u1ec7m', 'gold': 'V\u00e0ng',
'hp': 'HP', 'mp': 'MP', 'tp': 'TP',
'magic': 'Ma thu\u1eadt', 'special skill': 'K\u1ef9 n\u0103ng \u0111\u1eb7c bi\u1ec7t',
'easy': 'D\u1ec5', 'normal': 'Th\u01b0\u1eddng', 'hard': 'Kh\u00f3',
'victory': 'Chi\u1ebfn th\u1eafng', 'defeat': 'Th\u1ea5t b\u1ea1i',
'game over': 'Thua cu\u1ed9c', 'pause': 'T\u1ea1m d\u1eebng',
'help': 'Tr\u1ee3 gi\u00fap', 'close': '\u0110\u00f3ng',
'back': 'Quay l\u1ea1i', 'next': 'Ti\u1ebfp', 'previous': 'Tr\u01b0\u1edbc',
'settings': 'C\u00e0i \u0111\u1eb7t', 'language': 'Ng\u00f4n ng\u1eef',
'on': 'B\u1eadt', 'off': 'T\u1eaft', 'auto': 'T\u1ef1 \u0111\u1ed9ng',
'skip': 'B\u1ecf qua', 'confirm': 'X\u00e1c nh\u1eadn'
};

// Tra tu dien (khop chinh xac, khong phan biet hoa thuong)
TrRPG.glosa = function(text) {
    if (TrRPG.config.targetLanguage !== 'vi') return null;
    if (typeof text !== 'string') return null;
    var key = text.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TrRPG.GlossaryVI, key)) {
        return TrRPG.GlossaryVI[key];
    }
    return null;
};

TrRPG.t = function(text, bg) {
    // Tu dien uu tien so 1: dich ngay, khong can mang
    var g = TrRPG.glosa(text);
    if (g !== null) return g;
    if (!TrRPG.shouldTranslate(text)) return text;
    var key = TrRPG.hashKey(String(text));
    var hit = TrRPG.Cache.get(key);
    if (hit !== undefined) return hit;
    TrRPG.translateAsync(text, bg).catch(function() {}); // dich ngam, khong cho
    return text;
};

// translateAsync(): Promise tra ve ban dich day du (co protect/restore)
TrRPG.translateAsync = function(text, bg) {
    if (!TrRPG.shouldTranslate(text)) return Promise.resolve(text);
    var key = TrRPG.hashKey(String(text));
    var hit = TrRPG.Cache.get(key);
    if (hit !== undefined) return Promise.resolve(hit);
    return TrRPG.Queue.enqueue(String(text), bg);
};

//-----------------------------------------------------------------------------
// 8. Hook vao RPG Maker MV/MZ
//-----------------------------------------------------------------------------
// 8a. Hoi thoai: Game_Message.add (ma lenh 101/401/405)
TrRPG._origMessageAdd = Game_Message.prototype.add;
Game_Message.prototype.add = function(text) {
    var out = TrRPG.t(text);
    TrRPG._origMessageAdd.call(this, out);
    // Neu chua dich xong (tra ve text goc), khi dich xong thi va lai
    if (out === text && TrRPG.shouldTranslate(text)) {
        var msg = this;
        TrRPG.translateAsync(text).then(function(done) {
            try {
                var idx = msg._texts.indexOf(text);
                if (idx >= 0 && msg._texts[idx] === text) {
                    msg._texts[idx] = done;
                    TrRPG.refreshMessageWindow(text);
                }
            } catch (e) {}
        }).catch(function() {});
    }
};

// 8b. Lua chon: Game_Message.setChoices (ma lenh 102)
TrRPG._origSetChoices = Game_Message.prototype.setChoices;
Game_Message.prototype.setChoices = function(choices, defaultType, cancelType) {
    var self = this;
    var translated = choices.map(function(c) { return TrRPG.t(c); });
    TrRPG._origSetChoices.call(this, translated, defaultType, cancelType);
    choices.forEach(function(orig, i) {
        if (translated[i] === orig && TrRPG.shouldTranslate(orig)) {
            TrRPG.translateAsync(orig).then(function(done) {
                try {
                    if (self._choices[i] === orig) self._choices[i] = done;
                } catch (e) {}
            }).catch(function() {});
        }
    });
};

// Ve lai cua so message neu text vua duoc dich xong van dang hien thi
TrRPG.refreshMessageWindow = function(origText) {
    // v2.0: BO. Goi startMessage() khi cua so dang mo lam hong trang thai
    // (pause/wait) -> game dung hinh. Hoi thoai da duoc doi dich truoc khi mo.
};

// 8c. Menu lenh: Window_Command.addCommand
// (Dich ten lenh hien thi; symbol giu nguyen de khong vo logic game)
TrRPG._origAddCommand = Window_Command.prototype.addCommand;
Window_Command.prototype.addCommand = function(name, symbol, enabled, ext) {
    var tname = TrRPG.t(name);
    TrRPG._origAddCommand.call(this, tname, symbol, enabled, ext);
};

// 8d. Dich database ngay khi load xong (1 lan duy nhat)
// Bao gom: Actors, Classes, Skills, Items, Weapons, Armors, Enemies, States,
// System terms (ten lenh menu...), Troops khong can (text chay qua Game_Message)
TrRPG._dbDone = false;
TrRPG._origIsDatabaseLoaded = DataManager.isDatabaseLoaded;
DataManager.isDatabaseLoaded = function() {
    var loaded = TrRPG._origIsDatabaseLoaded.call(this);
    if (loaded && !TrRPG._dbDone) {
        TrRPG._dbDone = true;
        // Cho 1 frame de $data* on dinh roi dich
        setTimeout(function() { TrRPG.translateDatabase(); }, 100);
    }
    return loaded;
};

TrRPG.translateField = function(obj, field) {
    if (!obj || typeof obj[field] !== 'string') return;
    var orig = obj[field];
    if (!TrRPG.shouldTranslate(orig)) return;
    var done = TrRPG.t(orig, true);
    if (done !== orig) { obj[field] = done; return; }
    TrRPG.translateAsync(orig, true).then(function(res) {
        try { if (obj[field] === orig) obj[field] = res; } catch (e) {}
    }).catch(function() {});
};

TrRPG.translateDatabase = function() {
    try {
        var i, o;
        if (window.$dataActors) for (i = 1; i < $dataActors.length; i++) {
            o = $dataActors[i]; if (!o) continue;
            TrRPG.translateField(o, 'name');
            TrRPG.translateField(o, 'nickname');
            TrRPG.translateField(o, 'profile');
        }
        if (window.$dataClasses) for (i = 1; i < $dataClasses.length; i++) {
            o = $dataClasses[i]; if (o) TrRPG.translateField(o, 'name');
        }
        var dbs = ['$dataSkills', '$dataItems', '$dataWeapons', '$dataArmors'];
        for (var d = 0; d < dbs.length; d++) {
            var arr = window[dbs[d]];
            if (!arr) continue;
            for (i = 1; i < arr.length; i++) {
                o = arr[i]; if (!o) continue;
                TrRPG.translateField(o, 'name');
                TrRPG.translateField(o, 'description');
            }
        }
        if (window.$dataEnemies) for (i = 1; i < $dataEnemies.length; i++) {
            o = $dataEnemies[i]; if (o) TrRPG.translateField(o, 'name');
        }
        if (window.$dataStates) for (i = 1; i < $dataStates.length; i++) {
            o = $dataStates[i]; if (o) TrRPG.translateField(o, 'name');
        }
        // $dataSystem: dich terms + cac mang text hien trong game
        // (armorTypes, elements, equipTypes, skillTypes, weaponTypes,
        //  switches, variables). Bo qua gameTitle, ten file am thanh/nhac,
        //  font, locale, khoa ma hoa.
        if (window.$dataSystem) {
            if ($dataSystem.terms) TrRPG.translateObjectStrings($dataSystem.terms);
            var sysFields = ['armorTypes', 'weaponTypes', 'equipTypes',
                             'elements', 'skillTypes', 'switches', 'variables'];
            for (var sf = 0; sf < sysFields.length; sf++) {
                if ($dataSystem[sysFields[sf]]) {
                    TrRPG.translateObjectStrings($dataSystem[sysFields[sf]]);
                }
            }
        }
    } catch (e) { /* khong de vo game */ }
};

TrRPG.translateObjectStrings = function(obj) {
    if (typeof obj === 'string') return obj; // tra ve de caller gan lai
    if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            if (typeof obj[i] === 'string') {
                var done = TrRPG.t(obj[i], true);
                if (done !== obj[i]) { obj[i] = done; }
                else {
                    (function(o, idx, orig) {
                        TrRPG.translateAsync(orig, true).then(function(res) {
                            try { if (o[idx] === orig) o[idx] = res; } catch (e) {}
                        }).catch(function() {});
                    })(obj, i, obj[i]);
                }
            } else if (obj[i] && typeof obj[i] === 'object') {
                TrRPG.translateObjectStrings(obj[i]);
            }
        }
        return;
    }
    for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (typeof obj[k] === 'string') {
            var d2 = TrRPG.t(obj[k], true);
            if (d2 !== obj[k]) { obj[k] = d2; }
            else {
                (function(o2, key, orig2) {
                    TrRPG.translateAsync(orig2, true).then(function(res) {
                        try { if (o2[key] === orig2) o2[key] = res; } catch (e) {}
                    }).catch(function() {});
                })(obj, k, obj[k]);
            }
        } else if (obj[k] && typeof obj[k] === 'object') {
            TrRPG.translateObjectStrings(obj[k]);
        }
    }
};

// 8e. Khi vao map moi: dich truoc ten map + quet text su kien (401/405/102)
// De khi nguoi choi doc thi da co san trong cache
TrRPG._lastMapId = 0;
TrRPG._origIsMapLoaded = DataManager.isMapLoaded;
DataManager.isMapLoaded = function() {
    var loaded = TrRPG._origIsMapLoaded.call(this);
    if (loaded && window.$dataMap && $gameMap && $gameMap.mapId() !== TrRPG._lastMapId) {
        TrRPG._lastMapId = $gameMap.mapId();
        setTimeout(function() { TrRPG.scanCurrentMap(); }, 300);
    }
    return loaded;
};

TrRPG.scanCurrentMap = function() {
    try {
        if (!window.$dataMap || !$dataMap.events) return;
        // Ten map
        TrRPG.translateField($dataMap, 'displayName');
        var seen = {};
        var queue = [];
        function push(t) {
            if (!t || seen[t]) return;
            if (!TrRPG.shouldTranslate(t)) return;
            var key = TrRPG.hashKey(t);
            if (TrRPG.Cache.get(key) !== undefined) return;
            seen[t] = true;
            queue.push(t);
        }
        function scanList(list) {
            if (!list) return;
            for (var i = 0; i < list.length; i++) {
                var ev = list[i];
                if (!ev || ev.code === 108 || ev.code === 408) continue; // bo comment
                if (ev.code === 355 || ev.code === 655) continue;         // bo script
                if (ev.code === 401 || ev.code === 405) push(ev.parameters[0]);
                else if (ev.code === 357) {
                    // Plugin command (MZ): dich truoc field text cua plugin da biet
                    var pp = ev.parameters || [];
                    var pfields = pp.length >= 4 && TrRPG.PluginTextFields[pp[0]] &&
                                  TrRPG.PluginTextFields[pp[0]][pp[1]];
                    if (pfields) {
                        var aobj = pp[3];
                        if (typeof aobj === 'string') {
                            try { aobj = JSON.parse(aobj); } catch (e) { aobj = null; }
                        }
                        if (aobj && typeof aobj === 'object') {
                            for (var fi = 0; fi < pfields.length; fi++) {
                                if (typeof aobj[pfields[fi]] === 'string') push(aobj[pfields[fi]]);
                            }
                        }
                    }
                }
                else if (ev.code === 102) {
                    var ch = ev.parameters[0];
                    for (var c = 0; c < ch.length; c++) push(ch[c]);
                }
            }
        }
        // Su kien trong map
        for (var id in $dataMap.events) {
            var event = $dataMap.events[id];
            if (!event || !event.pages) continue;
            for (var p = 0; p < event.pages.length; p++) {
                scanList(event.pages[p].list);
            }
        }
        // Troops (su kien trong battle) - chi quet 1 lan / phien (khong quet lai moi map)
        if (!TrRPG._scannedGlobal && window.$dataTroops) {
            for (var tp = 1; tp < $dataTroops.length; tp++) {
                var troop = $dataTroops[tp];
                if (!troop || !troop.pages) continue;
                for (var pg = 0; pg < troop.pages.length; pg++) {
                    scanList(troop.pages[pg].list);
                }
            }
        }
        // Common events (su kien chung)
        if (!TrRPG._scannedGlobal && window.$dataCommonEvents) {
            for (var ce = 1; ce < $dataCommonEvents.length; ce++) {
                if ($dataCommonEvents[ce]) scanList($dataCommonEvents[ce].list);
            }
        }
        TrRPG._scannedGlobal = true;
        if (TrRPG.wake) TrRPG.wake();
        // Dich ngam theo dot nho (tranh treo game)
        (function next(idx) {
            if (idx >= queue.length) return;
            var end = Math.min(idx + 10, queue.length);
            for (var k = idx; k < end; k++) TrRPG.translateAsync(queue[k], true).catch(function() {});
            setTimeout(function() { next(end); }, 400);
        })(0);
    } catch (e) { /* khong de vo game */ }
};

//-----------------------------------------------------------------------------
// 8e2. Plugin command hien text (VD: TorigoyaMZ_NotifyMessage notify).
// Nhieu game khong dung message chuan ma dung plugin rieng -> phai bat o day.
// Them plugin/field moi vao ban do nay khi gap game khac.
TrRPG.PluginTextFields = {
'TorigoyaMZ_NotifyMessage': { 'notify': ['message'] },
'TextPicture': { 'set': ['text'] },
'DTextPicture': { 'dText': ['text'] }
};

// Hook PluginManager.callCommand (RPG Maker MZ): chan plugin command truoc khi chay,
// dich san cac field text. Dung ban copy cua args de khong lam ban du lieu game.
if (typeof PluginManager !== 'undefined' && PluginManager.callCommand) {
TrRPG._origCallCommand = PluginManager.callCommand;
PluginManager.callCommand = function(interpreter, pluginName, commandName, args) {
var self = this;
try {
var fields = TrRPG.PluginTextFields[pluginName] && TrRPG.PluginTextFields[pluginName][commandName];
if (fields && args) {
var copy = {};
for (var k in args) { if (Object.prototype.hasOwnProperty.call(args, k)) copy[k] = args[k]; }
var changed = false;
for (var i = 0; i < fields.length; i++) {
var f = fields[i];
if (typeof copy[f] === 'string' && TrRPG.shouldTranslate(copy[f])) {
var tr = TrRPG.t(copy[f]);
if (tr !== copy[f]) { copy[f] = tr; changed = true; }
}
}
if (changed) args = copy;
}
} catch (e) {}
return TrRPG._origCallCommand.call(this, interpreter, pluginName, commandName, args);
};
}

//-----------------------------------------------------------------------------
// 8e3. Dich THAM SO plugin (VD: menu custom Save/Load/Warp/Difficulty cua
// SceneCustomMenu). Nhieu plugin doc text tu parameters thay vi event.
// Cach hoat dong: chan PluginManager.parameters() + quet chu dong sau khi boot.
// LUU Y: dat TrRPG LEN DAU danh sach plugin de bat duoc luc plugin khac doc params.
TrRPG.PluginParamSkipKey = /bgm|bgs|\bme\b|\bse\b|sound|music|audio|file|filename|image|\bimg\b|picture|\bbg\b|background|font|src|url|path|icon/i;
TrRPG.PluginParamSkipVal = /\.(png|jpe?g|ogg|m4a|wav|mp3|json|woff2?|eot|ttf|webm)$/i;

TrRPG._looksLikeParamText = function(key, val) {
    if (typeof val !== 'string') return false;
    var v = val.trim();
    if (!v) return false;
    if (TrRPG.PluginParamSkipKey.test(key)) return false;
    if (TrRPG.PluginParamSkipVal.test(v)) return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return false;
    if (/^(true|false)$/i.test(v)) return false;
    if (/^#?[0-9a-f]{6}$/i.test(v)) return false;
    return TrRPG.shouldTranslate(v);
};

// De quy dich object params (g�m ca struct JSON dang chuoi)
TrRPG._translateParamObj = function(obj) {
    if (!obj || typeof obj !== 'object') return false;
    var changed = false;
    for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        var v = obj[k];
        if (typeof v === 'string') {
            // Struct JSON? -> parse de quy
            var t = v.trim();
            if ((t.charAt(0) === '{' && t.charAt(t.length-1) === '}') ||
                (t.charAt(0) === '[' && t.charAt(t.length-1) === ']')) {
                try {
                    var sub = JSON.parse(v);
                    if (TrRPG._translateParamObj(sub)) {
                        obj[k] = JSON.stringify(sub);
                        changed = true;
                    }
                    continue;
                } catch (e) {}
            }
            if (TrRPG._looksLikeParamText(k, v)) {
                var tr = TrRPG.t(v);
                if (tr !== v) { obj[k] = tr; changed = true; }
            }
        } else if (v && typeof v === 'object') {
            if (TrRPG._translateParamObj(v)) changed = true;
        }
    }
    return changed;
};

// Hook PluginManager.parameters: dich ngay khi plugin doc params
if (typeof PluginManager !== 'undefined' && PluginManager.parameters && TrRPG.config.translatePluginParams) {
    TrRPG._origParameters = PluginManager.parameters;
    PluginManager.parameters = function(name) {
        var p = TrRPG._origParameters.call(this, name);
        try {
            if (p && name !== 'TrRPG') TrRPG._translateParamObj(p);
        } catch (e) {}
        return p;
    };
}

// Quet chu dong: sau khi boot, dich het params cua cac plugin (cho plugin doc lazy)
TrRPG.translateAllPluginParams = function() {
    try {
        if (!TrRPG.config.translatePluginParams || !PluginManager._parameters) return;
        for (var pname in PluginManager._parameters) {
            if (pname === 'TrRPG') continue;
            var p = PluginManager._parameters[pname];
            if (p) TrRPG._translateParamObj(p);
        }
    } catch (e) {}
};

//-----------------------------------------------------------------------------
// 8f. EP HIEN TIENG VIET: doi dich xong moi mo cua so hoi thoai/lua chon
// (Khong hien tieng Anh nhap nhay nhu ban cu - giong MTool dich truoc roi choi)
//-----------------------------------------------------------------------------
TrRPG._inStartMessage = false;
TrRPG._inChoiceStart = false;

TrRPG.Toast = {
    el: null,
    show: function(msg) {
        try {
            if (!this.el) {
                var d = document.createElement('div');
                d.setAttribute('style', 'position:fixed;z-index:100000;left:50%;bottom:18%;' +
                    'transform:translateX(-50%);background:rgba(10,10,20,0.85);color:#fff;' +
                    'padding:8px 16px;border-radius:20px;font-family:sans-serif;' +
                    'font-size:14px;pointer-events:none;');
                document.body.appendChild(d);
                this.el = d;
            }
            this.el.textContent = msg;
            this.el.style.display = 'block';
            var me = this;
            clearTimeout(this._t);
            this._t = setTimeout(function() { me.hide(); }, 5500); // khong bao gio ket
        } catch (e) {}
    },
    hide: function() {
        try { if (this.el) this.el.style.display = 'none'; } catch (e) {}
    }
};

// Doi tat ca cac cau trong list dich xong roi moi goi callback.
// Neu qua 12s van chua xong (mat mang...) thi hien text goc de khong treo game.
TrRPG.waitTranslated = function(texts, callback) {
    var need = [];
    var seen = {};
    for (var i = 0; i < texts.length; i++) {
        var t = texts[i];
        if (!t || seen[t]) continue;
        seen[t] = true;
        if (TrRPG.shouldTranslate(t) && TrRPG.glosa(t) === null &&
            TrRPG.Cache.get(TrRPG.hashKey(t)) === undefined) {
            need.push(t);
        }
    }
    if (!need.length || !TrRPG.enabled) { callback(); return; }
    var all = [];
    try {
        all = need.map(function(t) {
            return TrRPG.translateAsync(t).catch(function() { return t; });
        });
    } catch (e) { callback(); return; }
    // API dang loi/bi chan: KHONG bat nguoi choi cho, hien goc ngay, dich tiep ngam
    if (TrRPG.Queue.isDegraded()) { callback(); return; }
    TrRPG.Toast.show('Dang dich... (bam de bo qua)');
    var done = false;
    var timer = null, poll = null;
    var finish = function() {
        if (done) return;
        done = true;
        clearTimeout(timer); clearInterval(poll);
        TrRPG.Toast.hide();
        callback();
    };
    timer = setTimeout(finish, 4000);
    // Nguoi choi bam OK / cancel / cham man hinh -> bo qua cho ngay (khong con "bam gi cung khong duoc")
    poll = setInterval(function() {
        try {
            if ((typeof Input !== 'undefined' && (Input.isPressed('ok') || Input.isPressed('cancel') ||
                 Input.isPressed('escape'))) ||
                (typeof TouchInput !== 'undefined' && TouchInput.isPressed())) finish();
        } catch (e) {}
    }, 40);
    Promise.all(all).then(finish, finish);
};

// Thay lua chon bang ban dich (dong bo, tu cache/tu dien)
TrRPG._subChoices = function() {
    try {
        var ch = $gameMessage._choices;
        for (var i = 0; i < ch.length; i++) {
            var tr = TrRPG.t(ch[i]);
            if (tr !== ch[i]) ch[i] = tr;
        }
    } catch (e) {}
};
TrRPG._choiceWaitDone = false;
if (typeof Game_Message !== 'undefined') {
    TrRPG._origMsgClear = Game_Message.prototype.clear;
    Game_Message.prototype.clear = function() {
        TrRPG._choiceWaitDone = false;
        return TrRPG._origMsgClear.apply(this, arguments);
    };
}

//-----------------------------------------------------------------------------
// 8f. EP HIEN TIENG VIET - cho dich o TANG SU KIEN (Game_Interpreter)
//-----------------------------------------------------------------------------
// v2.2: KHONG hoan startMessage / ChoiceList.start / ScrollText nua (cach cu de
// xung dot voi plugin tin nhan/menu cua game -> do cung). Thay vao do, lenh
// Hien thi van ban / Lua chon / Cuon chu / Plugin command doi TRUOC KHI chay
// bang cach tra false cho interpreter (giong lenh "Wait"): game van chay,
// cua so van binh thuong. Toi da 4 giay; bam OK/cham man hinh la bo qua.
TrRPG.WAIT_MS = 4000;

TrRPG._needTexts = function(texts) {
    var need = [], seen = {};
    for (var i = 0; i < texts.length; i++) {
        var t = texts[i];
        if (typeof t !== 'string' || !t || seen[t]) continue;
        seen[t] = true;
        if (TrRPG.shouldTranslate(t) && TrRPG.glosa(t) === null &&
            TrRPG.Cache.get(TrRPG.hashKey(t)) === undefined) need.push(t);
    }
    return need;
};

TrRPG._userSkip = function() {
    try {
        return (typeof Input !== 'undefined' && (Input.isPressed('ok') ||
                Input.isPressed('cancel') || Input.isPressed('escape'))) ||
               (typeof TouchInput !== 'undefined' && TouchInput.isPressed());
    } catch (e) { return false; }
};

TrRPG._collectAhead = function(list, from, n) {
    var out = [];
    if (!list) return out;
    for (var i = from; i < list.length && i < from + n; i++) {
        var c = list[i];
        if (!c || !c.parameters) continue;
        if (c.code === 401 || c.code === 405) out.push(c.parameters[0]);
        else if (c.code === 102 && c.parameters[0]) out = out.concat(c.parameters[0]);
    }
    return out;
};

// true = interpreter phai doi (caller return false)
TrRPG.interpWait = function(it, texts, ahead) {
    try {
        if (!TrRPG.enabled) return false;
        var st = it._trrpgW;
        if (st && st.idx === it._index && st.list === it._list) {
            if (st.done) return false;
            if (st.fin || Date.now() - st.t0 > TrRPG.WAIT_MS ||
                TrRPG.Queue.isDegraded() || TrRPG._userSkip()) {
                st.done = true; TrRPG.Toast.hide();
                return false;
            }
            return true;
        }
        st = { idx: it._index, list: it._list, t0: Date.now(), fin: false, done: false };
        it._trrpgW = st;
        // doc truoc ~40 lenh sap toi (khong chan)
        if (ahead) {
            var an = TrRPG._needTexts(ahead).slice(0, 30);
            for (var k = 0; k < an.length; k++) TrRPG.translateAsync(an[k]).catch(function() {});
        }
        var need = TrRPG._needTexts(texts);
        if (!need.length) { st.done = true; return false; }
        if (TrRPG.Queue.isDegraded()) {
            // API loi: dich ngam, hien goc ngay, khong bat nguoi choi cho
            for (var q = 0; q < need.length; q++) TrRPG.translateAsync(need[q]).catch(function() {});
            st.done = true;
            return false;
        }
        Promise.all(need.map(function(t) {
            return TrRPG.translateAsync(t).catch(function() { return t; });
        })).then(function() { st.fin = true; });
        TrRPG.Toast.show('Dang dich... (bam de bo qua)');
        return true;
    } catch (e) { return false; }
};

TrRPG._hookInterpreter = function() {
    if (typeof Game_Interpreter === 'undefined') return;
    var GI = Game_Interpreter.prototype;

    var o101 = GI.command101;
    if (o101) GI.command101 = function() {
        try {
            if (!$gameMessage.isBusy()) {
                var list = this._list, i = this._index, texts = [];
                var c = list && list[i];
                if (c && c.parameters && c.parameters[4]) texts.push(c.parameters[4]); // ten nguoi noi (MZ)
                var j = i + 1;
                while (list && list[j] && list[j].code === 401) { texts.push(list[j].parameters[0]); j++; }
                if (list && list[j] && list[j].code === 102) texts = texts.concat(list[j].parameters[0] || []);
                if (TrRPG.interpWait(this, texts, TrRPG._collectAhead(list, j, 40))) return false;
            }
        } catch (e) {}
        return o101.apply(this, arguments);
    };

    var o102 = GI.command102;   // lua chon dung rieng (VD: phong ky uc)
    if (o102) GI.command102 = function() {
        try {
            if (!$gameMessage.isBusy()) {
                var list = this._list, c = list && list[this._index];
                if (c && c.parameters && TrRPG.interpWait(this, c.parameters[0] || [],
                        TrRPG._collectAhead(list, this._index + 1, 40))) return false;
            }
        } catch (e) {}
        return o102.apply(this, arguments);
    };

    var o105 = GI.command105;   // chu cuon
    if (o105) GI.command105 = function() {
        try {
            if (!$gameMessage.isBusy()) {
                var list = this._list, i = this._index, texts = [], j = i + 1;
                while (list && list[j] && list[j].code === 405) { texts.push(list[j].parameters[0]); j++; }
                if (TrRPG.interpWait(this, texts, TrRPG._collectAhead(list, j, 40))) return false;
            }
        } catch (e) {}
        return o105.apply(this, arguments);
    };

    var o357 = GI.command357;   // plugin command co text (Notify...)
    if (o357) GI.command357 = function() {
        try {
            var c = this._list && this._list[this._index];
            var p = c && c.parameters;
            var f = p && TrRPG.PluginTextFields[p[0]] && TrRPG.PluginTextFields[p[0]][p[1]];
            if (f && p[3] && typeof p[3] === 'object') {
                var texts = [];
                for (var k = 0; k < f.length; k++) if (typeof p[3][f[k]] === 'string') texts.push(p[3][f[k]]);
                if (texts.length && TrRPG.interpWait(this, texts, null)) return false;
            }
        } catch (e) {}
        return o357.apply(this, arguments);
    };
};
TrRPG._hookInterpreter();

// Thay lua chon bang ban dich (dong bo, tu cache/tu dien)
TrRPG._subChoices = function() {
    try {
        var ch = $gameMessage._choices;
        for (var i = 0; i < ch.length; i++) {
            var tr = TrRPG.t(ch[i]);
            if (tr !== ch[i]) ch[i] = tr;
        }
    } catch (e) {}
};
TrRPG._subTexts = function() {
    try {
        var tx = $gameMessage._texts;
        for (var i = 0; i < tx.length; i++) {
            var tr = TrRPG.t(tx[i]);
            if (tr !== tx[i]) tx[i] = tr;
        }
    } catch (e) {}
};

// Ten nguoi noi (MZ) -> dich ngay khi duoc dat
if (typeof Game_Message !== 'undefined' && Game_Message.prototype.setSpeakerName) {
    TrRPG._origSetSpeaker = Game_Message.prototype.setSpeakerName;
    Game_Message.prototype.setSpeakerName = function(name) {
        return TrRPG._origSetSpeaker.call(this, TrRPG.t(name));
    };
}

// Cac cua so CHI thay chu dong bo (khong hoan, khong doi) - an toan voi moi plugin
TrRPG._origStartMessage = Window_Message.prototype.startMessage;
Window_Message.prototype.startMessage = function() {
    TrRPG._subTexts();
    return TrRPG._origStartMessage.apply(this, arguments);
};
if (typeof Window_ChoiceList !== 'undefined') {
    TrRPG._origChoiceStart = Window_ChoiceList.prototype.start;
    Window_ChoiceList.prototype.start = function() {
        TrRPG._subChoices();
        return TrRPG._origChoiceStart.apply(this, arguments);
    };
}
if (typeof Window_ScrollText !== 'undefined') {
    TrRPG._origScrollStartMessage = Window_ScrollText.prototype.startMessage;
    Window_ScrollText.prototype.startMessage = function() {
        TrRPG._subTexts();
        return TrRPG._origScrollStartMessage.apply(this, arguments);
    };
}

// 8i. LOP VE CHU (render hook) - giong cach MTool lam.
// Moi text duoc ve len bat ky cua so nao (menu custom, Save/Load/Warp, lua chon
// do plugin tu ve, ten nguoi noi...) deu di qua day:
//   co ban dich -> doi ngay | chua co -> dich ngam, dich xong TU VE LAI cua so do.
// Khong phu thuoc plugin game goi addCommand hay setChoices hay khong.
TrRPG._pendingWins = [];
TrRPG._renderInflight = {};
TrRPG._renderFail = {};
TrRPG._renderBudget = { t: 0, n: 0 };
TrRPG._numMark = /\u3014\s*N\s*(\d+)\s*\u3015/gi;

TrRPG._memoSet = function(k, v) {
    if (TrRPG._memoN > 4000) { TrRPG._memo = Object.create(null); TrRPG._memoN = 0; }
    TrRPG._memo[k] = v; TrRPG._memoN++;
};

// Dien lai so vao mau da dich: "Vang: <N0>" -> "Vang: 123". Hong marker -> null.
TrRPG._fillNums = function(str, nums) {
    var used = 0;
    var out = String(str).replace(TrRPG._numMark, function(m, i) {
        i = parseInt(i, 10);
        if (i >= 0 && i < nums.length) { used++; return nums[i]; }
        return m;
    });
    return used >= nums.length ? out : null;
};

TrRPG._noRefreshWin = function(w) {
    return (typeof Window_Message !== 'undefined' && w instanceof Window_Message) ||
           (typeof Window_ScrollText !== 'undefined' && w instanceof Window_ScrollText) ||
           (typeof Window_ChoiceList !== 'undefined' && w instanceof Window_ChoiceList);
};

TrRPG._renderEnqueue = function(text, win) {
    var b = TrRPG._renderBudget, now = Date.now();
    if (now - b.t > 2000) { b.t = now; b.n = 0; }
    if (++b.n > 60) return;                       // chong "bao" text dong lien tuc
    if (TrRPG._renderInflight[text]) {
        if (win && !win._trrpgPending && !TrRPG._noRefreshWin(win)) { win._trrpgPending = true; TrRPG._pendingWins.push(win); }
        return;
    }
    var f = TrRPG._renderFail[text];
    if (f && now - f < 30000) return;             // vua loi -> 30s sau moi thu lai
    if (!TrRPG.shouldTranslate(text)) return;
    if (win && !win._trrpgPending && !TrRPG._noRefreshWin(win)) { win._trrpgPending = true; TrRPG._pendingWins.push(win); }
    TrRPG._renderInflight[text] = true;
    TrRPG.translateAsync(text).then(function() {
        delete TrRPG._renderInflight[text];
    }, function() {
        delete TrRPG._renderInflight[text];
        TrRPG._renderFail[text] = Date.now();
    });
};

// Tra ve ban dich neu co; neu chua co: tra text goc + dich ngam + danh dau cua so de ve lai
TrRPG.tRender = function(text, win) {
    if (typeof text !== 'string' || !TrRPG.enabled) return text;
    var len = text.length;
    if (len < 2 || len > 400) return text;
    var m = TrRPG._memo[text];
    if (m !== undefined) return m;
    var g = TrRPG.glosa(text);
    if (g !== null) { TrRPG._memoSet(text, g); return g; }
    if (!TrRPG.shouldTranslate(text)) { TrRPG._memoSet(text, text); return text; }
    var hit = TrRPG.Cache.get(TrRPG.hashKey(text));
    if (hit !== undefined) { TrRPG._memoSet(text, hit); return hit; }
    // Text co so (Gold: 123, Day 5...): dich "mau" voi so thay bang marker,
    // tranh moi gia tri la 1 cau moi gui len API
    if (/\d/.test(text) && text.indexOf('\\') < 0) {
        var nums = [];
        var tpl = text.replace(/\d+(?:[.,]\d+)*/g, function(n) {
            nums.push(n); return '\u3014N' + (nums.length - 1) + '\u3015';
        });
        var hasWord = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/
                      .test(tpl.replace(/\u3014N\d+\u3015/g, ''));
        if (nums.length <= 8 && hasWord) {
            var th = TrRPG.Cache.get(TrRPG.hashKey(tpl));
            if (th !== undefined) {
                var filled = TrRPG._fillNums(th, nums);
                if (filled === null) filled = text;   // API lam mat marker -> giu goc
                TrRPG._memoSet(text, filled); TrRPG._memoSet(filled, filled);
                return filled;
            }
            TrRPG._renderEnqueue(tpl, win);
            return text;
        }
    }
    TrRPG._renderEnqueue(text, win);
    return text;
};

TrRPG.scheduleRefresh = function() {
    if (TrRPG._refTimer || !TrRPG._pendingWins.length) return;
    TrRPG._refTimer = setTimeout(function() {
        TrRPG._refTimer = null;
        try { TrRPG.refreshPendingWindows(); } catch (e) {}
    }, 250);
};

// Ve lai cac cua so da ve text chua dich (chi cua so duoc danh dau)
TrRPG.refreshPendingWindows = function() {
    var list = TrRPG._pendingWins;
    TrRPG._pendingWins = [];
    for (var i = 0; i < list.length; i++) {
        var w = list[i];
        w._trrpgPending = false;
        try {
            if (!w.parent || w.visible === false || !w.refresh) continue;
            if (w.isOpen && !w.isOpen()) continue;
            TrRPG.redrawWindow(w);
        } catch (e) {}
    }
};

if (TrRPG.config.renderHook) {
    // Ten lenh cua Window_Command (ke ca khi plugin tu push vao _list, bo qua addCommand)
    if (Window_Command.prototype.commandName) {
        TrRPG._origCommandName = Window_Command.prototype.commandName;
        Window_Command.prototype.commandName = function(index) {
            return TrRPG.tRender(TrRPG._origCommandName.call(this, index), this);
        };
    }
    // --- Tu co chu cho vua khung (MTool-style auto-fit) ---
    // Tieng Viet dai hon tieng Anh -> khung/vi tri do plugin tinh theo chu goc
    // se cat chu. Giai phap: giu nguyen TAM chu neu plugin da can giua,
    // va thu nho co chu vua du cho trong.
    TrRPG._origResetFont = Window_Base.prototype.resetFontSettings;
    Window_Base.prototype.resetFontSettings = function() {
        TrRPG._origResetFont.call(this);
        if (this._trrpgScale && this.contents) {
            this.contents.fontSize = Math.max(10, Math.floor(this.contents.fontSize * this._trrpgScale));
        }
    };
    TrRPG._measure = function(win, text) {
        try {
            win._trrpgScale = 0;
            if (win.textSizeEx) return win.textSizeEx(text).width;
            return win.textWidth(win.convertEscapeCharacters ? win.convertEscapeCharacters(text) : text);
        } catch (e) { return 0; }
    };
    TrRPG._origDrawText = Window_Base.prototype.drawText;
    Window_Base.prototype.drawText = function(text, x, y, maxWidth, align) {
        return TrRPG._origDrawText.call(this, TrRPG.tRender(text, this), x, y, maxWidth, align);
    };
    TrRPG._origDrawTextEx = Window_Base.prototype.drawTextEx;
    Window_Base.prototype.drawTextEx = function(text, x, y, width) {
        var args = Array.prototype.slice.call(arguments);
        var tr = TrRPG.tRender(text, this);
        args[0] = tr;
        this._trrpgScale = 0;
        if (tr !== text && typeof text === 'string' && typeof x === 'number' &&
            !TrRPG._noRefreshWin(this) && this.contents) {
            try {
                var cw = this.contents.width;
                var w0 = TrRPG._measure(this, text);
                var w1 = TrRPG._measure(this, tr);
                var nx = x, avail;
                if (x > 12 && w0 > 0) {
                    // plugin da can giua/can phai theo chu goc -> giu nguyen tam
                    var c = x + w0 / 2;
                    avail = 2 * Math.min(c - 4, cw - c - 4);
                    nx = c - Math.min(w1, avail) / 2;
                } else {
                    avail = (typeof width === 'number' && width > 0 ? width : cw - x) - 2;
                }
                var scale = (avail > 0 && w1 > avail) ? Math.max(0.45, avail / w1) : 0;
                args[1] = nx;
                this._trrpgScale = scale;
                if (scale) {
                    // chi so lai neu thu nho van chua du: de plugin tu cat nhu cu
                }
            } catch (e) { this._trrpgScale = 0; }
        }
        var r;
        try { r = TrRPG._origDrawTextEx.apply(this, args); }
        finally { this._trrpgScale = 0; }
        return r;
    };
}

//-----------------------------------------------------------------------------
// 9. Giao dien nut cai dat (goc man hinh)
//-----------------------------------------------------------------------------
// Refresh cac cua so lenh dang mo de nhan ban dich moi tu cache.
// (Menu custom dung Window_Command se tu doi sang tieng Viet, khong can tai lai)
TrRPG.redrawWindow = function(w) {
    if (w.drawAllItems && w.contents) { w.contents.clear(); w.drawAllItems(); return; }
    if (w.refresh) w.refresh();
};

TrRPG.refreshCommandWindows = function() {
    try {
        // Khong refresh khi dang co hoi thoai (tranh nhap nhay)
        if (TrRPG._inStartMessage || TrRPG._inChoiceStart || TrRPG._inScrollStart) return;
        var scene = (typeof SceneManager !== 'undefined') ? SceneManager._scene : null;
        if (!scene || !scene._windowLayer) return;
        var kids = scene._windowLayer.children || [];
        for (var i = 0; i < kids.length; i++) {
            var w = kids[i];
            if (!w || !w.refresh || !w._list) continue;
            var cn = (w.constructor && w.constructor.name) || '';
            // Chi refresh command window (menu), khong dung toi message window
            if (cn.indexOf('Command') >= 0 && w.isOpen && w.isOpen() && w.visible) {
                try { TrRPG.redrawWindow(w); } catch (e) {}
            }
        }
    } catch (e) {}
};

TrRPG.UI = {
    root: null, panel: null,

    css: function() {
        return 'position:fixed;z-index:99999;font-family:sans-serif;font-size:13px;';
    },

    build: function() {
        if (!TrRPG.config.showButton || this.root) return;
        var self = this;
        var btn = document.createElement('div');
        btn.id = 'trrpg_btn';
        btn.textContent = '⚙🌐';
        btn.setAttribute('style', this.css() +
            'left:8px;top:40%;width:38px;height:38px;line-height:38px;text-align:center;' +
            'background:rgba(20,20,30,0.75);color:#fff;border-radius:8px;cursor:pointer;' +
            'border:1px solid #666;user-select:none;');
        btn.onclick = function() { self.togglePanel(); };
        document.body.appendChild(btn);
        this.root = btn;
    },

    togglePanel: function() {
        if (this.panel) {
            document.body.removeChild(this.panel);
            this.panel = null;
            return;
        }
        var self = this;
        var p = document.createElement('div');
        p.setAttribute('style', this.css() +
            'left:54px;top:30%;width:230px;padding:12px;' +
            'background:rgba(15,15,25,0.95);color:#fff;border-radius:10px;' +
            'border:1px solid #888;');
        var html = '<b>TrRPG v' + TrRPG.VERSION + '</b><br><br>' +
            'Engine: <select id="trrpg_eng" style="width:100%;margin:4px 0;">' +
            '<option value="google">Google Dich</option>' +
            '<option value="bing">Bing Microsoft</option>' +
            '<option value="indextranslate">Index-Translate 35B (AI)</option>' +
            '</select>' +
            'Ngon ngu dich: <input id="trrpg_tgt" value="' +
            TrRPG.config.targetLanguage.replace(/"/g, '') +
            '" style="width:100%;margin:4px 0;" maxlength="10"><br>' +
            '<label><input type="checkbox" id="trrpg_on"' +
            (TrRPG.enabled ? ' checked' : '') + '> Bat dich tu dong</label><br>' +
            '<label><input type="checkbox" id="trrpg_autooff"' + (TrRPG.config.autoOff ? ' checked' : '') + '> Tu tat khi dich xong</label><br><br>' +
            '<button id="trrpg_clear" style="width:100%;margin:3px 0;">Xoa cache dich</button>' +
            '<button id="trrpg_prescan" style="width:100%;margin:3px 0;">Quet & dich truoc map nay</button>' +
            '<div style="margin-top:8px;color:#9d9;">Da dich: <span id="trrpg_count">' +
            TrRPG.translatedCount + '</span> cau</div>' +
            '<div style="margin-top:4px;font-size:11px;">API: <span id="trrpg_api">...</span></div>' +
            '<div style="font-size:11px;color:#f99;">Loi: <span id="trrpg_err">-</span></div>' +
            '<div style="margin-top:4px;font-size:11px;color:#aaa;">Doi engine co hieu luc ngay.<br>Can mang de dich lan dau.</div>';
        p.innerHTML = html;
        document.body.appendChild(p);
        this.panel = p;
        TrRPG.wake();
        p.querySelector('#trrpg_eng').value = TrRPG.config.engine;
        p.querySelector('#trrpg_eng').onchange = function() {
            TrRPG.config.engine = this.value;
            TrRPG.saveSettings();
        };
        p.querySelector('#trrpg_tgt').onchange = function() {
            var v = this.value.trim().toLowerCase() || 'vi';
            TrRPG.config.targetLanguage = v;
            TrRPG.saveSettings();
        };
        p.querySelector('#trrpg_on').onchange = function() {
            TrRPG.enabled = this.checked;
            TrRPG.saveSettings();
        };
        p.querySelector('#trrpg_autooff').onchange = function() {
            TrRPG.config.autoOff = this.checked;
            TrRPG.saveSettings();
            TrRPG.wake();
        };
        p.querySelector('#trrpg_clear').onclick = function() {
            if (confirm('Xoa toan bo cache ban dich?')) {
                TrRPG.Cache.clear();
                p.querySelector('#trrpg_count').textContent = '0';
            }
        };
        p.querySelector('#trrpg_prescan').onclick = function() {
            TrRPG.Toast.show('Dang quet & dich truoc...');
            try { TrRPG.scanCurrentMap(); } catch (e) {}
            try { TrRPG.translateDatabase(); } catch (e) {}
            setTimeout(function(){ TrRPG.Toast.hide(); }, 3000);
        };
    },

    tick: function() {
        // Refresh menu command khi co ban dich moi (menu custom tu hien tieng Viet)
        if (TrRPG._needMenuRefresh) {
            TrRPG._needMenuRefresh = false;
            try { TrRPG.refreshCommandWindows(); } catch (e) {}
        }
        // Cap nhat so dem moi 2 giay neu panel dang mo
        if (this.panel) {
            var el = this.panel.querySelector('#trrpg_count');
            if (el) el.textContent = String(TrRPG.translatedCount);
            var api = this.panel.querySelector('#trrpg_api');
            if (api) {
                var st = TrRPG.config.engine + ' OK:' + TrRPG.stats.ok + ' Fail:' + TrRPG.stats.fail;
                api.textContent = st;
                api.style.color = TrRPG.stats.fail > TrRPG.stats.ok ? '#f99' : '#9d9';
            }
            var err = this.panel.querySelector('#trrpg_err');
            if (err) err.textContent = TrRPG.stats.lastError || '-';
        }
    }
};

//-----------------------------------------------------------------------------
// 10. Khoi dong
//-----------------------------------------------------------------------------
// --- Tu tat khi dich xong ---
TrRPG._tickTimer = null;
TrRPG._idleTicks = 0;
TrRPG._okAtIdle = 0;
TrRPG.wake = function() {
    TrRPG._idleTicks = 0;
    if (TrRPG._tickTimer) return;
    TrRPG._tickTimer = setInterval(function() {
        try { TrRPG.UI.tick(); } catch (e) {}
        var busy = TrRPG.Queue.pending.length > 0 || TrRPG.Queue.active > 0 || TrRPG.UI.panel;
        if (busy || !TrRPG.config.autoOff) { TrRPG._idleTicks = 0; return; }
        if (++TrRPG._idleTicks >= 4) {            // ~8 giay khong con viec
            TrRPG.sleepNow();
        }
    }, 2000);
};
TrRPG.sleepNow = function() {
    clearInterval(TrRPG._tickTimer);
    TrRPG._tickTimer = null;
    TrRPG._idleTicks = 0;
    try { TrRPG.Cache.saveNow(); } catch (e) {}
    if (TrRPG.stats.ok > TrRPG._okAtIdle) {       // chi bao khi vua dich them
        TrRPG._okAtIdle = TrRPG.stats.ok;
        TrRPG.Toast.show('Da dich xong - dich tu tat (tu bat lai khi co cau moi)');
        setTimeout(function() { TrRPG.Toast.hide(); }, 2500);
    }
};

TrRPG.init = function() {
    TrRPG.Cache.load();
    // Doi document san sang roi gan nut
    if (document.readyState === 'complete') TrRPG.UI.build();
    else window.addEventListener('load', function() { TrRPG.UI.build(); });
    // Bo dem nen: tu tat khi het viec (autoOff), tu bat lai khi co cau can dich
    TrRPG.wake();
    // Dich tham so plugin cang som cang tot (cho plugin doc params muon)
    try { TrRPG.translateAllPluginParams(); } catch (e) {}
    setTimeout(function() { TrRPG.translateAllPluginParams(); }, 5000);
    setTimeout(function() { TrRPG.translateAllPluginParams(); }, 15000);
    // Luu cache khi thoat / an tab
    window.addEventListener('beforeunload', function() { TrRPG.Cache.saveNow(); });
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) TrRPG.Cache.saveNow();
    });
};

TrRPG.init();
window.TrRPG = TrRPG;

})();
