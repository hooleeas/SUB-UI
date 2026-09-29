/**
 * CF-SUBS
 * 基于 CF-SUB 核心能力扩展的多 SUB / 多订阅链接 URL 管理版
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
 *   URL:<url>
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

// ================= 全局默认配置 =================
const defaultSubConverter = "SUBAPI.cmliussss.net";
const defaultSubConfig = "https://raw.githubusercontent.com/hooleeas/ACL4SSR/refs/heads/master/Clash/config/China_Direct_Overseas_Proxy.ini";
const defaultSubProtocol = "https";
// ================================================

let subConverter = defaultSubConverter;
let subConfig = defaultSubConfig;
let subProtocol = defaultSubProtocol;
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

                    subConverter = kvConfig.subApi || '';
                    subConfig = kvConfig.subConfig || '';
                    config_noAds = kvConfig.noAds || '';

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
        subProtocol = defaultSubProtocol;

        if (subConverter.includes('http://')) {
            subConverter = subConverter.split('//')[1];
            subProtocol = 'http';
        } else if (subConverter.includes('https://')) {
            subConverter = subConverter.split('//')[1] || subConverter;
        }

        const effectiveSubConverter = hasCustomApi ? subConverter : defaultSubConverter;
        const effectiveSubProtocol = hasCustomApi ? subProtocol : defaultSubProtocol;
        const effectiveSubConfig = hasCustomConfig ? subConfig : defaultSubConfig;

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
            return jsonResponse({ ok: true, subApis: normalizeProviderList(cfg.subApis), subConfigs: normalizeProviderList(cfg.subConfigs), shortLinks: normalizeProviderList(cfg.shortLinks) });
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

        // ==================== 解析公开 URL ====================
        // 新版 URL：
        //   /abc123
        //   /abc123?clash
        //   /?token=abc123
        //
        // 兼容旧 CF-SUB：
        //   /auto
        //   /?token=auto
        let publicToken = queryToken;

        if (!publicToken && url.pathname !== '/') {
            publicToken = decodeURIComponent(url.pathname.slice(1));
        }

        let tokenData = null;

        if (env.KV && publicToken) {
            tokenData = await getToken(env, publicToken);
        }

        const legacyAdminPath =
            publicToken === mytoken ||
            publicToken.toLowerCase() === String(mytoken).toLowerCase();

        const isFakeTokenRequest =
            publicToken === fakeToken ||
            url.pathname === '/' + fakeToken;

        // 新 URL / auto / fakeToken 都属于有效入口
        const validPublicEntry =
            !!tokenData || legacyAdminPath || isFakeTokenRequest;

        // ==================== 无效路径 / 主页 ====================
        if (!validPublicEntry && url.pathname !== '/') {
            return Response.redirect(url.origin + '/', 302);
        }

        if (!validPublicEntry && url.pathname === '/') {
            if (fakeMode === '1' && fakeUrl) {
                try {
                    return await proxyURL(fakeUrl, url, FileName);
                } catch (e) {}
            } else if (fakeMode === '2' && fakeUrl302) {
                return Response.redirect(fakeUrl302, 302);
            } else if (fakeMode === '3' && fakeCode && fakeCode.trim() !== '') {
                let html = fakeCode;
                const title = `<title>${escapeHTML(FileName)}</title>`;
                if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
                    html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, title);
                } else if (/<head\b[^>]*>/i.test(html)) {
                    html = html.replace(/<head\b[^>]*>/i, match => match + title);
                } else {
                    html = title + html;
                }
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
                });
            }

            return new Response(await renderSubUIHome(url, env), {
                headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-store' }
            });
        }

        // ==================== 获取当前入口的来源 ====================
        let selectedSources = [];

        if (tokenData) {
            // SUB-UI 生成链接直接保存来源；原有 URL 继续走 SUB 聚合。
            selectedSources = Array.isArray(tokenData.sources) && tokenData.sources.length
                ? cleanSourceList(tokenData.sources)
                : await getSourcesForToken(env, tokenData);
        } else {
            // 兼容旧 CF-SUB：
            // auto = 所有 SUBS；fake = 所有 SUBS
            if (isFakeTokenRequest && conversionSourceToken) {
                const sourceTokenData = await getToken(env, conversionSourceToken);
                if (sourceTokenData) {
                    selectedSources = await getSourcesForToken(env, sourceTokenData);
                } else {
                    selectedSources = await getAllManagedSources(env);
                }
            } else if (legacyAdminPath || isFakeTokenRequest) {
                selectedSources = await getAllManagedSources(env);
            } else if (legacyGuestPath) {
                // 如果没有 SUBS，则使用旧 LINK.txt / LINK 环境变量。
                selectedSources = await getLegacySources(env);
                if (!selectedSources.length) {
                    selectedSources = await getAllManagedSources(env);
                }
            }
        }

        // ==================== 浏览器 UI ====================
        if (
            userAgent.includes('mozilla') &&
            !url.search &&
            !isProxyClientUA
        ) {
            const status = await getBackendStatus(
                effectiveSubConverter,
                effectiveSubConfig,
                effectiveSubProtocol,
                hasCustomApi,
                hasCustomConfig
            );

            // 新 URL：订阅页面
            if (tokenData) {
                return new Response(
                    renderGuestPage(
                        url,
                        tokenData.url,
                        tokenData.name
                    ),
                    { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
                );
            }

            // auto / mytoken：管理员后台仍支持旧入口，但新项目推荐 /admin
            if (legacyAdminPath) {
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
                    hasCustomConfig
                });
            }
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
                config_noAds,
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

async function getBackendStatus(api, config, protocol, hasCustomApi, hasCustomConfig) {
    let customApiOk = false;
    let customApiVersion = '';
    let defaultApiOk = false;
    let defaultApiVersion = '';
    let customConfigOk = false;
    let defaultConfigOk = false;

    async function probeApi(targetApi, targetProtocol) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(`${targetProtocol}://${targetApi}/version`, {
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (res.ok) {
                return {
                    ok: true,
                    version: (await res.text()).trim().substring(0, 30)
                };
            }
        } catch (e) {}
        return { ok: false };
    }

    async function probeConfig(configUrl) {
        if (!configUrl) return false;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(configUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeout);
            return res.ok;
        } catch (e) {
            return false;
        }
    }

    if (hasCustomApi) {
        const res = await probeApi(api, protocol);
        customApiOk = res.ok;
        customApiVersion = res.version || '';
        if (!customApiOk) {
            const resDef = await probeApi(defaultSubConverter, defaultSubProtocol);
            defaultApiOk = resDef.ok;
            defaultApiVersion = resDef.version || '';
        }
    } else {
        const resDef = await probeApi(defaultSubConverter, defaultSubProtocol);
        defaultApiOk = resDef.ok;
        defaultApiVersion = resDef.version || '';
    }

    if (hasCustomConfig) {
        customConfigOk = await probeConfig(config);
        if (!customConfigOk) defaultConfigOk = await probeConfig(defaultSubConfig);
    } else {
        defaultConfigOk = await probeConfig(defaultSubConfig);
    }

    let adminApiHtml = '';
    let guestApiHtml = '';
    let finalApiUrl = '';
    let adminApiCss = '';
    let guestApiCss = '';

    if (hasCustomApi && customApiOk) {
        adminApiHtml = `✅SUBAPI状态正常 (${escapeHTML(customApiVersion)})`;
        guestApiHtml = adminApiHtml;
        finalApiUrl = `${protocol}://${api}`;
        adminApiCss = 'status-ok';
        guestApiCss = 'status-ok';
    } else if (hasCustomApi && !customApiOk && defaultApiOk) {
        adminApiHtml = `⚠️SUBAPI无效 已切换为默认配置 ✅默认值可用`;
        guestApiHtml = `✅SUBAPI状态正常 (${escapeHTML(defaultApiVersion)})`;
        finalApiUrl = `${defaultSubProtocol}://${defaultSubConverter}`;
        adminApiCss = 'status-warn';
        guestApiCss = 'status-ok';
    } else if (!hasCustomApi && defaultApiOk) {
        adminApiHtml = `⚠️SUBAPI为空 已切换为默认配置 ✅默认值可用`;
        guestApiHtml = `✅SUBAPI状态正常 (${escapeHTML(defaultApiVersion)})`;
        finalApiUrl = `${defaultSubProtocol}://${defaultSubConverter}`;
        adminApiCss = 'status-warn';
        guestApiCss = 'status-ok';
    } else {
        adminApiHtml = '❌SUBAPI无效待维护';
        guestApiHtml = adminApiHtml;
        finalApiUrl = `${defaultSubProtocol}://${defaultSubConverter}`;
        adminApiCss = 'status-error';
        guestApiCss = 'status-error';
    }

    let adminConfigHtml = '';
    let guestConfigHtml = '';
    let finalConfigUrl = '';
    let adminConfigCss = '';
    let guestConfigCss = '';

    if (hasCustomConfig && customConfigOk) {
        adminConfigHtml = '✅SUBCONFIG状态正常';
        guestConfigHtml = adminConfigHtml;
        finalConfigUrl = config;
        adminConfigCss = 'status-ok';
        guestConfigCss = 'status-ok';
    } else if (hasCustomConfig && !customConfigOk && defaultConfigOk) {
        adminConfigHtml = '⚠️SUBCONFIG无效 已切换为默认配置 ✅默认值可用';
        guestConfigHtml = '✅SUBCONFIG状态正常';
        finalConfigUrl = defaultSubConfig;
        adminConfigCss = 'status-warn';
        guestConfigCss = 'status-ok';
    } else if (!hasCustomConfig && defaultConfigOk) {
        adminConfigHtml = '⚠️SUBCONFIG为空 已切换为默认配置 ✅默认值可用';
        guestConfigHtml = '✅SUBCONFIG状态正常';
        finalConfigUrl = defaultSubConfig;
        adminConfigCss = 'status-warn';
        guestConfigCss = 'status-ok';
    } else {
        adminConfigHtml = '❌SUBCONFIG无效待维护';
        guestConfigHtml = adminConfigHtml;
        finalConfigUrl = defaultSubConfig;
        adminConfigCss = 'status-error';
        guestConfigCss = 'status-error';
    }

    return {
        adminApiHtml,
        guestApiHtml,
        finalApiUrl,
        adminApiCss,
        guestApiCss,
        adminConfigHtml,
        guestConfigHtml,
        finalConfigUrl,
        adminConfigCss,
        guestConfigCss
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

    // 管理后台 POST：统一处理配置 / SUB / URL
    if (request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/x-www-form-urlencoded')) {
            return new Response('不支持的数据格式', { status: 400 });
        }

        try {
            const data = await request.json();

            if (data.type === 'config') {
                const old = await getConfig(env);

                const next = {
                    ...old,
                    subName: normalizeName(data.settings?.subName) || 'CF-SUBS',
                    subApi: String(data.settings?.subApi ?? old.subApi ?? '').trim(),
                    subConfig: String(data.settings?.subConfig ?? old.subConfig ?? '').trim(),
                    subApis: normalizeProviderList(data.settings?.subApis ?? old.subApis),
                    subConfigs: normalizeProviderList(data.settings?.subConfigs ?? old.subConfigs),
                    shortLinks: normalizeProviderList(data.settings?.shortLinks ?? old.shortLinks),
                    noAds: String(data.settings?.noAds ?? old.noAds ?? '').trim(),

                    // 保留旧配置
                    user: String(data.settings?.user || old.user || ''),
                    pass: data.settings?.pass
                        ? String(data.settings.pass)
                        : String(old.pass || ''),
                    adminPath: normalizeAdminPath(data.settings?.adminPath || old.adminPath) || DEFAULT_ADMIN_PATH,

                    fakeMode: String(data.settings?.fakeMode ?? old.fakeMode ?? ''),
                    fakeUrl: String(data.settings?.fakeUrl ?? old.fakeUrl ?? ''),
                    fakeUrl302: String(data.settings?.fakeUrl302 ?? old.fakeUrl302 ?? ''),
                    fakeCode: String(data.settings?.fakeCode ?? old.fakeCode ?? '')
                };

                await env.KV.put('CONFIG.json', JSON.stringify(next));
                return jsonResponse({ ok: true, adminPath: next.adminPath });
            }

            if (data.type === 'sub_create') {
                const name = normalizeName(data.name);
                const sources = cleanSourceList(data.sources);

                if (!validName(name)) return new Response('SUBS 名称不能为空且不能超过 80 个字符', { status: 400 });
                if (await isSubNameUsed(env, name)) return new Response('SUBS 名称已存在，不能重名', { status: 409 });
                if (!sources.length) return new Response('至少添加一个订阅地址或单节点', { status: 400 });

                const id = makeSubId();
                const item = {
                    id,
                    name,
                    enabled: data.enabled !== false,
                    sources,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await env.KV.put(`${SUB_PREFIX}${id}`, JSON.stringify(item));
                return jsonResponse({ ok: true, sub: item });
            }

            if (data.type === 'sub_update') {
                const id = String(data.id || '');
                const old = await getSub(env, id);
                if (!old) return new Response('SUBS 不存在', { status: 404 });

                const name = normalizeName(data.name);
                const sources = cleanSourceList(data.sources);

                if (!validName(name)) return new Response('SUBS 名称不能为空且不能超过 80 个字符', { status: 400 });
                if (await isSubNameUsed(env, name, id)) return new Response('SUBS 名称已存在，不能重名', { status: 409 });
                if (!sources.length) return new Response('至少添加一个订阅地址或单节点', { status: 400 });

                const item = {
                    ...old,
                    name,
                    sources,
                    enabled: data.enabled !== false,
                    updatedAt: new Date().toISOString()
                };

                await env.KV.put(`${SUB_PREFIX}${id}`, JSON.stringify(item));
                return jsonResponse({ ok: true, sub: item });
            }

            if (data.type === 'sub_delete') {
                const id = String(data.id || '');
                if (!(await getSub(env, id))) return new Response('SUBS 不存在', { status: 404 });

                await env.KV.delete(`${SUB_PREFIX}${id}`);

                // 删除 SUB 后，自动从所有 URL 的绑定列表移除
                const tokens = await listTokens(env);
                const affected = tokens.filter(item => Array.isArray(item.subs) && item.subs.includes(id));
                await Promise.all(affected.map(item => {
                    item.subs = item.subs.filter(x => x !== id);
                    item.updatedAt = new Date().toISOString();
                    return env.KV.put(`${URL_PREFIX}${item.url}`, JSON.stringify(item));
                }));

                return jsonResponse({ ok: true });
            }

            if (data.type === 'url_create') {
                const name = normalizeName(data.name);
                const mode = data.mode === 'custom' ? 'custom' : 'random';
                let token = normalizeToken(data.url || data.token);
                const selected = Array.isArray(data.subs)
                    ? [...new Set(data.subs.map(String))]
                    : [];

                if (!validName(name)) return new Response('链接名称不能为空且不能超过 80 个字符', { status: 400 });
                if (await isTokenNameUsed(env, name)) return new Response('链接名称已存在，不能重名', { status: 409 });

                if (mode === 'custom') {
                    if (!validCustomToken(token)) {
                        return new Response('自定义 URL 只能使用 3-80 位字母、数字、下划线和短横线', { status: 400 });
                    }
                    if (await getToken(env, token)) {
                        return new Response('URL 已存在，请使用其他 URL', { status: 409 });
                    }
                } else {
                    token = await makeRandomToken(env, 6);
                }

                const validSubs = [];
                for (const id of selected) {
                    if (await getSub(env, id)) validSubs.push(id);
                }

                if (!validSubs.length) {
                    return new Response('至少选择一个聚合节点', { status: 400 });
                }

                const item = {
                    url: token,
                    name,
                    subs: validSubs,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await env.KV.put(`${URL_PREFIX}${token}`, JSON.stringify(item));
                return jsonResponse({ ok: true, url: item });
            }

            if (data.type === 'url_update') {
                const oldToken = normalizeToken(data.oldUrl || data.oldToken || data.url || data.token);
                const newToken = normalizeToken(data.newUrl || data.newToken || data.url || data.token);
                const old = await getToken(env, oldToken);
                if (!old) return new Response('URL 不存在', { status: 404 });

                const name = normalizeName(data.name);
                const selected = Array.isArray(data.subs)
                    ? [...new Set(data.subs.map(String))]
                    : [];

                if (!validName(name)) return new Response('链接名称不能为空且不能超过 80 个字符', { status: 400 });
                if (!validCustomToken(newToken)) {
                    return new Response('URL 只能使用 3-80 位字母、数字、下划线和短横线', { status: 400 });
                }
                if (await isTokenNameUsed(env, name, oldToken)) return new Response('链接名称已存在，不能重名', { status: 409 });

                if (newToken !== oldToken && await getToken(env, newToken)) {
                    return new Response('新的 URL 已存在，请使用其他 URL', { status: 409 });
                }

                const validSubs = [];
                for (const id of selected) {
                    if (await getSub(env, id)) validSubs.push(id);
                }

                if (!validSubs.length) return new Response('至少选择一个聚合节点', { status: 400 });

                const item = {
                    ...old,
                    url: newToken,
                    name,
                    subs: validSubs,
                    updatedAt: new Date().toISOString()
                };

                // URL 本身发生变化时，迁移 KV Key，确保旧地址立即失效、新地址立即生效。
                if (newToken !== oldToken) {
                    await env.KV.put(`${URL_PREFIX}${newToken}`, JSON.stringify(item));
                    await env.KV.delete(`${URL_PREFIX}${oldToken}`);
                } else {
                    await env.KV.put(`${URL_PREFIX}${oldToken}`, JSON.stringify(item));
                }

                return jsonResponse({ ok: true, url: item, oldUrl: oldToken });
            }

            if (data.type === 'url_delete') {
                const token = normalizeToken(data.url || data.token);
                if (!(await getToken(env, token))) return new Response('URL 不存在', { status: 404 });

                await env.KV.delete(`${URL_PREFIX}${token}`);
                return jsonResponse({ ok: true });
            }

            if (['subapi_create','subapi_update','subapi_delete','subconfig_create','subconfig_update','subconfig_delete','shortlink_create','shortlink_update','shortlink_delete'].includes(data.type)) {
                const cfg = await getConfig(env);
                const key = data.type.startsWith('subapi_') ? 'subApis' : data.type.startsWith('subconfig_') ? 'subConfigs' : 'shortLinks';
                const list = normalizeProviderList(cfg[key]);
                const action = data.type.split('_')[1];
                const id = String(data.id || '').trim();
                if (action === 'delete') {
                    if (!list.some(x => x.id === id)) return new Response('项目不存在', { status: 404 });
                    cfg[key] = list.filter(x => x.id !== id);
                } else {
                    const name = normalizeName(data.name);
                    const value = String(data.url || data.apiUrl || '').trim();
                    if (!validName(name)) return new Response('备注不能为空且不能超过 80 个字符', { status: 400 });
                    if (!/^https?:\/\//i.test(value)) return new Response('URL 必须以 http:// 或 https:// 开头', { status: 400 });
                    const item = { id: id || makeSubId(), name, url: value, enabled: data.enabled !== false };
                    if (key === 'shortLinks') item.providerType = String(data.providerType || 'json-root');
                    if (action === 'create') list.push(item);
                    else { const idx=list.findIndex(x=>x.id===id); if(idx<0) return new Response('项目不存在',{status:404}); list[idx]={...list[idx],...item,id}; }
                    cfg[key]=list;
                }
                await env.KV.put('CONFIG.json', JSON.stringify(cfg));
                return jsonResponse({ ok:true, items:list });
            }

            return new Response('不支持的数据类型', { status: 400 });
        } catch (e) {
            return new Response(`服务器错误: ${e.message}`, { status: 500 });
        }
    }

    const [subs, tokens, settings] = await Promise.all([
        listSubs(env),
        listTokens(env),
        getConfig(env)
    ]);

    const status = await getBackendStatus(
        runtime.effectiveSubConverter,
        runtime.effectiveSubConfig,
        runtime.effectiveSubProtocol,
        runtime.hasCustomApi,
        runtime.hasCustomConfig
    );

    return new Response(
        renderAdminPage(
            new URL(request.url),
            env,
            subs,
            tokens,
            settings,
            status
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
        subName: 'CF-SUBS',
        subApi: '',
        subConfig: '',
        subApis: [],
        subConfigs: [],
        shortLinks: [
            { id: 'hooleeas', name: 'Hulian Short', url: 'https://url.hooleeas.com/', providerType: 'json-root', enabled: true }
        ],
        noAds: '',
        user: '',
        pass: '',
        adminPath: DEFAULT_ADMIN_PATH,
        fakeMode: '',
        fakeUrl: '',
        fakeUrl302: '',
        fakeCode: ''
    };

    if (!env.KV) return defaults;

    try {
        const raw = await env.KV.get('CONFIG.json');
        return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch (e) {
        return defaults;
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Cache-Control': 'no-store'
        }
    });
}

/* =========================================================
 * 订阅输出：保留 CF-SUB 原核心逻辑
 * ======================================================= */

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

        // 原 CF-SUB：base64 模式下，对结构化订阅再做 mixed 转换
        if (
            订阅格式 === 'base64' &&
            !isSubConverterRequest &&
            请求订阅响应内容[1].includes('://')
        ) {
            try {
                const u = buildSubUrl(
                    runtime.effectiveSubConverter,
                    runtime.effectiveSubConfig,
                    'mixed',
                    请求订阅响应内容[1],
                    runtime.effectiveSubProtocol
                );

                const res = await fetch(u, {
                    headers: { 'User-Agent': 'v2rayn/CF-SUB' }
                });

                if (!res.ok) throw new Error();

                req_data += '\n' + atob(await res.text());
            } catch (error) {
                try {
                    const fallbackU = buildSubUrl(
                        defaultSubConverter,
                        defaultSubConfig,
                        'mixed',
                        请求订阅响应内容[1],
                        defaultSubProtocol
                    );

                    const res2 = await fetch(fallbackU, {
                        headers: { 'User-Agent': 'v2rayn/CF-SUB' }
                    });

                    if (res2.ok) req_data += '\n' + atob(await res2.text());
                } catch (e) {}
            }
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
        try {
            const fallbackUrl = buildSubUrl(defaultSubConverter, defaultSubConfig, 订阅格式, 订阅转换URL, defaultSubProtocol);
            const resFb = await fetch(fallbackUrl, { headers: { 'User-Agent': runtime.userAgentHeader } });
            if (!resFb.ok) throw new Error();
            let contentFb = await resFb.text();
            if (订阅格式 === 'clash') contentFb = clashFix(contentFb);
            return new Response(contentFb, { headers: responseHeaders });
        } catch (fallbackError) {
            return new Response(base64Data, { headers: responseHeaders });
        }
    }

}

