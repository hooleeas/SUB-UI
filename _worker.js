/**
 * CF-SUBS
 * 基于 CF-SUB 核心能力扩展的公开订阅聚合转换版
 *
 * 核心原则：
 * 1. 只使用一个 Cloudflare KV Binding：KV
 * 2. 保留 CF-SUB 的核心订阅获取、聚合、去重、NOADS、SUBAPI、格式识别、
 *    WARP、主页伪装、管理员登录、二维码、API/CONFIG 状态检测等能力。
 * 3. SUB 是“聚合节点配置”，不是公开订阅链接。
 * 4. URL 才是公开订阅入口。
 *
 * KV：
 *   CONFIG.json
 *   SUB:<id>
 *   URL:<token>
 *
 * Pages / Workers 环境变量仍兼容原 CF-SUB：
 *   USER
 *   PASS
 *   URL
 *   URL302
 *   CODE
 *   SUBUPTIME
 *   WARP
 *   LINK
 *   LINKSUB
 */

let mytoken = 'auto';
let FileName = 'CF-SUBS';
let SUBUpdateTime = 6;
let total = 99;
let timestamp = 4102329600000;

let MainData = `
https://cfxr.eu.org/getSub
`;

let urls = [];

let subConverter = '';
let subConfig = '';
let subProtocol = 'https';
let config_noAds = '';

// ================= 主页配置 =================
let fakeMode = '';
let fakeUrl = '';
let fakeUrl302 = '';
let fakeCode = '';
// ==============================================

const SUB_PREFIX = 'SUB:';
const URL_PREFIX = 'URL:';
const ID_CHARS = 'ABCDEFGHJKMNPQRSTWXYZabcdefghijkmnpqrstwxyz2345678';
const DEFAULT_ADMIN_PATH = 'admin';

export default {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        } catch (error) {
            console.error('CF-SUBS request error:', error);
            return new Response('CF-SUBS Worker Error: ' + (error?.message || String(error)), {
                status: 500,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            });
        }
    }
};