/* =========================================================
 * 以下为原 CF-SUB 核心函数：保持原行为
 * ======================================================= */

function normalizeProviderList(input) {
    if (!Array.isArray(input)) return [];
    return input.map(x => ({
        id: String(x?.id || makeSubId()),
        name: normalizeName(x?.name || '未命名'),
        url: String(x?.url || '').trim(),
        enabled: x?.enabled !== false,
        ...(x?.providerType ? { providerType: String(x.providerType) } : {})
    })).filter(x => x.url);
}

async function getSelectedBackends(env, tokenData, runtime) {
    const cfg = await getConfig(env);
    const apis = normalizeProviderList(cfg.subApis).filter(x => x.enabled);
    const configs = normalizeProviderList(cfg.subConfigs).filter(x => x.enabled);
    const selectedApis = (tokenData?.subApiIds || []).map(id => apis.find(x => x.id === id)).filter(Boolean);
    const selectedConfigs = (tokenData?.subConfigIds || []).map(id => configs.find(x => x.id === id)).filter(Boolean);
    const apiList = selectedApis.length ? selectedApis : (apis.length ? apis : [{ url: runtime.effectiveSubConverter }]);
    const configList = selectedConfigs.length ? selectedConfigs : (configs.length ? configs : [{ url: runtime.effectiveSubConfig }]);
    const pairs=[];
    for(const api of apiList){ let apiUrl=String(api.url||'').trim(), protocol=/^http:\/\//i.test(apiUrl)?'http':'https'; apiUrl=apiUrl.replace(/^https?:\/\//i,'').replace(/\/+$/,''); for(const config of configList) pairs.push({api:apiUrl,config:config.url,protocol}); }
    return pairs.length ? pairs : [{api:runtime.effectiveSubConverter,config:runtime.effectiveSubConfig,protocol:runtime.effectiveSubProtocol}];
}

async function handlePublicGenerate(request, env, requestUrl) {
    if (!env.KV) return jsonResponse({ok:false,error:'未绑定 KV'},500);
    try {
        const data=await request.json(); const sources=cleanSourceList(data.sources||data.url||'');
        if(!sources.length) return jsonResponse({ok:false,error:'请输入至少一个订阅链接'},400);
        if(sources.length>100) return jsonResponse({ok:false,error:'订阅链接最多 100 条'},400);
        const cfg=await getConfig(env); const apis=normalizeProviderList(cfg.subApis).filter(x=>x.enabled), configs=normalizeProviderList(cfg.subConfigs).filter(x=>x.enabled);
        const apiIds=Array.isArray(data.subApiIds)?[...new Set(data.subApiIds.map(String))].filter(id=>apis.some(x=>x.id===id)):[];
        const configIds=Array.isArray(data.subConfigIds)?[...new Set(data.subConfigIds.map(String))].filter(id=>configs.some(x=>x.id===id)):[];
        if(apis.length&&!apiIds.length)return jsonResponse({ok:false,error:'请选择至少一个 SUBAPI'},400);
        if(configs.length&&!configIds.length)return jsonResponse({ok:false,error:'请选择至少一个 SUBCONFIG'},400);
        const token=await makeRandomToken(env,8); const name=normalizeName(data.name||`SUB-UI ${token}`);
        const target=['auto','clash','singbox','surge','quanx','loon','mixed'].includes(String(data.target))?String(data.target):'auto';
        const item={url:token,name,sources,subs:[],subApiIds:apiIds,subConfigIds:configIds,target,shortLinkId:String(data.shortLinkId||''),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),type:'sub-ui'};
        await env.KV.put(`${URL_PREFIX}${token}`,JSON.stringify(item));
        const subscriptionUrl=`${requestUrl.origin}/${encodeURIComponent(token)}`; let shortUrl='';
        const provider=normalizeProviderList(cfg.shortLinks).find(x=>x.id===item.shortLinkId&&x.enabled);
        if(provider){ shortUrl=await createShortUrl(provider,subscriptionUrl); if(shortUrl){item.shortUrl=shortUrl;await env.KV.put(`${URL_PREFIX}${token}`,JSON.stringify(item));} }
        return jsonResponse({ok:true,url:item,subscription_url:subscriptionUrl,short_url:shortUrl||subscriptionUrl});
    }catch(e){return jsonResponse({ok:false,error:e?.message||String(e)},500)}
}

async function createShortUrl(provider,longUrl){
    const type=provider.providerType||'json-root';
    if(type==='json-root'){const res=await fetch(provider.url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({url:longUrl})});if(!res.ok)throw new Error(`短链服务返回 HTTP ${res.status}`);const data=await res.json();if(!data.short_url)throw new Error('短链服务未返回 short_url');return new URL(data.short_url,provider.url).toString();}
    if(type==='v1mk'){const form=new FormData();form.append('longUrl',btoa(longUrl));const res=await fetch(provider.url,{method:'POST',body:form});if(!res.ok)throw new Error(`短链服务返回 HTTP ${res.status}`);const data=await res.json();return String(data.short_url||data.url||data.shortUrl||'').trim();}
    throw new Error('不支持的短链服务类型');
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
    const base = `https://${url.hostname}/${token}`;
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
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>订阅链接</title><style>${getSubUIStyles()}</style></head><body><main class="wrap"><section class="card center"><div class="logo">SUB-UI</div><h1>订阅链接</h1><p>${escapeHTML(guestName || '订阅转换')}</p><div class="result-url"><a href="${escapeHTML(url.pathname)}">${escapeHTML(url.origin + url.pathname)}</a></div><div class="grid"><a class="btn" href="${escapeHTML(url.pathname + '?clash')}">Clash</a><a class="btn" href="${escapeHTML(url.pathname + '?singbox')}">Sing-box</a><a class="btn" href="${escapeHTML(url.pathname + '?surge')}">Surge</a><a class="btn" href="${escapeHTML(url.pathname + '?quanx')}">Quantumult X</a></div></section></main></body></html>`;
}

async function renderSubUIHome(url, env) {
    const cfg=await getConfig(env), apis=normalizeProviderList(cfg.subApis).filter(x=>x.enabled), configs=normalizeProviderList(cfg.subConfigs).filter(x=>x.enabled), shorts=normalizeProviderList(cfg.shortLinks).filter(x=>x.enabled);
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>订阅转换 · SUB-UI</title><style>${getSubUIStyles()}</style></head><body><main class="wrap"><header><div><div class="brand">SUB WEB <span>/</span> NEXT</div><h1>订阅转换</h1><p>使用自己的 SUBAPI、SUBCONFIG 与短链服务生成持久订阅链接。</p></div><a class="admin" href="/${escapeHTML(normalizeAdminPath(cfg.adminPath)||DEFAULT_ADMIN_PATH)}">管理后台</a></header><section class="card"><label>订阅链接</label><textarea id="sources" placeholder="每行一个订阅链接"></textarea><div class="row"><div><label>生成类型</label><select id="target"><option value="auto">自动</option><option value="clash">Clash</option><option value="singbox">Sing-box</option><option value="surge">Surge</option><option value="quanx">Quantumult X</option><option value="loon">Loon</option><option value="mixed">Mixed</option></select></div><div><label>链接名称</label><input id="name" placeholder="可选"></div></div></section><section class="card"><h2>SUBAPI</h2><p class="muted">可多选，按选择顺序尝试后端。</p><div class="checks">${apis.length?apis.map(x=>`<label class="check"><input type="checkbox" value="${escapeHTML(x.id)}" checked><span>${escapeHTML(x.name)}</span><small>${escapeHTML(x.url)}</small></label>`).join(''):'<div class="empty">暂无可用 SUBAPI，请在管理后台添加。</div>'}</div></section><section class="card"><h2>SUBCONFIG</h2><p class="muted">可多选，按顺序组成后端组合。</p><div class="checks">${configs.length?configs.map(x=>`<label class="check"><input type="checkbox" value="${escapeHTML(x.id)}" checked><span>${escapeHTML(x.name)}</span><small>${escapeHTML(x.url)}</small></label>`).join(''):'<div class="empty">暂无可用 SUBCONFIG，请在管理后台添加。</div>'}</div></section><section class="card"><h2>短链选择</h2><div class="checks">${shorts.length?shorts.map((x,i)=>`<label class="check"><input type="radio" name="short" value="${escapeHTML(x.id)}" ${i===0?'checked':''}><span>${escapeHTML(x.name)}</span><small>${escapeHTML(x.url)}</small></label>`).join(''):'<div class="empty">暂无短链服务，将直接使用订阅链接。</div>'}</div></section><button class="primary" id="generate" onclick="generate()">生成订阅链接</button><section id="result" class="card result-card" hidden><h2>订阅链接</h2><div class="result-url" id="short"></div><div class="result-url secondary" id="direct"></div><button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('short').textContent)">复制订阅链接</button></section></main><script>async function generate(){const b=document.getElementById('generate'),sources=document.getElementById('sources').value,subApiIds=[...document.querySelectorAll('.checks input[type=checkbox]:checked')].filter(x=>x.closest('section')?.querySelector('h2')?.textContent==='SUBAPI').map(x=>x.value),subConfigIds=[...document.querySelectorAll('.checks input[type=checkbox]:checked')].filter(x=>x.closest('section')?.querySelector('h2')?.textContent==='SUBCONFIG').map(x=>x.value),short=document.querySelector('input[name=short]:checked');if(!sources.trim())return alert('请输入订阅链接');b.disabled=true;b.textContent='生成中…';try{const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sources,target:document.getElementById('target').value,name:document.getElementById('name').value,subApiIds,subConfigIds,shortLinkId:short?.value||''})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'生成失败');document.getElementById('short').textContent=d.short_url;document.getElementById('direct').textContent=d.subscription_url;document.getElementById('result').hidden=false}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent='生成订阅链接'}};</script></body></html>`;
}