async function handleRequest(request, env) {
        const userAgentHeader = request.headers.get('User-Agent') || '';
        const userAgent = userAgentHeader.toLowerCase();
        const url = new URL(request.url);
        const queryToken = url.searchParams.get('token') || '';
        // SUBAPI 转换内部请求：记录原始订阅 URL，确保转换时只使用该 URL 绑定的 SUB
        const conversionSourceToken = url.searchParams.get('sourceToken') || '';

        // 每次请求重新从环境变量读取，保持 CF-SUB 原有变量行为
        // 不再使用 TOKEN 环境变量；旧 /auto 入口继续由内部默认值兼容。
        let adminUser = env.USER || '';
        let adminPass = env.PASS || '';
        let adminPath = DEFAULT_ADMIN_PATH;

        fakeUrl = env.URL || '';
        fakeUrl302 = env.URL302 || '';
        fakeCode = env.CODE || '';

        // 读取 KV 配置
        if (env.KV) {
            try {
                const kvConfigStr = await env.KV.get('CONFIG.json');
                if (kvConfigStr) {
                    const kvConfig = JSON.parse(kvConfigStr);

                    FileName = kvConfig.subName || 'CF-SUBS';

                    subConverter = '';
                    subConfig = '';
                    config_noAds = '';

                    // 原 CF-SUB 配置仍然兼容
                    adminUser = kvConfig.user || adminUser;
                    adminPass = kvConfig.pass || adminPass;
                    adminPath = normalizeAdminPath(kvConfig.adminPath) || DEFAULT_ADMIN_PATH;

                    fakeMode = kvConfig.fakeMode !== undefined ? kvConfig.fakeMode : '';
                    fakeUrl = kvConfig.fakeUrl !== undefined ? kvConfig.fakeUrl : fakeUrl;
                    fakeUrl302 = kvConfig.fakeUrl302 !== undefined ? kvConfig.fakeUrl302 : fakeUrl302;
                    fakeCode = kvConfig.fakeCode !== undefined ? kvConfig.fakeCode : fakeCode;
                }
            } catch (e) {
                console.error('解析 KV 配置失败', e);
            }
        }

        const customSubApi = String(subConverter || '').trim();
        const customSubConfig = String(subConfig || '').trim();
        const hasCustomApi = !!customSubApi;
        const hasCustomConfig = !!customSubConfig;

        subConverter = customSubApi;
        subConfig = customSubConfig;
        subProtocol = /^http:\/\//i.test(customSubApi) ? 'http' : 'https';

        const effectiveSubConverter = customSubApi.replace(/^https?:\/\//i, '').replace(/\/+$/,'');
        const effectiveSubProtocol = customSubApi ? subProtocol : 'https';
        const effectiveSubConfig = customSubConfig;

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const timeTemp = Math.ceil(currentDate.getTime() / 1000);
        const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);

        let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
        total = total * 1099511627776;
        let expire = Math.floor(timestamp / 1000);
        SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

        const isProxyClientUA = [
            'clash', 'meta', 'mihomo', 'sing-box', 'singbox', 'surge',
            'quantumult', 'loon', 'nekobox', 'v2rayn', 'v2rayng',
            'shadowrocket', 'subconverter'
        ].some(keyword => userAgent.includes(keyword));

        // 退出登录：直接跳回主页，不显示 logout 中间页面
        if (url.searchParams.has('logout') || url.pathname === `/${adminPath}/logout`) {
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': '/',
                    'Cache-Control': 'no-store',
                    'Set-Cookie': 'CF_SUB_ADMIN=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
                }
            });
        }

        // ==================== SUB-UI 公共 API ====================
        if (url.pathname === '/api/ui-config' && request.method === 'GET') {
            const cfg = await getConfig(env);
            return jsonResponse({
                ok: true,
                subApis: normalizeProviderList(cfg.subApis),
                subConfigs: normalizeProviderList(cfg.subConfigs),
                defaultSubApiId: String(cfg.defaultSubApiId || ''),
                defaultSubConfigId: String(cfg.defaultSubConfigId || '')
            });
        }
        if (url.pathname === '/api/status' && request.method === 'GET') {
            const api = String(url.searchParams.get('api') || '').trim();
            const config = String(url.searchParams.get('config') || '').trim();
            if (!api && !config) return jsonResponse({ ok:false, error:'缺少 SUBAPI 或 SUBCONFIG' }, 400);
            return jsonResponse({ ok:true, ...(await probeBackend(api, config)) });
        }
        if (url.pathname === '/api/generate' && request.method === 'POST') {
            return await handlePublicGenerate(request, env, url);
        }

        // ==================== 管理后台 ====================
        if (url.pathname === `/${adminPath}`) {
            if (isAdminLoginEnabled(adminUser, adminPass)) {
                const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
                if (!isLoggedIn) {
                    if (request.method === 'POST') {
                        return await handleAdminLogin(request, url, mytoken, adminUser, adminPass);
                    }
                    return new Response(renderLoginPage(url), {
                        headers: {
                            'Content-Type': 'text/html;charset=utf-8',
                            'Cache-Control': 'no-store'
                        }
                    });
                }
            }

            return await handleAdmin(request, env, {
                adminUser,
                adminPass,
                effectiveSubConverter,
                effectiveSubConfig,
                effectiveSubProtocol,
                hasCustomApi,
                hasCustomConfig,
                adminPath
            });
        }

        // ==================== 解析公开订阅 URL ====================
        let publicToken = queryToken;
        if (!publicToken && url.pathname !== '/') publicToken = decodeURIComponent(url.pathname.slice(1));

        let tokenData = null;
        if (env.KV && publicToken) tokenData = await getToken(env, publicToken);

        // 只有真实生成的订阅 token 才是公开订阅入口；其余路径一律回到公开首页。
        if (!tokenData && url.pathname !== '/') {
            return Response.redirect(url.origin + '/', 302);
        }

        // ==================== 公开首页 ====================
        if (!tokenData && url.pathname === '/') {
            const page = await renderSubUIHome(request, url, env);
            const nonce = crypto.randomUUID().replace(/-/g, '');
            const html = page.replace('<script id=\"cf-subs-public-script\">', `<script id=\"cf-subs-public-script\" nonce=\"${nonce}\" data-cfasync=\"false\">`);
            return new Response(html, {
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                    'Cache-Control': 'no-store',
                    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`
                }
            });
        }

        // ==================== 当前订阅入口的来源 ====================
        const selectedSources = Array.isArray(tokenData?.sources) && tokenData.sources.length
            ? cleanSourceList(tokenData.sources)
            : [];

        // ==================== 浏览器订阅链接页面 ====================
        if (userAgent.includes('mozilla') && !url.search && !isProxyClientUA && tokenData) {
            return new Response(renderGuestPage(url, tokenData.url, tokenData.name), {
                headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' }
            });
        }

        // ==================== 原 CF-SUB 核心订阅处理 ====================
        return await generateSubscription(
            request,
            env,
            selectedSources,
            {
                mytoken,
                fakeToken,
                effectiveSubConverter,
                effectiveSubConfig,
                effectiveSubProtocol,
                userAgent,
                userAgentHeader,
                config_noAds: String(tokenData?.noAds || ''),
                FileName,
                UD,
                expire,
                tokenData
            },
            publicToken
        );
}

/* =========================================================
 * 配置 / 后台状态
 * ======================================================= */

async function fetchWithTimeout(resource, options = {}, timeoutMs = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(resource, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function probeBackend(apiUrl, configUrl) {
    const rawApi = String(apiUrl || '').trim();
    const protocol = /^http:\/\//i.test(rawApi) ? 'http' : 'https';
    const host = rawApi.replace(/^https?:\/\//i,'').replace(/\/+$/,'');
    const api = host ? `${protocol}://${host}` : '';
    let apiOk = false, apiVersion = '';

    if (api) {
        try {
            const res = await fetchWithTimeout(
                `${api}/version`,
                { headers:{'User-Agent':'CF-SUBS/Status'} },
                3000
            );
            if (res.ok) {
                apiOk = true;
                apiVersion = (await res.text()).trim().slice(0, 80);
            }
        } catch(e) {}
    }

    let configOk = false;
    const config = String(configUrl || '').trim();

    if (config) {
        try {
            const res = await fetchWithTimeout(
                config,
                { headers:{'User-Agent':'CF-SUBS/Status'} },
                3000
            );
            configOk = res.ok;
        } catch(e) {}
    }

    return {
        api:{ok:apiOk,url:api,version:apiVersion},
        config:{ok:configOk,url:config},
        available:(api ? apiOk : true) && (config ? configOk : true)
    };
}
/* =========================================================
 * SUB / URL 数据
 * ======================================================= */

function makeSubId() {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    let value = '';
    for (const b of bytes) value += ID_CHARS[b % ID_CHARS.length];
    return value;
}

async function makeRandomToken(env, length = 6) {
    for (let n = 0; n < 30; n++) {
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        let token = '';
        for (const b of bytes) token += ID_CHARS[b % ID_CHARS.length];

        if (
            !['admin', 'api', 'login', 'logout', 'favicon.ico'].includes(token.toLowerCase()) &&
            !(await getToken(env, token))
        ) {
            return token;
        }
    }
    throw new Error('随机 URL 生成失败，请重试');
}

async function getSub(env, id) {
    if (!env.KV || !id) return null;
    try {
        return await env.KV.get(`${SUB_PREFIX}${id}`, 'json');
    } catch (e) {
        return null;
    }
}

async function getToken(env, token) {
    if (!env.KV || !token) return null;
    try {
        return await env.KV.get(`${URL_PREFIX}${token}`, 'json');
    } catch (e) {
        return null;
    }
}

async function listSubs(env) {
    if (!env.KV) return [];
    const result = [];
    let cursor;

    do {
        const page = await env.KV.list({
            prefix: SUB_PREFIX,
            ...(cursor ? { cursor } : {})
        });

        const values = await Promise.all(page.keys.map(item =>
            getSub(env, item.name.slice(SUB_PREFIX.length))
        ));
        for (const data of values) {
            if (data) result.push(data);
        }

        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    result.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'));
    return result;
}

async function listTokens(env) {
    if (!env.KV) return [];
    const result = [];
    let cursor;

    do {
        const page = await env.KV.list({
            prefix: URL_PREFIX,
            ...(cursor ? { cursor } : {})
        });

        const values = await Promise.all(page.keys.map(item =>
            getToken(env, item.name.slice(URL_PREFIX.length))
        ));
        for (const data of values) {
            if (data) result.push(data);
        }

        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    result.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'));
    return result;
}

function normalizeAdminPath(value) {
    let path = String(value || '').trim();
    if (!path) return DEFAULT_ADMIN_PATH;
    path = path.replace(/^[/]+/, '').replace(/[/]+$/, '');
    if (!/^[A-Za-z0-9_-]{2,60}$/.test(path)) return '';
    return path;
}

function normalizeName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeToken(value) {
    return String(value || '').trim();
}

function validName(name) {
    return name.length >= 1 && name.length <= 80;
}

function validCustomToken(token) {
    const lower = token.toLowerCase();
    const reserved = new Set([
        'admin', 'api', 'login', 'logout', 'favicon.ico', 'auto',
        String(mytoken || '').toLowerCase(),
    ]);

    return (
        token.length >= 3 &&
        token.length <= 80 &&
        /^[A-Za-z0-9_-]+$/.test(token) &&
        !reserved.has(lower)
    );
}

async function isSubNameUsed(env, name, exceptId = '') {
    const subs = await listSubs(env);
    return subs.some(s =>
        s.id !== exceptId &&
        String(s.name).toLowerCase() === String(name).toLowerCase()
    );
}

async function isTokenNameUsed(env, name, exceptToken = '') {
    const tokens = await listTokens(env);
    return tokens.some(t =>
        t.url !== exceptToken &&
        String(t.name).toLowerCase() === String(name).toLowerCase()
    );
}

function cleanSourceList(input) {
    if (Array.isArray(input)) {
        return input
            .flatMap(x => String(x || '').split(/\r?\n/))
            .map(x => x.trim())
            .filter(Boolean);
    }

    return String(input || '')
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);
}

async function getSourcesForToken(env, tokenData) {
    const result = [];
    const ids = Array.isArray(tokenData.subs) ? tokenData.subs : [];

    for (const id of ids) {
        const sub = await getSub(env, id);
        if (!sub || sub.enabled === false) continue;

        if (Array.isArray(sub.sources)) result.push(...sub.sources);
    }

    return [...new Set(result.map(x => String(x).trim()).filter(Boolean))];
}

async function getAllManagedSources(env) {
    const result = [];
    const subs = await listSubs(env);

    for (const sub of subs) {
        if (sub.enabled === false) continue;
        if (Array.isArray(sub.sources)) result.push(...sub.sources);
    }

    // 如果没有创建 SUBS，则兼容旧 CF-SUB 数据
    if (!result.length) {
        return await getLegacySources(env);
    }

    return [...new Set(result.map(x => String(x).trim()).filter(Boolean))];
}

async function getLegacySources(env) {
    let data = '';
    let legacyUrls = [];

    if (env.KV) {
        await 迁移地址列表(env, 'LINK.txt');
        data = await env.KV.get('LINK.txt') || '';
    }

    if (!data) data = env.LINK || MainData || '';

    if (env.LINKSUB) {
        legacyUrls = await ADD(env.LINKSUB);
    }

    const all = await ADD(`${data}\n${legacyUrls.join('\n')}`);
    return [...new Set(all.map(x => String(x).trim()).filter(Boolean))];
}

async function handleAdmin(request, env, runtime) {
    if (!env.KV) {
        return new Response(
            '未绑定名为 KV 的 Cloudflare KV Namespace。',
            { status: 500 }
        );
    }

    // 管理后台 POST：只处理站点配置、SUBAPI、SUBCONFIG
    if (request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/x-www-form-urlencoded')) {
            return new Response('不支持的数据格式', { status: 400 });
        }

        try {
            const data = await request.json();

            if(data.type==='config'){
                const old=await getConfig(env);
                const next={
                    ...old,
                    subName:normalizeName(data.settings?.subName??old.subName)||'CF-SUBS',
                    subApis:normalizeProviderList(data.settings?.subApis??old.subApis),
                    subConfigs:normalizeProviderList(data.settings?.subConfigs??old.subConfigs),
                    defaultSubApiId:String(data.settings?.defaultSubApiId??old.defaultSubApiId??''),
                    defaultSubConfigId:String(data.settings?.defaultSubConfigId??old.defaultSubConfigId??''),
                    user:String(data.settings?.user??old.user??''),
                    pass:data.settings?.pass?String(data.settings.pass):String(old.pass||''),
                    adminPath:normalizeAdminPath(data.settings?.adminPath??old.adminPath)||DEFAULT_ADMIN_PATH,
                    noAds:'',
                    fakeMode:String(data.settings?.fakeMode??old.fakeMode??''),
                    fakeUrl:String(data.settings?.fakeUrl??old.fakeUrl??''),
                    fakeUrl302:String(data.settings?.fakeUrl302??old.fakeUrl302??''),
                    fakeCode:String(data.settings?.fakeCode??old.fakeCode??'')
                };
                await env.KV.put('CONFIG.json',JSON.stringify(next));
                return jsonResponse({ok:true,adminPath:next.adminPath});
            }

            if(data.type==='security'){
                const old=await getConfig(env), user=String(data.user||'').trim();
                if(!user)return jsonResponse({ok:false,error:'管理员账号不能为空'},400);
                await env.KV.put('CONFIG.json',JSON.stringify({...old,user,pass:data.pass?String(data.pass):String(old.pass||'')}));
                return jsonResponse({ok:true});
            }

            if(data.type==='admin_path'){
                const old=await getConfig(env), adminPath=normalizeAdminPath(data.adminPath);
                if(!adminPath)return jsonResponse({ok:false,error:'管理员路径无效'},400);
                await env.KV.put('CONFIG.json',JSON.stringify({...old,adminPath}));
                return jsonResponse({ok:true,adminPath});
            }

            if(data.type==='site_name'){
                const old=await getConfig(env), subName=normalizeName(data.subName)||'CF-SUBS';
                await env.KV.put('CONFIG.json',JSON.stringify({...old,subName}));
                return jsonResponse({ok:true,subName});
            }

            if(['subapi_create','subapi_update','subapi_delete','subconfig_create','subconfig_update','subconfig_delete'].includes(data.type)){
                const cfg=await getConfig(env);
                const isApi=data.type.startsWith('subapi_');
                const key=isApi?'subApis':'subConfigs';
                const defaultKey=isApi?'defaultSubApiId':'defaultSubConfigId';
                const list=normalizeProviderList(cfg[key]);
                const action=data.type.split('_')[1];
                const id=String(data.id||'').trim();

                if(action==='delete'){
                    if(!list.some(x=>x.id===id))return jsonResponse({ok:false,error:'项目不存在'},404);
                    cfg[key]=list.filter(x=>x.id!==id);
                    if(String(cfg[defaultKey]||'')===id)cfg[defaultKey]='';
                }else{
                    const name=normalizeName(data.name), value=String(data.url||'').trim();
                    if(!validName(name))return jsonResponse({ok:false,error:'备注不能为空且不能超过 80 个字符'},400);
                    if(!/^https?:\/\//i.test(value))return jsonResponse({ok:false,error:'URL 必须以 http:// 或 https:// 开头'},400);
                    const itemId=id||makeSubId(), item={id:itemId,name,url:value,enabled:true};
                    
                    if(action==='create')list.push(item);
                    else{
                        const index=list.findIndex(x=>x.id===id);
                        if(index<0)return jsonResponse({ok:false,error:'项目不存在'},404);
                        list[index]={...list[index],...item,id};
                    }
                    if(!String(cfg[defaultKey]||'') && list.length)cfg[defaultKey]=list[0].id;
                    if(item.enabled===false&&String(cfg[defaultKey]||'')===itemId)cfg[defaultKey]='';
                    cfg[key]=list;
                }
                await env.KV.put('CONFIG.json',JSON.stringify(cfg));
                return jsonResponse({ok:true,items:normalizeProviderList(cfg[key]),defaultId:String(cfg[defaultKey]||'')});
            }

            return new Response('不支持的数据类型', { status: 400 });
        } catch (e) {
            return jsonResponse({
                ok: false,
                error: e?.message || String(e) || '服务器内部错误'
            }, 500);
        }
    }

    const settings = await getConfig(env);

    return new Response(
        renderAdminPage(
            new URL(request.url),
            env,
            settings
        ),
        {
            headers: {
                'Content-Type': 'text/html;charset=utf-8',
                'Cache-Control': 'no-store'
            }
        }
    );
}

async function getConfig(env) {
    const defaults = {
        subName:'CF-SUBS', subApi:'', subConfig:'',
        subApis:[], subConfigs:[],
        defaultSubApiId:'', defaultSubConfigId:'',
        noAds:'', user:'', pass:'', adminPath:DEFAULT_ADMIN_PATH,
        fakeMode:'', fakeUrl:'', fakeUrl302:'', fakeCode:''
    };
    if(!env.KV) return defaults;
    try {
        const raw=await env.KV.get('CONFIG.json');
        return raw ? {...defaults,...JSON.parse(raw)} : defaults;
    } catch(e) { return defaults; }
}

function normalizeProviderList(input) {
    if(!Array.isArray(input)) return [];
    return input.map(x=>({
        id:String(x?.id||makeSubId()),
        name:normalizeName(x?.name||'未命名'),
        url:String(x?.url||'').trim(),
        enabled:x?.enabled!==false,
        ...(x?.providerType?{providerType:String(x.providerType)}:{})
    })).filter(x=>x.url);
}

function getCookieValue(request,name){
    const cookie=request.headers.get('Cookie')||'';
    for(const part of cookie.split(';')){
        const item=part.trim(), i=item.indexOf('=');
        if(i<0) continue;
        if(item.slice(0,i)===name) return decodeURIComponent(item.slice(i+1));
    }
    return '';
}
function readPublicPreferences(request){
    const raw=getCookieValue(request,'CF_SUB_PREFS');
    if(!raw) return null;
    try{
        const value=JSON.parse(raw);
        return value && typeof value==='object' ? value : null;
    }catch(e){ return null; }
}
function buildPublicPreferencesCookie(value){
    const encoded=encodeURIComponent(JSON.stringify(value));
    if(encoded.length>3600) return '';
    return `CF_SUB_PREFS=${encoded}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`;
}

async function getSelectedBackends(env, tokenData, runtime) {
    if(Array.isArray(tokenData?.backends) && tokenData.backends.length){
        return tokenData.backends.map(x=>({
            api:String(x.api||'').replace(/^https?:\/\//i,'').replace(/\/+$/,''),
            config:String(x.config||'').trim(),
            protocol:x.protocol==='http'?'http':'https'
        })).filter(x=>x.api&&x.config);
    }
    const cfg=await getConfig(env);
    const apis=normalizeProviderList(cfg.subApis).filter(x=>x.enabled);
    const configs=normalizeProviderList(cfg.subConfigs).filter(x=>x.enabled);
    const selectedApis=(tokenData?.subApiIds||[]).map(id=>apis.find(x=>x.id===id)).filter(Boolean);
    const selectedConfigs=(tokenData?.subConfigIds||[]).map(id=>configs.find(x=>x.id===id)).filter(Boolean);
    if(!selectedApis.length||!selectedConfigs.length) return [];
    const pairs=[];
    for(const api of selectedApis){
        const raw=String(api.url||'').trim();
        const protocol=/^http:\/\//i.test(raw)?'http':'https';
        const host=raw.replace(/^https?:\/\//i,'').replace(/\/+$/,'');
        for(const config of selectedConfigs) pairs.push({api:host,config:config.url,protocol});
    }
    return pairs;
}

async function handlePublicGenerate(request,env,requestUrl){
    if(!env.KV) return jsonResponse({ok:false,error:'未绑定 KV'},500);
    try{
        const data=await request.json();
        const sources=cleanSourceList(data.sources||'');
        if(!sources.length) return jsonResponse({ok:false,error:'请输入至少一个订阅链接'},400);
        if(sources.length>100) return jsonResponse({ok:false,error:'订阅链接最多 100 条'},400);

        const cfg=await getConfig(env);
        const apis=normalizeProviderList(cfg.subApis).filter(x=>x.enabled);
        const configs=normalizeProviderList(cfg.subConfigs).filter(x=>x.enabled);

        const apiIds=Array.isArray(data.apiIds)?[...new Set(data.apiIds.map(x=>String(x).trim()).filter(Boolean))]:[];
        const configIds=Array.isArray(data.configIds)?[...new Set(data.configIds.map(x=>String(x).trim()).filter(Boolean))]:[];
        const apiCustom=Boolean(data.apiCustom);
        const configCustom=Boolean(data.configCustom);
        const apiUrl=String(data.apiUrl||'').trim();
        const configUrl=String(data.configUrl||'').trim();

        const selectedApis=apiIds.map(id=>apis.find(x=>x.id===id)).filter(Boolean);
        const selectedConfigs=configIds.map(id=>configs.find(x=>x.id===id)).filter(Boolean);
        if(!selectedApis.length && !apiCustom) return jsonResponse({ok:false,error:'请选择至少一个订阅转换后端'},400);
        if(!selectedConfigs.length && !configCustom) return jsonResponse({ok:false,error:'请选择至少一个订阅转换规则'},400);
        if(apiCustom && !/^https?:\/\//i.test(apiUrl)) return jsonResponse({ok:false,error:'自定义订阅转换后端必须以 http:// 或 https:// 开头'},400);
        if(configCustom && !/^https?:\/\//i.test(configUrl)) return jsonResponse({ok:false,error:'自定义订阅转换规则必须以 http:// 或 https:// 开头'},400);

        const apiEntries=[...selectedApis.map(x=>({id:x.id,url:x.url,name:x.name})),...(apiCustom?[{id:'',url:apiUrl,name:'自定义'}]:[])];
        const configEntries=[...selectedConfigs.map(x=>({id:x.id,url:x.url,name:x.name})),...(configCustom?[{id:'',url:configUrl,name:'自定义'}]:[])];
        const backends=[];
        for(const api of apiEntries){
            const rawApi=String(api.url||'').trim();
            const protocol=/^http:\/\//i.test(rawApi)?'http':'https';
            const host=rawApi.replace(/^https?:\/\//i,'').replace(/\/+$/,'');
            if(!host) continue;
            for(const config of configEntries){
                const rawConfig=String(config.url||'').trim();
                if(!/^https?:\/\//i.test(rawConfig)) continue;
                backends.push({api:host,config:rawConfig,protocol});
            }
        }
        if(!backends.length) return jsonResponse({ok:false,error:'没有有效的订阅转换后端与规则组合'},400);

        const noAds=String(data.noAds||'').trim().slice(0,5000);
        const token=await makeRandomToken(env,8);
        const name='订阅链接';
        const item={
            url:token,name,sources,
            subApiIds:selectedApis.map(x=>x.id),
            subConfigIds:selectedConfigs.map(x=>x.id),
            backends,
            noAds,target:'auto',
            createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
            type:'sub-ui'
        };
        await env.KV.put(`${URL_PREFIX}${token}`,JSON.stringify(item));

        const prefs={
            apiIds:selectedApis.map(x=>x.id),apiCustom,apiUrl:apiCustom?apiUrl:'',
            configIds:selectedConfigs.map(x=>x.id),configCustom,configUrl:configCustom?configUrl:'',noAds
        };
        const cookie=buildPublicPreferencesCookie(prefs);
        const headers=cookie?{'Set-Cookie':cookie}:{ };
        const subscriptionUrl=`${requestUrl.origin}/${encodeURIComponent(token)}`;
        return jsonResponse({ok:true,url:item,subscription_url:subscriptionUrl},200,headers);
    }catch(e){return jsonResponse({ok:false,error:e?.message||String(e)},500);}
}
async function generateSubscription(request, env, sourceList, runtime, token) {
    let allSources = [...new Set((sourceList || []).map(x => String(x).trim()).filter(Boolean))];

    let 自建节点 = '';
    let 订阅链接 = '';

    for (const x of allSources) {
        if (x.toLowerCase().startsWith('http')) {
            订阅链接 += x + '\n';
        } else {
            自建节点 += x + '\n';
        }
    }

    let nodeUrls = await ADD(订阅链接);
    let req_data = 自建节点;

    const isSubConverterRequest =
        request.headers.get('subconverter-request') ||
        request.headers.get('subconverter-version') ||
        runtime.userAgent.includes('subconverter');

    let 订阅格式 = 'base64';

    if (
        !(
            runtime.userAgent.includes('null') ||
            isSubConverterRequest ||
            runtime.userAgent.includes('nekobox') ||
            runtime.userAgent.includes('cf-sub')
        )
    ) {
        if (
            runtime.userAgent.includes('sing-box') ||
            runtime.userAgent.includes('singbox') ||
            new URL(request.url).searchParams.has('sb') ||
            new URL(request.url).searchParams.has('singbox')
        ) {
            订阅格式 = 'singbox';
        } else if (
            runtime.userAgent.includes('surge') ||
            new URL(request.url).searchParams.has('surge')
        ) {
            订阅格式 = 'surge';
        } else if (
            runtime.userAgent.includes('quantumult') ||
            new URL(request.url).searchParams.has('quanx')
        ) {
            订阅格式 = 'quanx';
        } else if (
            runtime.userAgent.includes('loon') ||
            new URL(request.url).searchParams.has('loon')
        ) {
            订阅格式 = 'loon';
        } else if (
            runtime.userAgent.includes('clash') ||
            runtime.userAgent.includes('meta') ||
            runtime.userAgent.includes('mihomo') ||
            new URL(request.url).searchParams.has('clash')
        ) {
            订阅格式 = 'clash';
        }
    }

    if (runtime.tokenData?.target && runtime.tokenData.target !== 'auto') {
        订阅格式 = runtime.tokenData.target;
    }

    const sourceToken = new URL(request.url).searchParams.get('sourceToken') || token || '';
    const conversionSeed = `${new URL(request.url).origin}/${await MD5MD5(runtime.fakeToken)}?token=${encodeURIComponent(runtime.fakeToken)}${sourceToken ? `&sourceToken=${encodeURIComponent(sourceToken)}` : ''}`;
    let 订阅转换URL = conversionSeed;
    let 追加UA = 'v2rayn';
    const requestUrl = new URL(request.url);

    if (requestUrl.searchParams.has('b64') || requestUrl.searchParams.has('base64')) {
        订阅格式 = 'base64';
    } else if (requestUrl.searchParams.has('clash')) {
        追加UA = 'clash';
    } else if (requestUrl.searchParams.has('singbox')) {
        追加UA = 'singbox';
    } else if (requestUrl.searchParams.has('surge')) {
        追加UA = 'surge';
    } else if (requestUrl.searchParams.has('quanx')) {
        追加UA = 'Quantumult%20X';
    } else if (requestUrl.searchParams.has('loon')) {
        追加UA = 'Loon';
    }

    nodeUrls = [...new Set(nodeUrls)].filter(item => item && item.trim());

    if (nodeUrls.length > 0) {
        const 请求订阅响应内容 = await getSUB(
            nodeUrls,
            request,
            追加UA,
            runtime.userAgentHeader
        );

        req_data += 请求订阅响应内容[0].join('\n');
        订阅转换URL += '|' + 请求订阅响应内容[1];

        // base64 模式下，对结构化订阅再做 mixed 转换；只使用本次订阅实际绑定的后端。
        if (
            订阅格式 === 'base64' &&
            !isSubConverterRequest &&
            请求订阅响应内容[1].includes('://')
        ) {
            try {
                const backendPairs = await getSelectedBackends(env, runtime.tokenData, runtime);
                const backend = backendPairs[0];
                if (backend?.api && backend?.config) {
                    const u = buildSubUrl(backend.api, backend.config, 'mixed', 请求订阅响应内容[1], backend.protocol);
                    const res = await fetch(u, { headers: { 'User-Agent': 'v2rayn/CF-SUB' } });
                    if (res.ok) req_data += '\n' + atob(await res.text());
                }
            } catch (error) {}
        }
    }

    // 原 CF-SUB WARP 支持
    if (env.WARP) {
        const warpList = await ADD(env.WARP);
        订阅转换URL += '|' + warpList.join('|');
    }

    const text = new TextDecoder().decode(
        new TextEncoder().encode(req_data)
    );

    // 原 CF-SUB NOADS
    let filteredLines = text.split('\n');

    if (runtime.config_noAds) {
        const adKeywords = runtime.config_noAds
            .split(/[, \r\n]+/)
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);

        if (adKeywords.length > 0) {
            filteredLines = filteredLines.filter(line => {
                const lowerLine = line.toLowerCase();
                return !adKeywords.some(keyword => lowerLine.includes(keyword));
            });
        }
    }

    const uniqueLines = new Set(filteredLines);
    const result = [...uniqueLines].join('\n');

    let base64Data;

    try {
        base64Data = btoa(result);
    } catch (e) {
        base64Data = encodeBase64(result);
    }

    const responseHeaders = {
        'content-type': 'text/plain; charset=utf-8',
        'Profile-Update-Interval': `${SUBUpdateTime}`,
        'Profile-web-page-url': request.url.includes('?')
            ? request.url.split('?')[0]
            : request.url
    };

    if (订阅格式 === 'base64' || token === runtime.fakeToken) {
        return new Response(base64Data, { headers: responseHeaders });
    }

    try {
        const backendPairs = await getSelectedBackends(env, runtime.tokenData, runtime);
        let lastError;
        for (const backend of backendPairs) {
            try {
                const finalUrl = buildSubUrl(backend.api, backend.config, 订阅格式, 订阅转换URL, backend.protocol);
                const res = await fetch(finalUrl, { headers: { 'User-Agent': runtime.userAgentHeader } });
                if (!res.ok) throw new Error(`SUBAPI ${res.status}`);
                let content = await res.text();
                if (订阅格式 === 'clash') content = clashFix(content);
                if (!runtime.userAgent.includes('mozilla')) {
                    responseHeaders['Content-Disposition'] = `attachment; filename*=utf-8''${encodeURIComponent(runtime.FileName)}`;
                }
                return new Response(content, { headers: responseHeaders });
            } catch (e) { lastError = e; }
        }
        throw lastError || new Error('没有可用的 SUBAPI/SUBCONFIG');
    } catch (error) {
        // 没有可用的转换后端时，返回已经聚合/去重后的 Base64 订阅，避免依赖任何隐藏的默认 SUBAPI/SUBCONFIG。
        return new Response(base64Data, { headers: responseHeaders });
    }

}


function buildSubUrl(api, config, target, urlToConvert, protocol) {
    let base = `${protocol}://${api}/sub?target=${target}&url=${encodeURIComponent(urlToConvert)}&insert=false&config=${encodeURIComponent(config)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
    if (target === 'surge') base += '&ver=4&new_name=true';
    else if (target === 'quanx') base += '&udp=true';
    else if (target === 'clash' || target === 'singbox' || target === 'mixed') base += '&new_name=true';
    return base;
}

async function ADD(envadd) {
    var addtext = envadd.replace(/[ "'|\r\n]+/g, '\n').replace(/\n+/g, '\n');
    if (addtext.charAt(0) == '\n') addtext = addtext.slice(1);
    if (addtext.charAt(addtext.length - 1) == '\n') addtext = addtext.slice(0, addtext.length - 1);
    return addtext.split('\n');
}

// ================== 原生页面兜底 ==================
async function nginx(titleName) {
    return `<!DOCTYPE html>
<html>
<head>
<title>${escapeHTML(titleName)}</title>
<style>
    body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and working. Further configuration is required.</p>
<p>For online documentation and support please refer to <a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at <a href="http://nginx.com/">nginx.com</a>.</p>
<p><em>Thank you for using nginx.</em></p>
</body>
</html>`;
}

function base64Decode(str) {
    const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}

// Cloudflare Workers 不保证 WebCrypto 支持 MD5。
// 使用纯 JS MD5，避免 crypto.subtle.digest('MD5') 触发 Worker 1101。
function md5Hex(input) {
    const data = new TextEncoder().encode(String(input));
    const bitLen = data.length * 8;
    const len = (((data.length + 8) >> 6) + 1) * 64;
    const bytes = new Uint8Array(len);
    bytes.set(data);
    bytes[data.length] = 0x80;

    const view = new DataView(bytes.buffer);
    view.setUint32(len - 8, bitLen >>> 0, true);
    view.setUint32(len - 4, Math.floor(bitLen / 0x100000000), true);

    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    const s = [
        7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
        5,9,14,20, 5,9,14,20, 5,9,14,20, 5,9,14,20,
        4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
        6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21
    ];
    const K = new Uint32Array(64);
    for (let i = 0; i < 64; i++) {
        K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
    }

    const leftRotate = (x, amount) => ((x << amount) | (x >>> (32 - amount))) >>> 0;

    for (let offset = 0; offset < bytes.length; offset += 64) {
        const M = new Uint32Array(16);
        for (let i = 0; i < 16; i++) M[i] = view.getUint32(offset + i * 4, true);

        let A = a0, B = b0, C = c0, D = d0;
        for (let i = 0; i < 64; i++) {
            let F, g;
            if (i < 16) { F = (B & C) | (~B & D); g = i; }
            else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
            else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
            else { F = C ^ (B | ~D); g = (7 * i) % 16; }
            F = (F + A + K[i] + M[g]) >>> 0;
            A = D; D = C; C = B; B = (B + leftRotate(F, s[i])) >>> 0;
        }
        a0 = (a0 + A) >>> 0;
        b0 = (b0 + B) >>> 0;
        c0 = (c0 + C) >>> 0;
        d0 = (d0 + D) >>> 0;
    }

    const out = new Uint8Array(16);
    const outView = new DataView(out.buffer);
    outView.setUint32(0, a0, true);
    outView.setUint32(4, b0, true);
    outView.setUint32(8, c0, true);
    outView.setUint32(12, d0, true);
    return Array.from(out, b => b.toString(16).padStart(2, '0')).join('');
}

async function MD5MD5(text) {
    const firstHex = md5Hex(text);
    return md5Hex(firstHex.slice(7, 27));
}

function clashFix(content) {
    if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
        let lines = content.includes('\r\n') ? content.split('\r\n') : content.split('\n');
        let result = "";
        for (let line of lines) {
            if (line.includes('type: wireguard')) {
                result += line.replace(new RegExp(`, mtu: 1280, udp: true`, 'g'), `, mtu: 1280, remote-dns-resolve: true, udp: true`) + '\n';
            } else {
                result += line + '\n';
            }
        }
        return result;
    }
    return content;
}

// 代理模式自动替换 HTML 标题
async function proxyURL(proxyURL, url, titleName) {
    const URLs = await ADD(proxyURL);
    const fullURL = URLs[Math.floor(Math.random() * URLs.length)];
    let parsedURL = new URL(fullURL);
    let URLPathname = parsedURL.pathname;
    if (URLPathname.charAt(URLPathname.length - 1) == '/') URLPathname = URLPathname.slice(0, -1);
    URLPathname += url.pathname;
    let newURL = `${parsedURL.protocol.slice(0, -1) || 'https'}://${parsedURL.hostname}${URLPathname}${parsedURL.search}`;
    
    let response = await fetch(newURL);
    const contentType = response.headers.get('content-type') || '';
    
    // 如果反代的是网页，则动态注入配置文件名作为标题
    if (contentType.includes('text/html')) {
        let html = await response.text();
        const title = `<title>${escapeHTML(titleName)}</title>`;
        if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
            html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, title);
        } else if (/<head\b[^>]*>/i.test(html)) {
            html = html.replace(/<head\b[^>]*>/i, match => match + title);
        } else {
            html = title + html;
        }
        let newResponse = new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
        });
        newResponse.headers.delete('content-length');
        newResponse.headers.set('X-New-URL', newURL);
        return newResponse;
    } else {
        let newResponse = new Response(response.body, { 
            status: response.status, 
            statusText: response.statusText, 
            headers: response.headers 
        });
        newResponse.headers.set('X-New-URL', newURL);
        return newResponse;
    }
}

async function getSUB(api, request, 追加UA, userAgentHeader) {
    if (!api || api.length === 0) return [];
    else api = [...new Set(api)];
    let newapi = "";
    let 订阅转换URLs = "";
    let 异常订阅 = "";
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, 2000);
    try {
        const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, 追加UA, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));
        const modifiedResponses = responses.map((response, index) => {
            if (response.status === 'rejected') {
                return { status: response.reason && response.reason.name === 'AbortError' ? '超时' : '请求失败', value: null, apiUrl: api[index] };
            }
            return { status: response.status, value: response.value, apiUrl: api[index] };
        });
        for (const response of modifiedResponses) {
            if (response.status === 'fulfilled') {
                const content = await response.value || 'null';
                if (content.includes('proxies:') || (content.includes('outbounds"') && content.includes('inbounds"'))) {
                    订阅转换URLs += "|" + response.apiUrl;
                } else if (content.includes('://')) {
                    newapi += content + '\n';
                } else if (isValidBase64(content)) {
                    newapi += base64Decode(content) + '\n';
                } else {
                    const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${response.apiUrl.split('://')[1].split('/')[0]}`;
                    异常订阅 += `${异常订阅LINK}\n`;
                }
            }
        }
    } catch (error) {
    } finally {
        clearTimeout(timeout);
    }
    return [await ADD(newapi + 异常订阅), 订阅转换URLs];
}

async function getUrl(request, targetUrl, 追加UA, userAgentHeader) {
    const newHeaders = new Headers(request.headers);
    newHeaders.set("User-Agent", `${atob('djJyYXlOLzYuNDU=')} cmliu/CF-SUB ${追加UA}(${userAgentHeader})`);
    return fetch(new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.method === "GET" ? null : request.body,
        redirect: "follow",
        cf: { insecureSkipVerify: true, allowUntrusted: true, validateCertificate: false }
    }));
}

function isValidBase64(str) { const v = String(str || '').replace(/\s/g, ''); return v.length >= 4 && v.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v); }

async function 迁移地址列表(env, txt = 'ADD.txt') {
    const 旧数据 = await env.KV.get(`/${txt}`);
    const 新数据 = await env.KV.get(txt);
    if (旧数据 && !新数据) {
        await env.KV.put(txt, 旧数据);
        await env.KV.delete(`/${txt}`);
        return true;
    }
    return false;
}

function getCookie(request, name) {
    const cookie = request.headers.get('Cookie') || '';
    const cookies = cookie.split(';').map(item => item.trim());
    for (const item of cookies) {
        const index = item.indexOf('=');
        if (index === -1) continue;
        if (item.slice(0, index) === name) return decodeURIComponent(item.slice(index + 1));
    }
    return '';
}

function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...headers
        }
    });
}

function escapeHTML(text = '') {
    return String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function getAdminSessionValue(user, pass, token) {
    if (!user || !pass) return '';
    return await MD5MD5(`${user}:${pass}:${token}:admin-login`);
}

function isAdminLoginEnabled(user, pass) { return !!(user && pass); }

async function isAdminLoggedIn(request, token, user, pass) {
    const session = await getAdminSessionValue(user, pass, token);
    return session ? getCookie(request, 'CF_SUB_ADMIN') === session : false;
}

function buildAdminCookie(value, url) {
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    return `CF_SUB_ADMIN=${encodeURIComponent(value)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

async function handleAdminLogin(request, url, token, user, pass) {
    let inputUser = '';
    let inputPass = '';
    try {
        const form = await request.formData();
        inputUser = String(form.get('username') || '');
        inputPass = String(form.get('password') || '');
    } catch (e) {
        return new Response(renderLoginPage(url, '登录请求格式不正确'), { status: 400, headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (inputUser === user && inputPass === pass) {
        const session = await getAdminSessionValue(user, pass, token);
        return new Response('', { status: 302, headers: { 'Location': url.pathname, 'Set-Cookie': buildAdminCookie(session, url), 'Cache-Control': 'no-store' } });
    }
    return new Response(renderLoginPage(url, '用户名或密码错误'), { status: 401, headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } });
}

// ==================== UI 样式与渲染模块 ====================
function getToolStyles() {
    return `
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f7fa; color: #202124; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; min-height: 100vh; transition: background 0.3s, color 0.3s; }
        .page { width: 100%; max-width: 760px; margin: 0 auto; padding: 18px 14px 28px; }
        .header { margin-bottom: 14px; }
        .title { margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2; color: #1a1a1a; transition: color 0.3s; }
        .subtitle { margin-top: 8px; color: #666; font-size: 13px; }
        .panel { background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(229, 229, 223, 0.8); border-radius: 20px; padding: 16px; margin-top: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); transition: background 0.3s, border-color 0.3s; }
        .section-title { margin: 0 0 10px; font-size: 15px; font-weight: 700; }
        .section-note { margin: 4px 0 10px; color: #888; font-size: 12px; }
        .link-list { display: grid; gap: 10px; }
        .link-item { border: 1px solid rgba(229, 229, 223, 0.6); border-radius: 12px; padding: 12px; background: rgba(255, 255, 255, 0.5); transition: background 0.3s, border-color 0.3s; }
        .link-label { font-weight: 600; margin-bottom: 8px; color: #1a1a1a; transition: color 0.3s; }
        .link-url { display: block; width: 100%; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all; white-space: normal; padding: 10px; border: 1px solid rgba(229, 229, 223, 0.8); border-radius: 8px; background: rgba(250, 250, 250, 0.7); color: #1f4b99; text-decoration: none; transition: all 0.3s ease; }
        .link-url:hover { background: rgba(31, 75, 153, 0.05); border-color: #1f4b99; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        button, .button { min-height: 36px; padding: 8px 16px; border: 1px solid #343a40; border-radius: 10px; background: #2f3338; color: #fff; font-size: 14px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; }
        button:hover, .button:hover { background: #1f2327; box-shadow: 0 4px 12px rgba(34, 34, 34, 0.15); }
        button.secondary { background: #fff; color: #222; border-color: #c8c8c0; }
        button.secondary:hover { background: #f1f3f5; }
        button.danger, .button.danger { background: #dc3545; border-color: #dc3545; }
        button.danger:hover, .button.danger:hover { background: #c82333; box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2); }
        button:disabled { opacity: 0.65; cursor: default; }
        .field { margin-top: 12px; }
        label { display: block; margin-bottom: 6px; font-weight: 600; color: #1a1a1a; transition: color 0.3s; }
        input, textarea, select { width: 100%; border: 1px solid rgba(207, 207, 200, 0.6); border-radius: 10px; background: rgba(255, 255, 255, 0.8); color: #202124; font-size: 14px; padding: 10px; transition: all 0.3s ease; word-wrap: break-word; word-break: break-all; white-space: pre-wrap; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        input, select { height: 42px; white-space: normal; }
        textarea { min-height: 200px; line-height: 1.5; resize: vertical; }
        .error { color: #b00020; margin-top: 10px; }
        .muted { color: #666; font-size: 13px; margin-left: 8px; transition: color 0.3s; }
        .toast { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); display: none; min-width: 190px; max-width: calc(100vw - 40px); padding: 12px 18px; text-align: center; color: #fff; background: rgba(0, 0, 0, 0.82); border-radius: 12px; z-index: 9999; }
        .status-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; font-weight: 600; width: 100%; word-break: break-all; transition: background 0.3s, color 0.3s, border-color 0.3s; }
        .status-ok { background: rgba(76, 175, 80, 0.1); color: #2e7d32; border: 1px solid rgba(76, 175, 80, 0.2); }
        .status-warn { background: rgba(255, 152, 0, 0.1); color: #f57c00; border: 1px solid rgba(255, 152, 0, 0.2); }
        .status-error { background: rgba(244, 67, 54, 0.1); color: #c62828; border: 1px solid rgba(244, 67, 54, 0.2); }
        #current-qrcode { display: none; margin-top: 12px; padding: 12px; border: 1px solid rgba(229, 229, 223, 0.6); border-radius: 12px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); width: fit-content; max-width: 100%; }
        .hidden { display: none !important; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center; z-index: 1000; overflow-y: auto; }
        .modal-content { background: rgba(255, 255, 255, 0.95); border-radius: 20px; padding: 24px; width: 90%; max-width: 480px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.5); transition: background 0.3s, border-color 0.3s; margin: 20px auto; }
        @media (prefers-color-scheme: dark) {
            body { background: #121212; color: #e0e0e0; }
            .title { color: #f5f5f5; }
            .subtitle, .section-note, .muted { color: #aaa; }
            .panel { background: rgba(30, 30, 30, 0.75); border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
            .link-item { background: rgba(40, 40, 40, 0.5); border-color: rgba(255, 255, 255, 0.1); }
            .link-label, label { color: #ddd; }
            .link-url { background: rgba(0, 0, 0, 0.3); color: #64b5f6; border-color: rgba(255,255,255,0.1); }
            .link-url:hover { background: rgba(100, 181, 246, 0.1); border-color: #64b5f6; }
            input, textarea, select { background: rgba(20, 20, 20, 0.8); color: #fff; border-color: rgba(255,255,255,0.2); }
            input:focus, textarea:focus, select:focus { background: #000; border-color: #3b82f6; }
            button, .button { background: #3f4650; color: #fff; border-color: #69717c; box-shadow: 0 2px 8px rgba(0,0,0,0.28); }
            button:hover, .button:hover { background: #525b67; border-color: #858f9b; box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
            button.secondary { background: #3a414a; color: #fff; border-color: #69717c; }
            button.secondary:hover { background: #4b5561; border-color: #858f9b; }
            button.danger { background: #b8323f; color: #fff; border-color: #d24b58; }
            button.danger:hover { background: #d13e4d; border-color: #e16a75; }
            .status-ok { background: rgba(129, 199, 132, 0.1); color: #81c784; border-color: rgba(129, 199, 132, 0.2); }
            .status-warn { background: rgba(255, 183, 77, 0.1); color: #ffb74d; border-color: rgba(255, 183, 77, 0.2); }
            .status-error { background: rgba(229, 115, 115, 0.1); color: #e57373; border-color: rgba(229, 115, 115, 0.2); }
            .modal-content { background: rgba(30, 30, 30, 0.95); border-color: rgba(255, 255, 255, 0.1); }
            #current-qrcode { background: rgba(255, 255, 255, 0.9); }
        }
    `;
}

function getSubscriptionLinks(url, token) {
    const base = "https://" + url.hostname + "/" + token;
    return [
        ['自适应订阅地址', base],
        ['Base64订阅地址', `${base}?b64`],
        ['Clash订阅地址', `${base}?clash`],
        ['Sing-box订阅地址', `${base}?sb`],
        ['Surge订阅地址', `${base}?surge`],
        ['Loon订阅地址', `${base}?loon`],
    ];
}

function renderLinkList(links) {
    return `<div class="link-list">
        ${links.map(([label, value]) => `
            <div class="link-item">
                <div class="link-label">${escapeHTML(label)}</div>
                <a class="link-url" href="${escapeHTML(value)}" target="_blank">${escapeHTML(value)}</a>
                <div class="actions">
                    <button type="button" class="copy-btn" onclick="copySubscription(this)" data-url="${escapeHTML(value)}">复制</button>
                    <button type="button" class="secondary hide-btn hidden" onclick="hideQrcode(this)">隐藏二维码</button>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function renderToolScripts(includeEditor = false) {
    return `<script>
        let toastTimer;
        function showToast(message) {
            const toast = document.getElementById('copyNotice');
            toast.textContent = message;
            toast.style.display = 'block';
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { toast.style.display = 'none'; }, 1500);
        }
        function copySubscription(button) {
            navigator.clipboard.writeText(button.dataset.url).then(function () {
                showToast('已复制到剪贴板');
                showQrcode(button);
                button.classList.add('hidden');
                const hideBtn = button.closest('.actions').querySelector('.hide-btn');
                if (hideBtn) hideBtn.classList.remove('hidden');
            }).catch(function () { showToast('复制失败，请手动复制'); });
        }
        function showQrcode(button) {
            const qrcodeDiv = document.getElementById('current-qrcode');
            button.closest('.link-item').appendChild(qrcodeDiv);
            qrcodeDiv.innerHTML = '';
            qrcodeDiv.style.display = 'block';
            new QRCode(qrcodeDiv, { text: button.dataset.url, width: 220, height: 220, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.Q });
        }
        function hideQrcode(button) {
            const qrcodeDiv = document.getElementById('current-qrcode');
            qrcodeDiv.style.display = 'none';
            qrcodeDiv.innerHTML = '';
            button.classList.add('hidden');
            const copyBtn = button.closest('.actions').querySelector('.copy-btn');
            if (copyBtn) copyBtn.classList.remove('hidden');
        }

        ${includeEditor ? `
        function openSecurityModal() { document.getElementById('securityModal').style.display = 'flex'; }
        function closeSecurityModal() { document.getElementById('securityModal').style.display = 'none'; }
        
        function openFakeModal() { document.getElementById('fakeModal').style.display = 'flex'; }
        function closeFakeModal() { document.getElementById('fakeModal').style.display = 'none'; }
        
        function switchFakeMode() {
            const mode = document.getElementById('fake-mode').value;
            document.getElementById('fake-group-url').classList.add('hidden');
            document.getElementById('fake-group-url302').classList.add('hidden');
            document.getElementById('fake-group-code').classList.add('hidden');
            
            if (mode === '1') document.getElementById('fake-group-url').classList.remove('hidden');
            if (mode === '2') document.getElementById('fake-group-url302').classList.remove('hidden');
            if (mode === '3') document.getElementById('fake-group-code').classList.remove('hidden');
        }

        function saveConfig(button, type) {
            const isSec = type === 'sec';
            const isFake = type === 'fake';
            const statusElem = document.getElementById(isSec ? 'secSaveStatus' : (isFake ? 'fakeSaveStatus' : 'configSaveStatus'));

            const secPass = document.getElementById('sec-pass') ? document.getElementById('sec-pass').value : '';
            const secPass2 = document.getElementById('sec-pass2') ? document.getElementById('sec-pass2').value : '';
            if (isSec && secPass !== secPass2) { alert('两次输入的密码不一致！'); return; }

            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = '保存中...';

            fetch(window.location.href, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'config',
                    settings: {
                        user: document.getElementById('sec-user') ? document.getElementById('sec-user').value : '',
                        pass: secPass,
                        adminPath: document.getElementById('sec-admin-path') ? document.getElementById('sec-admin-path').value : 'admin',
                        subName: document.getElementById('config-subname') ? document.getElementById('config-subname').value : '',
                        subApi: document.getElementById('config-subapi') ? document.getElementById('config-subapi').value : '',
                        subConfig: document.getElementById('config-subconfig') ? document.getElementById('config-subconfig').value : '',
                        noAds: document.getElementById('config-noads') ? document.getElementById('config-noads').value : '',
                        fakeMode: document.getElementById('fake-mode') ? document.getElementById('fake-mode').value : '',
                        fakeUrl: document.getElementById('fake-url') ? document.getElementById('fake-url').value : '',
                        fakeUrl302: document.getElementById('fake-url302') ? document.getElementById('fake-url302').value : '',
                        fakeCode: document.getElementById('fake-code') ? document.getElementById('fake-code').value : ''
                    }
                }),
                headers: { 'Content-Type': 'application/json' }
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            }).then(function (res) {
                return res.text().then(function (text) {
                    let data = {};
                    try { data = JSON.parse(text); } catch (e) {}
                    statusElem.textContent = '已保存 ' + new Date().toLocaleString();
                    statusElem.style.color = 'var(--coral, #2e7d32)';
                    if (isSec && data.adminPath) {
                        setTimeout(() => window.location.replace('/'), 300);
                    } else {
                        setTimeout(() => window.location.reload(), 500);
                    }
                });
            }).catch(function (err) {
                statusElem.textContent = '保存失败: 网络异常或超时';
                statusElem.style.color = '#c62828';
                console.error(err);
            }).finally(function () {
                button.disabled = false;
                button.textContent = originalText;
            });
        }

        function saveContent(button) {
            const textarea = document.getElementById('content');
            const statusElem = document.getElementById('saveStatus');
            if (!textarea) return;
            textarea.value = textarea.value.replace(/：/g, ':');
            button.disabled = true;
            button.textContent = '保存中...';
            fetch(window.location.href, {
                method: 'POST',
                body: JSON.stringify({ type: 'content', content: textarea.value || '' }),
                headers: { 'Content-Type': 'application/json' }
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                statusElem.textContent = '已保存 ' + new Date().toLocaleString();
                statusElem.style.color = '#2e7d32';
            }).catch(function (err) {
                statusElem.textContent = '保存失败: 网络异常';
                statusElem.style.color = '#c62828';
                console.error(err);
            }).finally(function () {
                button.disabled = false;
                button.textContent = '保存节点订阅';
            });
        }
        ` : ''}
    </script>`;
}

function renderLoginPage(url, error = '') {
    return `<!DOCTYPE html>
<html>
<head>
<title>${escapeHTML(FileName)}管理面板</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${getToolStyles()}
.login-btn { display: block; width: 100%; max-width: 280px; min-height: 44px; margin: 28px auto 6px; background: #2f3338; border: 1px solid #343a40; border-radius: 12px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
.login-btn:hover { background: #1f2327; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); }
@media (prefers-color-scheme: dark) { .login-btn { background: #3f4650; border-color: #69717c; } .login-btn:hover { background: #525b67; border-color: #858f9b; } }
.error { text-align: center; margin-top: 15px; color: #c62828; }
</style>
</head>
<body style="display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0;">
<main class="page" style="width:100%; max-width:420px; padding:20px; margin:0;">
<section class="panel" style="padding:30px 24px; text-align:center;">
<h1 class="title" style="margin-bottom:10px;">${escapeHTML(FileName)}</h1>
<div class="subtitle" style="margin-bottom:24px;">请登录管理员控制台</div>
<form method="POST" action="${escapeHTML(url.pathname)}" style="text-align:left;">
<div class="field"><label>用户名</label><input name="username" type="text" required autofocus></div>
<div class="field"><label>密码</label><input name="password" type="password" required></div>
<button type="submit" class="login-btn">登录</button>
${error ? `<div class="error">${escapeHTML(error)}</div>` : ''}
</form>
</section>
</main>
</body>
</html>`;
}

function renderGuestPage(url, guest, guestName = '') {
    const base = url.pathname;
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>订阅链接页面</title>
<style>${getSubUIStyles()}</style>
</head>
<body>
<main class="page">
<header class="header">
    <h1 class="title">订阅链接页面</h1>
    <div class="subtitle">${escapeHTML(guestName || '你的聚合订阅')}</div>
</header>
<section class="panel">
    <h2 class="section-title">订阅链接</h2>
    <div class="section-note">这是你的专属聚合订阅入口，可直接复制到支持的客户端。</div>
    <div class="result-url" style="margin-top:12px;">${escapeHTML(url.origin + base)}</div>
    <div class="actions">
        <button type="button" id="copyGuest">复制订阅链接</button>
        <a class="button secondary" href="${escapeHTML(base + '?clash')}">Clash</a>
        <a class="button secondary" href="${escapeHTML(base + '?singbox')}">Sing-box</a>
        <a class="button secondary" href="${escapeHTML(base + '?surge')}">Surge</a>
        <a class="button secondary" href="${escapeHTML(base + '?quanx')}">Quantumult X</a>
        <a class="button secondary" href="${escapeHTML(base + '?loon')}">Loon</a>
    </div>
</section>
</main>
<script>
document.getElementById('copyGuest').addEventListener('click',()=>{
 const text=${JSON.stringify(url.origin + base)};
 navigator.clipboard.writeText(text).then(()=>alert('已复制')).catch(()=>alert('复制失败，请手动复制'));
});
</script>
</body>
</html>`;
}

async function renderSubUIHome(request,url,env){
    const cfg=await getConfig(env);
    const apis=normalizeProviderList(cfg.subApis).filter(x=>x.enabled);
    const configs=normalizeProviderList(cfg.subConfigs).filter(x=>x.enabled);
    const prefs=readPublicPreferences(request)||{};

    const defaultApiId=String(cfg.defaultSubApiId||'');
    const defaultConfigId=String(cfg.defaultSubConfigId||'');

    let apiId=String(prefs.apiIds?.[0]||'');
    let configId=String(prefs.configIds?.[0]||'');
    let apiCustom=Boolean(prefs.apiCustom);
    let configCustom=Boolean(prefs.configCustom);
    let apiUrl=apiCustom?String(prefs.apiUrl||''):'';
    let configUrl=configCustom?String(prefs.configUrl||''):'';

    if(!apiCustom && !apis.some(x=>x.id===apiId)) apiId='';
    if(!configCustom && !configs.some(x=>x.id===configId)) configId='';
    if(!apiCustom && !apiId && defaultApiId && apis.some(x=>x.id===defaultApiId)) apiId=defaultApiId;
    if(!configCustom && !configId && defaultConfigId && configs.some(x=>x.id===defaultConfigId)) configId=defaultConfigId;
    if(!apiCustom && !apiId && apis[0]) apiId=apis[0].id;
    if(!configCustom && !configId && configs[0]) configId=configs[0].id;

    const selectedApi=apiCustom?null:apis.find(x=>x.id===apiId);
    const selectedConfig=configCustom?null:configs.find(x=>x.id===configId);
    const apiCurrentValue=apiCustom?apiUrl:(selectedApi?.url||'');
    const configCurrentValue=configCustom?configUrl:(selectedConfig?.url||'');
    const noAds=String(prefs.noAds||'');
    const esc=x=>escapeHTML(String(x??''));
    const json=x=>JSON.stringify(x).replace(/</g,'\\u003c');

    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.subName||'CF-SUBS')} · 订阅转换</title>
<style>
${getSubUIStyles()}
.native-picker{display:block;width:100%;min-height:42px;padding:8px 12px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:inherit;font:inherit;cursor:pointer;appearance:auto;-webkit-appearance:auto}
.native-picker:focus{outline:none;border-color:#287ea8;box-shadow:0 0 0 2px rgba(40,126,168,.15)}
.current-box{margin-top:12px}.current-title{font-size:13px;font-weight:700;margin:0 0 7px}.current-row{display:flex;align-items:flex-start;gap:8px}
.current-api-input{width:100%;height:42px;min-width:0}.current-config-input{width:100%;min-height:70px;resize:none;line-height:1.5;word-break:break-all;overflow-wrap:anywhere}
.edit-custom{display:none;flex:0 0 auto;min-width:72px}.status-box{margin-top:12px}.status-title{font-size:13px;font-weight:700;margin:0 0 7px}.status-list{display:grid;gap:7px}
.status-item{padding:8px 10px;border-radius:9px;font-weight:650;word-break:break-all}.status-item.wait{background:rgba(255,152,0,.1);border:1px solid rgba(255,152,0,.2);color:#f57c00}.status-item.ok{background:rgba(76,175,80,.12);border:1px solid rgba(76,175,80,.25);color:#2e7d32}.status-item.bad{background:rgba(244,67,54,.1);border:1px solid rgba(244,67,54,.22);color:#c62828}
.custom-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1200;padding:20px}.custom-modal{width:min(480px,100%);background:rgba(255,255,255,.96);border:1px solid rgba(229,229,223,.9);border-radius:18px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.22)}.custom-modal h3{margin:0;font-size:17px}.custom-modal p{margin:6px 0 14px;color:#888;font-size:12px}.custom-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
@media(prefers-color-scheme:dark){.native-picker{background:#111;color:#f1f1f1;border-color:rgba(255,255,255,.14)}.native-picker option{background:#1b1b1b;color:#f1f1f1}.current-api-input,.current-config-input{background:rgba(0,0,0,.3);color:#f1f1f1;border-color:rgba(255,255,255,.12)}.status-item.ok{background:rgba(129,199,132,.1);color:#81c784;border-color:rgba(129,199,132,.2)}.status-item.bad{background:rgba(229,115,115,.1);color:#e57373;border-color:rgba(229,115,115,.2)}.status-item.wait{background:rgba(255,183,77,.1);color:#ffb74d;border-color:rgba(255,183,77,.2)}.custom-modal{background:rgba(30,30,30,.97);border-color:rgba(255,255,255,.1)}}
</style>
</head>
<body>
<main class="page">
<header class="header"><h1 class="title">订阅转换</h1><div class="subtitle">粘贴你的订阅链接，生成属于你的聚合订阅。</div></header>

<section class="panel"><h2 class="section-title">订阅链接</h2><div class="section-note">支持多个订阅地址，每行一个。</div><div class="field"><textarea id="sources" placeholder="https://example.com/subscribe&#10;https://example.com/another"></textarea></div></section>

<section class="panel">
<h2 class="section-title">订阅转换后端(SUBAPI)</h2><div class="section-note">选择一个订阅转换后端。</div>
<select class="native-picker" id="apiPicker" aria-label="选择订阅转换后端">
${apis.map(x=>`<option value="${esc(x.url)}" data-id="${esc(x.id)}">${esc(x.name)}</option>`).join('')}
<option value="__custom">自定义</option>
</select>
<div class="current-box"><div class="current-title">当前配置</div><div class="current-row"><input id="apiCurrent" class="current-api-input" readonly value="${esc(apiCurrentValue)}" placeholder="请选择订阅转换后端"><button type="button" class="button secondary edit-custom" id="editApiCustom">编辑</button></div></div>
<div class="status-box"><div class="status-title">可用状态</div><div id="apiStatus" class="status-list"><div class="status-item wait">⏳ 状态检测中</div></div></div>
</section>

<section class="panel">
<h2 class="section-title">订阅转换规则(SUBCONFIG)</h2><div class="section-note">选择一个订阅转换规则。</div>
<select class="native-picker" id="configPicker" aria-label="选择订阅转换规则">
${configs.map(x=>`<option value="${esc(x.url)}" data-id="${esc(x.id)}">${esc(x.name)}</option>`).join('')}
<option value="__custom">自定义</option>
</select>
<div class="current-box"><div class="current-title">当前配置</div><div class="current-row"><textarea id="configCurrent" class="current-config-input" readonly placeholder="请选择订阅转换规则">${esc(configCurrentValue)}</textarea><button type="button" class="button secondary edit-custom" id="editConfigCustom">编辑</button></div></div>
<div class="status-box"><div class="status-title">可用状态</div><div id="configStatus" class="status-list"><div class="status-item wait">⏳ 状态检测中</div></div></div>
</section>

<section class="panel"><h2 class="section-title">排除节点</h2><div class="section-note">公开使用。每行填写一个关键词，包含关键词的节点会被排除。</div><div class="field"><textarea id="noAds" placeholder="例如：t.me&#10;广告&#10;example.com">${esc(noAds)}</textarea></div></section>
<button class="primary" id="generate" type="button">生成聚合订阅</button>
<section id="result" class="panel result-panel" hidden><h2 class="section-title">订阅链接</h2><div class="section-note">生成成功，打开下面的链接即可访问你的订阅链接页面。</div><div class="result-url" id="direct"></div><div class="actions"><button class="button" id="copyDirect" type="button">复制订阅链接</button><a class="button secondary" id="openDirect" target="_blank" rel="noopener">打开订阅链接</a></div></section>
</main>

<div id="customApiModal" class="custom-modal-overlay"><div class="custom-modal"><h3>自定义订阅转换后端</h3><p>输入你自己的 SUBAPI 地址。</p><input id="customApiInput" placeholder="https://subapi.example.com"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelApiCustom">取消</button><button type="button" class="button" id="saveApiCustom">保存</button></div></div></div>
<div id="customConfigModal" class="custom-modal-overlay"><div class="custom-modal"><h3>自定义订阅转换规则</h3><p>输入你自己的 SUBCONFIG 地址。</p><input id="customConfigInput" placeholder="https://example.com/config.ini"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelConfigCustom">取消</button><button type="button" class="button" id="saveConfigCustom">保存</button></div></div></div>

<script id="cf-subs-public-script">
const API_LIST=${json(apis)},CONFIG_LIST=${json(configs)};
const PUBLIC_STATE={apiId:${json(apiId)},configId:${json(configId)},apiCustom:${apiCustom},configCustom:${configCustom},apiUrl:${json(apiUrl)},configUrl:${json(configUrl)}};
const $=id=>document.getElementById(id);

function currentValue(kind){
 const api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(!picker)return '';
 if(picker.value==='__custom') return api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;
 return String(picker.value||'');
}
function currentId(kind){
 const api=kind==='api',picker=$(api?'apiPicker':'configPicker'),o=picker?.options[picker.selectedIndex];
 return String(o?.dataset?.id||'');
}
function updateCurrent(kind){
 const api=kind==='api',picker=$(api?'apiPicker':'configPicker'),current=$(api?'apiCurrent':'configCurrent'),edit=$(api?'editApiCustom':'editConfigCustom');
 const custom=picker.value==='__custom';
 const value=currentValue(kind);
 current.value=value;
 if(api){edit.style.display=custom?'inline-flex':'none';edit.hidden=!custom;}
 else{edit.style.display=custom?'inline-flex':'none';edit.hidden=!custom;current.style.height='auto';current.style.height=Math.max(70,Math.min(260,current.scrollHeight))+'px';}
}
function savePrefs(){
 const a=$('apiPicker'),c=$('configPicker');
 const v={apiIds:a?.value==='__custom'?[]:[currentId('api')],apiCustom:a?.value==='__custom',apiUrl:a?.value==='__custom'?PUBLIC_STATE.apiUrl:'',configIds:c?.value==='__custom'?[]:[currentId('config')],configCustom:c?.value==='__custom',configUrl:c?.value==='__custom'?PUBLIC_STATE.configUrl:'',noAds:($('noAds')?.value||'').trim()};
 const e=encodeURIComponent(JSON.stringify(v));
 if(e.length<=3600)document.cookie='CF_SUB_PREFS='+e+'; Max-Age=2592000; Path=/; SameSite=Lax; Secure';
}
function setStatus(id,html){const el=$(id);if(el)el.innerHTML=html;}
function statusText(kind,info,ok){
 const api=kind==='api';
 if(ok){
  if(api){
   const version=String(info?.version||'').trim();
   return '✅ SUBAPI状态正常'+(version?' ('+escapeHTML(version)+')':'');
  }
  return '✅ SUBCONFIG状态正常';
 }
 return api?'❌ SUBAPI状态异常':'❌ SUBCONFIG状态异常';
}
function escapeHTML(value=''){
 return String(value).replace(/[&<>\"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
}
async function checkStatus(kind){
 const api=kind==='api',value=currentValue(kind),id=api?'apiStatus':'configStatus';
 if(!value){setStatus(id,'<div class="status-item bad">'+statusText(kind,null,false)+'</div>');return;}
 setStatus(id,'<div class="status-item wait">⏳ 状态检测中</div>');
 const query=api?'/api/status?api='+encodeURIComponent(value):'/api/status?config='+encodeURIComponent(value);
 let timer;
 try{
  const controller=new AbortController();
  timer=setTimeout(()=>controller.abort(),5000);
  const r=await fetch(query,{cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});
  const d=await r.json().catch(()=>({}));
  const info=api?d.api:d.config;
  const ok=Boolean(r.ok&&d.ok&&info?.ok);
  setStatus(id,'<div class="status-item '+(ok?'ok':'bad')+'">'+statusText(kind,info,ok)+'</div>');
 }catch(e){
  setStatus(id,'<div class="status-item bad">'+(api?'❌ SUBAPI检测失败':'❌ SUBCONFIG检测失败')+'</div>');
 }finally{
  if(timer)clearTimeout(timer);
 }
}
function onPickerChange(kind){
 const api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(!picker)return;
 if(picker.value==='__custom'){
   const old=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;
   $(api?'customApiInput':'customConfigInput').value=old||'';
   $(api?'customApiModal':'customConfigModal').style.display='flex';
   setTimeout(()=>$(api?'customApiInput':'customConfigInput').focus(),0);
   updateCurrent(kind);
   savePrefs();
   return;
 }
 if(api){PUBLIC_STATE.apiId=currentId('api');PUBLIC_STATE.apiCustom=false;}else{PUBLIC_STATE.configId=currentId('config');PUBLIC_STATE.configCustom=false;}
 updateCurrent(kind);
 savePrefs();
 checkStatus(kind);
}
function openCustom(kind){const api=kind==='api';$(api?'customApiInput':'customConfigInput').value=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;$(api?'customApiModal':'customConfigModal').style.display='flex';}
function cancelCustom(kind){
 const api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(api){PUBLIC_STATE.apiCustom=false;PUBLIC_STATE.apiUrl='';if(PUBLIC_STATE.apiId)picker.value=API_LIST.find(x=>x.id===PUBLIC_STATE.apiId)?.url||API_LIST[0]?.url||'';else picker.selectedIndex=0;}
 else{PUBLIC_STATE.configCustom=false;PUBLIC_STATE.configUrl='';if(PUBLIC_STATE.configId)picker.value=CONFIG_LIST.find(x=>x.id===PUBLIC_STATE.configId)?.url||CONFIG_LIST[0]?.url||'';else picker.selectedIndex=0;}
 $(api?'customApiModal':'customConfigModal').style.display='none';updateCurrent(kind);savePrefs();checkStatus(kind);
}
function saveCustom(kind){
 const api=kind==='api',input=$(api?'customApiInput':'customConfigInput'),value=input.value.trim();
 if(!/^https?:\\/\\//i.test(value)){alert('URL 必须以 http:// 或 https:// 开头');return;}
 if(api){PUBLIC_STATE.apiUrl=value;PUBLIC_STATE.apiCustom=true;PUBLIC_STATE.apiId='';$('apiPicker').value='__custom';}
 else{PUBLIC_STATE.configUrl=value;PUBLIC_STATE.configCustom=true;PUBLIC_STATE.configId='';$('configPicker').value='__custom';}
 $(api?'customApiModal':'customConfigModal').style.display='none';updateCurrent(kind);savePrefs();checkStatus(kind);
}
function initPublicHome(){
 const ap=$('apiPicker'),cp=$('configPicker');
 if(ap){
  if(PUBLIC_STATE.apiCustom)ap.value='__custom';else{const item=API_LIST.find(x=>x.id===PUBLIC_STATE.apiId)||API_LIST[0];if(item)ap.value=item.url;}
  ap.addEventListener('change',()=>onPickerChange('api'));
 }
 if(cp){
  if(PUBLIC_STATE.configCustom)cp.value='__custom';else{const item=CONFIG_LIST.find(x=>x.id===PUBLIC_STATE.configId)||CONFIG_LIST[0];if(item)cp.value=item.url;}
  cp.addEventListener('change',()=>onPickerChange('config'));
 }
 $('editApiCustom')?.addEventListener('click',()=>openCustom('api'));$('editConfigCustom')?.addEventListener('click',()=>openCustom('config'));
 $('cancelApiCustom')?.addEventListener('click',()=>cancelCustom('api'));$('cancelConfigCustom')?.addEventListener('click',()=>cancelCustom('config'));
 $('saveApiCustom')?.addEventListener('click',()=>saveCustom('api'));$('saveConfigCustom')?.addEventListener('click',()=>saveCustom('config'));
 updateCurrent('api');updateCurrent('config');savePrefs();checkStatus('api');checkStatus('config');
 $('noAds')?.addEventListener('input',savePrefs);
 $('copyDirect')?.addEventListener('click',async()=>{const v=$('direct').textContent.trim();try{await navigator.clipboard.writeText(v);alert('已复制')}catch(e){alert('复制失败，请手动复制')}});
 $('generate')?.addEventListener('click',async()=>{
  const sources=$('sources').value.trim(),a=$('apiPicker'),c=$('configPicker'),apiCustom=a.value==='__custom',configCustom=c.value==='__custom',apiValue=currentValue('api'),configValue=currentValue('config');
  if(!sources)return alert('请输入订阅链接');if(!apiValue)return alert('请选择订阅转换后端');if(!configValue)return alert('请选择订阅转换规则');
  const body={sources,apiIds:apiCustom?[]:[currentId('api')],apiCustom,apiUrl:apiCustom?apiValue:'',configIds:configCustom?[]:[currentId('config')],configCustom,configUrl:configCustom?configValue:'',noAds:($('noAds').value||'').trim()};
  const button=$('generate');button.disabled=true;button.textContent='生成中…';
  try{const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(body)});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'生成失败');$('direct').textContent=d.subscription_url;$('openDirect').href=d.subscription_url;$('result').hidden=false;$('result').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){alert(e.message||'生成失败')}finally{button.disabled=false;button.textContent='生成聚合订阅';}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPublicHome);else initPublicHome();
</script>
</body></html>`;
}
function getSubUIStyles(){return getToolStyles()+`
.page{width:100%;max-width:760px;margin:0 auto;padding:18px 14px 28px}
.header{margin-bottom:14px}.title{margin:0;font-size:28px;font-weight:700;line-height:1.2}.subtitle{margin-top:8px}
.panel{margin-top:12px}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.checks{display:grid;gap:8px}.check{display:grid;grid-template-columns:18px minmax(0,1fr);align-items:center;gap:8px;margin:0;padding:10px;border:1px solid rgba(229,229,223,.6);border-radius:10px;background:rgba(255,255,255,.5);cursor:pointer}
.check input{width:18px;height:18px;margin:0}.check span{font-weight:600}.check small{grid-column:2;color:#888;font-size:12px;word-break:break-all;overflow-wrap:anywhere}
.primary{width:100%;min-height:42px;margin-top:12px}.result-panel[hidden]{display:none}.result-label{margin-top:12px;margin-bottom:6px;font-size:12px;font-weight:600;color:#666}.result-url{padding:10px;border:1px solid rgba(229,229,223,.8);border-radius:8px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere}
@media(max-width:600px){.row{grid-template-columns:1fr}}
@media(prefers-color-scheme:dark){.check{background:rgba(40,40,40,.5);border-color:rgba(255,255,255,.1)}.check small{color:#aaa}.result-label{color:#aaa}.result-url{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.1)}}
`;}


function renderAdminPage(url,env,settings){
    const apis=normalizeProviderList(settings.subApis),configs=normalizeProviderList(settings.subConfigs);
    
    const esc=x=>escapeHTML(String(x??''));
    const safeJson=x=>JSON.stringify(x).replace(/</g,'\\u003c');
    const rows=(list,type,empty)=>list.length?list.map(x=>`<div class="link-item provider-item">
        <div class="provider-main">
            <div class="link-label">${esc(x.name)}</div>
            <div class="provider-url link-url">${esc(x.url)}</div>
        </div>
        <div class="actions admin-row-actions">
            <button type="button" class="secondary" onclick="showProvider('${type}','${esc(x.id)}')">编辑</button>
            <button type="button" class="danger" onclick="deleteProvider('${type}','${esc(x.id)}')">删除</button>
        </div>
    </div>`).join(''):`<div class="empty">${empty}</div>`;

    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(settings.subName||'CF-SUBS')} · 管理后台</title><style>${getToolStyles()}
.sub-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}.provider-main{min-width:0;width:100%}.provider-url{display:block;width:100%;margin-bottom:0;word-break:break-all;overflow-wrap:anywhere}.provider-item{position:relative;padding:12px 104px 12px 12px}.admin-row-actions{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:7px;margin-top:0;align-items:stretch}.admin-row-actions button{min-width:68px}.empty{font-size:12px;color:#888}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.topbar-main{min-width:0;flex:1}.site-title-input{font-size:28px!important;font-weight:700!important;border:0!important;background:transparent!important;padding:0!important;height:auto!important;box-shadow:none!important;color:#1a1a1a!important}.site-title-input:focus{box-shadow:none!important}.top-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.top-actions .button{min-width:86px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px}.modal-content{width:min(460px,100%);background:rgba(255,255,255,.95);border-radius:20px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.5)}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}@media(max-width:600px){.top-actions{width:100%;justify-content:stretch}.top-actions .button{flex:1}.provider-item{padding-right:12px}.admin-row-actions{position:absolute;top:12px;right:12px;width:auto;justify-content:flex-start}.admin-row-actions button{flex:none}.modal-content{padding:20px}}@media(prefers-color-scheme:dark){.site-title-input{color:#f5f5f5!important}.modal-content{background:rgba(30,30,30,.96);border-color:rgba(255,255,255,.1)}.empty{color:#aaa}}</style></head><body><main class="page">
<header class="header topbar"><div class="topbar-main"><input id="siteName" class="site-title-input" value="${esc(settings.subName||'CF-SUBS')}" aria-label="站点标题"><div class="subtitle">管理订阅转换后端、订阅转换规则和站点安全设置。</div></div><div class="top-actions"><button type="button" class="button secondary" onclick="openModal('securityModal')">安全</button><button type="button" class="button secondary" onclick="openModal('pathModal')">管理员路径</button><a class="button danger" href="/${esc(settings.adminPath||'admin')}/logout">退出</a></div></header>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">订阅转换后端(SUBAPI)</h2><div class="section-note">订阅转换后端配置。</div></div><button type="button" onclick="showProvider('subapi','')">＋ 添加订阅转换后端</button></div><div class="sub-grid" style="margin-top:12px">${rows(apis,'subapi','暂无订阅转换后端，请手动添加。')}</div></section>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">订阅转换规则(SUBCONFIG)</h2><div class="section-note">订阅转换规则配置。</div></div><button type="button" onclick="showProvider('subconfig','')">＋ 添加订阅转换规则</button></div><div class="sub-grid" style="margin-top:12px">${rows(configs,'subconfig','暂无订阅转换规则，请手动添加。')}</div></section>
</main>
<div id="providerModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title" id="modalTitle">添加</h2><div class="field"><label for="modalName">备注</label><input id="modalName"></div><div class="field"><label for="modalUrl">URL</label><input id="modalUrl" placeholder="https://..."></div><div class="modal-actions"><button type="button" class="secondary" onclick="hideProvider()">取消</button><button type="button" id="modalSave" onclick="saveProvider()">保存</button></div></div></div>
<div id="securityModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">安全</h2><div class="section-note">修改管理员账号和密码。密码留空表示保持原密码。</div><div class="field"><label for="securityUser">管理员账号</label><input id="securityUser" value="${esc(settings.user||'')}" autocomplete="username"></div><div class="field"><label for="securityPass">管理员密码</label><input id="securityPass" type="password" placeholder="留空保持原密码" autocomplete="new-password"></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal('securityModal')">取消</button><button type="button" id="saveSecurity" onclick="saveSecurity()">保存</button></div></div></div>
<div id="pathModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">管理员路径</h2><div class="section-note">保存后立即进入新的管理员地址。</div><div class="field"><label for="pathValue">路径</label><input id="pathValue" value="${esc(settings.adminPath||'admin')}" placeholder="admin"></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal('pathModal')">取消</button><button type="button" id="savePath" onclick="savePath()">保存</button></div></div></div>
<script>
let toastTimer;
function showToast(message){
    let toast=document.getElementById('adminToast');
    if(!toast){
        toast=document.createElement('div');
        toast.id='adminToast';
        toast.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;padding:12px 18px;border-radius:12px;background:rgba(20,22,25,.92);color:#fff;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.25);pointer-events:none;';
        document.body.appendChild(toast);
    }
    toast.textContent=message;
    toast.style.display='block';
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{toast.style.display='none'},1400);
}
const DATA=${safeJson({apis,configs})};
let modalState=null;
const $=id=>document.getElementById(id);
function openModal(id){const el=$(id);if(el)el.style.display='flex'}
function closeModal(id){const el=$(id);if(el)el.style.display='none'}
function showProvider(type,id){
 const list=type==='subapi'?DATA.apis:DATA.configs,old=id?list.find(x=>x.id===id):null;
 modalState={type,id:id||''};
 $('modalTitle').textContent=(id?'编辑 ':'添加 ')+(type==='subapi'?'订阅转换后端':'订阅转换规则');
 $('modalName').value=old?.name||'';$('modalUrl').value=old?.url||'';
 openModal('providerModal');
}
function hideProvider(){closeModal('providerModal');modalState=null}
async function post(data){
 const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(data)});
 const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch(e){}
 if(!d)throw new Error('服务器返回无效数据（HTTP '+r.status+'）');
 if(!r.ok||d.ok===false)throw new Error(d.error||('操作失败（HTTP '+r.status+'）'));
 return d;
}
async function deleteProvider(type,id){
 if(!confirm('确定删除这个项目？'))return;
 try{await post({type:type+'_delete',id});showToast('已删除');setTimeout(()=>location.reload(),500)}
 catch(e){alert(e.message||'删除失败')}
}
async function saveProvider(){
 if(!modalState)return;
 const name=$('modalName').value.trim(),url=$('modalUrl').value.trim();
 if(!name)return alert('请输入备注');
 if(!/^https?:\\/\\//i.test(url))return alert('URL 必须以 http:// 或 https:// 开头');
 const b=$('modalSave'),editing=Boolean(modalState.id);b.disabled=true;b.textContent='保存中...';
 try{
  await post({type:modalState.type+'_'+(editing?'update':'create'),id:modalState.id,name,url});
  hideProvider();showToast(editing?'已保存':'已添加');setTimeout(()=>location.reload(),700);
 }catch(e){alert(e.message||'保存失败')}finally{b.disabled=false;b.textContent='保存'}
}
async function saveSecurity(){
 const user=$('securityUser').value.trim(),pass=$('securityPass').value;
 if(!user)return alert('管理员账号不能为空');
 const b=$('saveSecurity');b.disabled=true;b.textContent='保存中...';
 try{await post({type:'security',user,pass});closeModal('securityModal');showToast('安全设置已保存');setTimeout(()=>location.reload(),700)}
 catch(e){alert(e.message||'保存失败')}finally{b.disabled=false;b.textContent='保存'}
}
async function savePath(){
 const path=$('pathValue').value.trim();
 if(!/^[A-Za-z0-9_-]{2,60}$/.test(path))return alert('管理员路径只能使用 2-60 个字母、数字、下划线或短横线');
 const b=$('savePath');b.disabled=true;b.textContent='保存中...';
 try{const d=await post({type:'admin_path',adminPath:path});closeModal('pathModal');showToast('管理员路径已保存');setTimeout(()=>{location.href='/'+d.adminPath},700)}
 catch(e){alert(e.message||'保存失败')}finally{b.disabled=false;b.textContent='保存'}
}
function saveSiteName(){
 const name=$('siteName').value.trim()||'CF-SUBS';
 post({type:'site_name',subName:name}).then(()=>showToast('站点标题已保存')).catch(e=>alert(e.message||'保存失败'));
}

document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.style.display='none'}));
$('siteName').addEventListener('change',async()=>{
    const name=$('siteName').value.trim()||'CF-SUBS';
    try{
        await post({type:'site_name',subName:name});
        showToast('站点标题已保存');
    }catch(e){
        alert(e.message);
    }
});
</script></body></html>`;
}