function getSubUIStyles(){return `*{box-sizing:border-box}body{margin:0;background:#f5f7fa;color:#202124;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}a{text-decoration:none;color:inherit}.wrap{max-width:860px;margin:auto;padding:32px 16px}header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px}.brand{font-size:12px;font-weight:800;letter-spacing:.12em;color:#777}.brand span{color:#3b82f6}h1{margin:6px 0;font-size:32px}h2{margin:0 0 12px;font-size:18px}p{color:#666}.admin{padding:9px 14px;border:1px solid #ddd;border-radius:10px;background:#fff}.card{background:rgba(255,255,255,.86);border:1px solid #e4e4e0;border-radius:20px;padding:22px;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,.04)}.center{text-align:center}.logo{font-weight:800;letter-spacing:.12em;color:#3b82f6}label{display:block;font-weight:650;margin:0 0 7px}textarea,input,select{width:100%;border:1px solid #d5d7dc;border-radius:11px;background:#fff;padding:12px 13px;font:inherit}textarea{min-height:150px;resize:vertical}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:15px}.checks{display:grid;gap:10px}.check{display:grid;grid-template-columns:20px 1fr;grid-template-rows:auto auto;column-gap:9px;padding:12px;border:1px solid #e3e4e8;border-radius:12px;background:#fff}.check input{width:auto;grid-row:1/3}.check span{font-weight:650}.check small{grid-column:2;color:#777;word-break:break-all}.primary,.btn{border:0;border-radius:11px;padding:12px 18px;background:#2f3338;color:#fff;font-weight:700;cursor:pointer}.primary{width:100%;font-size:16px}.btn{display:inline-block}.muted,.empty{color:#777}.result-card{border-color:#b8dfc0}.result-url{padding:12px;background:#f2fbf3;border-radius:10px;word-break:break-all;margin-bottom:10px;color:#19733a}.secondary{color:#555;background:#f8f8f8}@media(max-width:640px){.row{grid-template-columns:1fr}header{flex-direction:column}}@media(prefers-color-scheme:dark){body{background:#111;color:#eee}.card,.admin,.check,input,textarea,select{background:#1b1b1d;border-color:#333;color:#eee}p,.muted,.empty{color:#aaa}.result-url{background:#15251a;color:#9be0aa}}`}

function renderLoginPage(url, error = '') {return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUB-UI 管理后台</title><style>${getSubUIStyles()}</style></head><body><main class="wrap"><section class="card" style="max-width:420px;margin:80px auto"><h1>管理后台</h1>${error?`<p>${escapeHTML(error)}</p>`:''}<form method="post"><input type="hidden" name="login" value="1"><label>账号</label><input name="user" required><label style="margin-top:12px">密码</label><input name="pass" type="password" required><button class="primary" style="margin-top:16px">登录</button></form></section></main></body></html>`}

function renderAdminPage(url, env, subs, tokens, settings, status) {
    const origin=url.origin, apis=normalizeProviderList(settings.subApis), configs=normalizeProviderList(settings.subConfigs), shorts=normalizeProviderList(settings.shortLinks), esc=x=>escapeHTML(String(x??''));
    const rows=(arr,type)=>arr.map(x=>`<tr><td>${esc(x.name)}</td><td class="url">${esc(x.url)}</td><td>${x.enabled!==false?'启用':'禁用'}</td><td><button onclick="editItem('${type}','${esc(x.id)}')">编辑</button> <button onclick="deleteItem('${type}','${esc(x.id)}')">删除</button></td></tr>`).join('');
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUB-UI 管理后台</title><style>${getSubUIStyles()}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.url{word-break:break-all}</style></head><body><main class="wrap"><header><div><div class="brand">SUB WEB / NEXT</div><h1>SUB-UI 管理后台</h1><p>配置 SUBAPI、SUBCONFIG、短链服务，以及原有 SUB / 订阅链接。</p></div><a class="admin" href="/">返回首页</a></header><section class="card"><h2>SUBAPI</h2><button onclick="addItem('subapi')">＋ 添加</button><table><thead><tr><th>备注</th><th>URL</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows(apis,'subapi')||'<tr><td colspan="4">暂无</td></tr>'}</tbody></table></section><section class="card"><h2>SUBCONFIG</h2><button onclick="addItem('subconfig')">＋ 添加</button><table><thead><tr><th>备注</th><th>URL</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows(configs,'subconfig')||'<tr><td colspan="4">暂无</td></tr>'}</tbody></table></section><section class="card"><h2>短链服务</h2><button onclick="addItem('shortlink')">＋ 添加</button><table><thead><tr><th>备注</th><th>API URL</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows(shorts,'shortlink')||'<tr><td colspan="4">暂无</td></tr>'}</tbody></table></section><section class="card"><h2>原有 SUB</h2><button onclick="addSub()">＋ 添加 SUB</button>${subs.map(s=>`<div class="check"><span>${esc(s.name)} · ${s.enabled===false?'禁用':'启用'}</span><small>${esc((s.sources||[]).join('\n'))}</small></div>`).join('')||'<div class="empty">暂无</div>'}</section><section class="card"><h2>已有订阅链接</h2>${tokens.map(t=>`<div class="check"><span>${esc(t.name)}</span><small>${esc(origin+'/'+t.url)}</small></div>`).join('')||'<div class="empty">暂无</div>'}</section><section class="card"><h2>基础设置</h2><label>SUBNAME</label><input id="subName" value="${esc(settings.subName)}"><label>管理员路径</label><input id="adminPath" value="${esc(settings.adminPath||'admin')}"><button class="primary" style="margin-top:12px" onclick="saveBase()">保存</button></section></main><script>const DATA=${JSON.stringify({apis,configs,shorts})};async function post(o){const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});const t=await r.text();if(!r.ok)throw new Error(t);return JSON.parse(t)}async function addItem(type){const name=prompt('备注');if(!name)return;const url=prompt('URL');if(!url)return;let o={type:type+'_create',name,url,enabled:true};if(type==='shortlink')o.providerType=prompt('类型：json-root 或 v1mk','json-root')||'json-root';try{await post(o);location.reload()}catch(e){alert(e.message)}}async function editItem(type,id){const key=type==='subapi'?'apis':type==='subconfig'?'configs':'shorts',old=DATA[key].find(x=>x.id===id);const name=prompt('备注',old?.name||'');if(name===null)return;const url=prompt('URL',old?.url||'');if(url===null)return;let o={type:type+'_update',id,name,url,enabled:confirm('启用该项目？')};if(type==='shortlink')o.providerType=prompt('类型：json-root 或 v1mk',old?.providerType||'json-root')||'json-root';try{await post(o);location.reload()}catch(e){alert(e.message)}}async function deleteItem(type,id){if(!confirm('确定删除？'))return;try{await post({type:type+'_delete',id});location.reload()}catch(e){alert(e.message)}}async function saveBase(){try{await post({type:'config',settings:{subName:document.getElementById('subName').value,adminPath:document.getElementById('adminPath').value,subApis:DATA.apis,subConfigs:DATA.configs,shortLinks:DATA.shorts}});location.reload()}catch(e){alert(e.message)}}async function addSub(){const name=prompt('SUB 名称');if(!name)return;const sources=prompt('来源地址，每行一个');if(!sources)return;try{await post({type:'sub_create',name,sources,enabled:true});location.reload()}catch(e){alert(e.message)}}</script></body></html>`;
}
