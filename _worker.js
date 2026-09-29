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
let FileName = 'SUB';
let SiteLogo = '';
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

const CF_SUBS_CLIENT_SCRIPT = String.raw`
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function toast(message){
 var el=$('adminToast');
 if(!el){el=document.createElement('div');el.id='adminToast';el.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;padding:12px 18px;border-radius:12px;background:rgba(20,22,25,.92);color:#fff;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.25);pointer-events:none;';document.body.appendChild(el)}
 el.textContent=message;el.style.display='block';clearTimeout(window.__cfToastTimer);window.__cfToastTimer=setTimeout(function(){el.style.display='none'},1400)
}

/* ---------- public homepage ---------- */
var PUBLIC_STATE={apiId:'',configId:'',apiCustom:false,configCustom:false,apiUrl:'',configUrl:''};
function currentValue(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(!picker)return '';
 if(picker.value==='__custom')return api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;
 return String(picker.value||'');
}
function currentId(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(!picker)return '';
 var o=picker.options[picker.selectedIndex];return o&&o.dataset?String(o.dataset.id||''):'';
}
function updateCurrent(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker'),current=$(api?'apiCurrent':'configCurrent'),edit=$(api?'editApiCustom':'editConfigCustom');
 if(!picker||!current)return;
 var custom=picker.value==='__custom',value=currentValue(kind);current.value=value;
 if(edit){edit.style.display=custom?'inline-flex':'none';edit.hidden=!custom}
 if(!api){current.style.height='auto';current.style.height=Math.max(70,Math.min(260,current.scrollHeight))+'px'}
}
function setStatus(id,html){var el=$(id);if(el)el.innerHTML=html}
function statusText(kind,info,ok){
 if(ok){if(kind==='api'){var version=String((info&&info.version)||'').trim();return '✅ SUBAPI状态正常'+(version?' ('+esc(version)+')':'')}return '✅ SUBCONFIG状态正常'}
 return kind==='api'?'❌ SUBAPI状态异常':'❌ SUBCONFIG状态异常'
}
function checkStatus(kind){
 var api=kind==='api',value=currentValue(kind),id=api?'apiStatus':'configStatus';
 if(!value){setStatus(id,'<div class="status-item bad">'+statusText(kind,null,false)+'</div>');return}
 setStatus(id,'<div class="status-item wait">⏳ 状态检测中</div>');
 var query=api?'/api/status?api='+encodeURIComponent(value):'/api/status?config='+encodeURIComponent(value),timer=null;
 fetch(query,{cache:'no-store',headers:{Accept:'application/json'}}).then(function(r){return r.json().then(function(d){return {r:r,d:d}})}).then(function(x){var info=api?x.d.api:x.d.config,ok=Boolean(x.r.ok&&x.d.ok&&info&&info.ok);setStatus(id,'<div class="status-item '+(ok?'ok':'bad')+'">'+statusText(kind,info,ok)+'</div>')}).catch(function(){setStatus(id,'<div class="status-item bad">'+(api?'❌ SUBAPI检测失败':'❌ SUBCONFIG检测失败')+'</div>')});
}
function onPickerChange(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');if(!picker)return;
 if(picker.value==='__custom'){var input=$(api?'customApiInput':'customConfigInput');if(input)input.value=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;var modal=$(api?'customApiModal':'customConfigModal');if(modal)modal.style.display='flex';if(input)setTimeout(function(){input.focus()},0);updateCurrent(kind);return}
 if(api){PUBLIC_STATE.apiId=currentId('api');PUBLIC_STATE.apiCustom=false;PUBLIC_STATE.apiUrl=''}else{PUBLIC_STATE.configId=currentId('config');PUBLIC_STATE.configCustom=false;PUBLIC_STATE.configUrl=''}
 updateCurrent(kind);checkStatus(kind)
}
function openCustom(kind){var api=kind==='api',input=$(api?'customApiInput':'customConfigInput'),modal=$(api?'customApiModal':'customConfigModal');if(input)input.value=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;if(modal)modal.style.display='flex';if(input)setTimeout(function(){input.focus()},0)}
function cancelCustom(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(api){PUBLIC_STATE.apiCustom=false;PUBLIC_STATE.apiUrl=''}else{PUBLIC_STATE.configCustom=false;PUBLIC_STATE.configUrl=''}
 var defaultId=picker&&picker.dataset?picker.dataset.defaultId:'';var option=null;if(picker){for(var i=0;i<picker.options.length;i++){if(String(picker.options[i].dataset.id||'')===String(defaultId)){option=picker.options[i];break}}if(!option&&picker.options.length)option=picker.options[0];}
 if(option){picker.value=option.value;if(api)PUBLIC_STATE.apiId=String(option.dataset.id||'');else PUBLIC_STATE.configId=String(option.dataset.id||'')}
 var modal=$(api?'customApiModal':'customConfigModal');if(modal)modal.style.display='none';updateCurrent(kind);checkStatus(kind)
}
function saveCustom(kind){
 var api=kind==='api',input=$(api?'customApiInput':'customConfigInput'),value=input?input.value.trim():'';if(!/^https?:\/\//i.test(value)){alert('URL 必须以 http:// 或 https:// 开头');return}
 if(api){PUBLIC_STATE.apiUrl=value;PUBLIC_STATE.apiCustom=true;PUBLIC_STATE.apiId='';$('apiPicker').value='__custom'}else{PUBLIC_STATE.configUrl=value;PUBLIC_STATE.configCustom=true;PUBLIC_STATE.configId='';$('configPicker').value='__custom'}
 var modal=$(api?'customApiModal':'customConfigModal');if(modal)modal.style.display='none';updateCurrent(kind);checkStatus(kind)
}
function initPublic(){
 if(window.__CF_SUBS_PUBLIC_READY)return;window.__CF_SUBS_PUBLIC_READY=true;
 var ap=$('apiPicker'),cp=$('configPicker');
 if(ap){PUBLIC_STATE.apiId=currentId('api');ap.addEventListener('change',function(){onPickerChange('api')})}
 if(cp){PUBLIC_STATE.configId=currentId('config');cp.addEventListener('change',function(){onPickerChange('config')})}
 var e=$('editApiCustom');if(e)e.addEventListener('click',function(){openCustom('api')});e=$('editConfigCustom');if(e)e.addEventListener('click',function(){openCustom('config')});
 e=$('cancelApiCustom');if(e)e.addEventListener('click',function(){cancelCustom('api')});e=$('cancelConfigCustom');if(e)e.addEventListener('click',function(){cancelCustom('config')});
 e=$('saveApiCustom');if(e)e.addEventListener('click',function(){saveCustom('api')});e=$('saveConfigCustom');if(e)e.addEventListener('click',function(){saveCustom('config')});
 updateCurrent('api');updateCurrent('config');checkStatus('api');checkStatus('config');
 e=$('copyDirect');if(e)e.addEventListener('click',function(){var v=$('direct')?$('direct').textContent.trim():'';navigator.clipboard.writeText(v).then(function(){alert('已复制')}).catch(function(){alert('复制失败，请手动复制')})});
 e=$('generate');if(e)e.addEventListener('click',function(){
  var sources=$('sources')?$('sources').value.trim():'',a=$('apiPicker'),c=$('configPicker');if(!a||!c)return;
  var apiCustom=a.value==='__custom',configCustom=c.value==='__custom',apiValue=currentValue('api'),configValue=currentValue('config');
  if(!sources)return alert('请输入订阅链接');if(!apiValue)return alert('请选择订阅转换后端');if(!configValue)return alert('请选择订阅转换规则');
  var body={sources:sources,apiIds:apiCustom?[]:[currentId('api')],apiCustom:apiCustom,apiUrl:apiCustom?apiValue:'',configIds:configCustom?[]:[currentId('config')],configCustom:configCustom,configUrl:configCustom?configValue:'',noAds:($('noAds')?$('noAds').value:'').trim()};
  var button=$('generate');button.disabled=true;button.textContent='生成中…';
  fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return {r:r,d:d}})}).then(function(x){if(!x.r.ok||!x.d.ok)throw new Error(x.d.error||'生成失败');$('direct').textContent=x.d.subscription_url;$('openDirect').href=x.d.subscription_url;$('result').hidden=false;$('result').scrollIntoView({behavior:'smooth',block:'start'})}).catch(function(err){alert(err.message||'生成失败')}).finally(function(){button.disabled=false;button.textContent='生成聚合订阅'})
 })
}

/* ---------- admin ---------- */
var modalState=null;
function openModal(id){var el=$(id);if(el)el.style.display='flex'}
function closeModal(id){var el=$(id);if(el)el.style.display='none'}
function showProvider(type,id,name,url){modalState={type:type,id:id||''};var t=$('modalTitle');if(t)t.textContent=(id?'编辑 ':'添加 ')+(type==='subapi'?'订阅转换后端':'订阅转换规则');if($('modalName'))$('modalName').value=name||'';if($('modalUrl'))$('modalUrl').value=url||'';openModal('providerModal')}
function hideProvider(){closeModal('providerModal');modalState=null}
function post(data){return fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(data)}).then(function(r){return r.text().then(function(t){var d=null;try{d=t?JSON.parse(t):null}catch(e){}if(!d)throw new Error('服务器返回无效数据（HTTP '+r.status+'）');if(!r.ok||d.ok===false)throw new Error(d.error||('操作失败（HTTP '+r.status+'）'));return d})})}
function setDefaultProvider(type,id){post({type:type+'_default',id:id}).then(function(){toast('默认配置已更新')}).catch(function(e){alert(e.message||'设置默认配置失败');setTimeout(function(){location.reload()},100)})}
function deleteProvider(type,id){if(!confirm('确定删除这个项目？'))return;post({type:type+'_delete',id:id}).then(function(){toast('已删除');setTimeout(function(){location.reload()},500)}).catch(function(e){alert(e.message||'删除失败')})}
function saveProvider(){if(!modalState)return;var name=$('modalName')?$('modalName').value.trim():'',url=$('modalUrl')?$('modalUrl').value.trim():'';if(!name)return alert('请输入备注');if(!/^https?:\/\//i.test(url))return alert('URL 必须以 http:// 或 https:// 开头');var b=$('modalSave'),editing=Boolean(modalState.id);if(b){b.disabled=true;b.textContent='保存中...'}post({type:modalState.type+'_'+(editing?'update':'create'),id:modalState.id,name:name,url:url}).then(function(){hideProvider();toast(editing?'已保存':'已添加');setTimeout(function(){location.reload()},700)}).catch(function(e){alert(e.message||'保存失败')}).finally(function(){if(b){b.disabled=false;b.textContent='保存'}})}
function saveSecurity(){var user=$('securityUser')?$('securityUser').value.trim():'',pass=$('securityPass')?$('securityPass').value:'',pass2=$('securityPass2')?$('securityPass2').value:'';if(!user)return alert('管理员账号不能为空');if(pass!==pass2)return alert('两次输入的密码不一致');var b=$('saveSecurity');if(b){b.disabled=true;b.textContent='保存中...'}post({type:'security',user:user,pass:pass}).then(function(){closeModal('securityModal');toast('安全设置已保存');setTimeout(function(){location.reload()},700)}).catch(function(e){alert(e.message||'保存失败')}).finally(function(){if(b){b.disabled=false;b.textContent='保存'}})}
function saveSiteSettings(){var name=$('siteName')?$('siteName').value.trim()||'SUB':'SUB',path=$('sitePath')?$('sitePath').value.trim():'',logo=$('siteLogo')?$('siteLogo').value.trim():'';if(!/^[A-Za-z0-9_-]{2,60}$/.test(path))return alert('管理员路径只能使用 2-60 个字母、数字、下划线或短横线');if(logo&&!/^https?:\/\//i.test(logo))return alert('站点标签栏 Logo 必须是 http:// 或 https:// URL');var b=$('saveSite');if(b){b.disabled=true;b.textContent='保存中...'}post({type:'site_settings',subName:name,adminPath:path,siteLogo:logo}).then(function(d){closeModal('siteModal');toast('站点设置已保存');setTimeout(function(){location.href='/'+d.adminPath},700)}).catch(function(e){alert(e.message||'保存失败')}).finally(function(){if(b){b.disabled=false;b.textContent='保存'}})}
function initAdmin(){
 if(window.__CF_SUBS_ADMIN_READY)return;window.__CF_SUBS_ADMIN_READY=true;
 document.querySelectorAll('[data-open-modal]').forEach(function(b){b.addEventListener('click',function(){openModal(b.dataset.openModal)})});
 document.querySelectorAll('[data-close-modal]').forEach(function(b){b.addEventListener('click',function(){closeModal(b.dataset.closeModal)})});
 document.querySelectorAll('[data-provider-action]').forEach(function(b){b.addEventListener('click',function(){var action=b.dataset.providerAction,type=b.dataset.providerType||'',id=b.dataset.providerId||'';if(action==='add')showProvider(type,'','','');else if(action==='edit')showProvider(type,id,b.dataset.providerName||'',b.dataset.providerUrl||'');else if(action==='delete')deleteProvider(type,id)})});
 var e=$('providerCancel');if(e)e.addEventListener('click',hideProvider);e=$('modalSave');if(e)e.addEventListener('click',saveProvider);e=$('saveSecurity');if(e)e.addEventListener('click',saveSecurity);e=$('saveSite');if(e)e.addEventListener('click',saveSiteSettings);
 document.querySelectorAll('.default-provider-select').forEach(function(select){select.addEventListener('change',function(){setDefaultProvider(select.dataset.type,select.value)})});
 document.querySelectorAll('.modal-overlay').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m)m.style.display='none'})});
}

/* ---------- guest subscription page ---------- */
function showQrcode(button){var q=document.getElementById('current-qrcode');if(!q||typeof QRCode==='undefined')return;button.closest('.link-item').appendChild(q);q.innerHTML='';q.style.display='block';new QRCode(q,{text:button.dataset.url,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.Q})}
function hideQrcode(button){var q=document.getElementById('current-qrcode');if(q){q.style.display='none';q.innerHTML=''}button.classList.add('hidden');var c=button.closest('.actions').querySelector('.copy-btn');if(c)c.classList.remove('hidden')}
function copySubscription(button){navigator.clipboard.writeText(button.dataset.url).then(function(){toast('已复制到剪贴板');showQrcode(button);button.classList.add('hidden');var h=button.closest('.actions').querySelector('.hide-btn');if(h)h.classList.remove('hidden')}).catch(function(){toast('复制失败，请手动复制')})}
function initGuest(){document.querySelectorAll('.copy-btn').forEach(function(b){b.addEventListener('click',function(){copySubscription(b)})});document.querySelectorAll('.hide-btn').forEach(function(b){b.addEventListener('click',function(){hideQrcode(b)})})}

function boot(){
 if($('apiPicker')||$('generate'))initPublic();
 if(document.querySelector('[data-provider-action]')||$('saveSecurity')||$('saveSite'))initAdmin();
 if(document.querySelector('.copy-btn'))initGuest();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
`;

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
        SiteLogo = '';

        // 读取 KV 配置
        if (env.KV) {
            try {
                const kvConfigStr = await env.KV.get('CONFIG.json');
                if (kvConfigStr) {
                    const kvConfig = JSON.parse(kvConfigStr);

                    FileName = kvConfig.subName || 'SUB';

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
                    SiteLogo = String(kvConfig.siteLogo || '');
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

        // 公共同源客户端脚本：避免内联脚本受 CSP / 模板字符串影响。
        if (url.pathname === '/__cfsubs.js' && request.method === 'GET') {
            return new Response(CF_SUBS_CLIENT_SCRIPT, {
                headers: {
                    'Content-Type': 'application/javascript; charset=UTF-8',
                    'Cache-Control': 'no-store, no-cache, must-revalidate'
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

        // SUBAPI 内部转换入口：允许 fakeToken + sourceToken 访问。
        // 这是订阅转换的中间数据入口，sourceToken 决定实际使用哪一条公开 URL 的配置。
        const isFakeTokenRequest =
            publicToken === fakeToken ||
            url.pathname === '/' + fakeToken;

        let effectiveTokenData = tokenData;
        if (!effectiveTokenData && isFakeTokenRequest && conversionSourceToken) {
            effectiveTokenData = await getToken(env, conversionSourceToken);
        }

        // 只有真实生成的订阅 token 或内部 fakeToken 才是有效入口；其余路径一律回到公开首页。
        if (!tokenData && !isFakeTokenRequest && url.pathname !== '/') {
            return Response.redirect(url.origin + '/', 302);
        }

        // ==================== 公开首页 ====================
        if (!tokenData && !isFakeTokenRequest && url.pathname === '/') {
            const page = await renderSubUIHome(request, url, env);
            const html = page;
            return new Response(html, {
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                    'Cache-Control': 'no-store',
                }
            });
        }

        // ==================== 当前订阅入口的来源 ====================
        let selectedSources = Array.isArray(effectiveTokenData?.sources) && effectiveTokenData.sources.length
            ? cleanSourceList(effectiveTokenData.sources)
            : [];

        // fakeToken 没有 sourceToken 时，兼容原 CF-SUB 行为：使用全部托管来源。
        if (isFakeTokenRequest && !selectedSources.length && !conversionSourceToken) {
            selectedSources = await getAllManagedSources(env);
        }

        // ==================== 浏览器订阅链接页面 ====================
        if (userAgent.includes('mozilla') && !url.search && !isProxyClientUA && tokenData) {
            // 订阅链接页面只读取该 URL 生成时保存的 SUBAPI / SUBCONFIG。
            // 后台之后修改全局配置，也不会改变已经生成的订阅链接。
            const tokenBackends = await getSelectedBackends(env, tokenData, { });
            const primaryBackend = tokenBackends[0] || null;
            let guestStatus = {
                api: { ok: false, url: '', version: '' },
                config: { ok: false, url: '' },
                available: false
            };
            if (primaryBackend) {
                guestStatus = await probeBackend(
                    `${primaryBackend.protocol}://${primaryBackend.api}`,
                    primaryBackend.config
                );
            }
            return new Response(renderGuestPage(url, tokenData.url, tokenData.name, primaryBackend, guestStatus), {
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
                config_noAds: String(effectiveTokenData?.noAds || ''),
                FileName,
                UD,
                expire,
                tokenData: effectiveTokenData
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
                    subName:normalizeName(data.settings?.subName??old.subName)||'SUB',
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
                    fakeCode:String(data.settings?.fakeCode??old.fakeCode??''),
                    siteLogo:String(data.settings?.siteLogo??old.siteLogo??'')
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
                const old=await getConfig(env), subName=normalizeName(data.subName)||'SUB';
                await env.KV.put('CONFIG.json',JSON.stringify({...old,subName}));
                return jsonResponse({ok:true,subName});
            }

            if(data.type==='site_settings'){
                const old=await getConfig(env);
                const subName=normalizeName(data.subName)||'SUB';
                const adminPath=normalizeAdminPath(data.adminPath)||DEFAULT_ADMIN_PATH;
                const siteLogo=String(data.siteLogo||'').trim();
                if(siteLogo && !/^https?:\/\//i.test(siteLogo)) return jsonResponse({ok:false,error:'站点标签栏 Logo 必须是 http:// 或 https:// URL'},400);
                const next={...old,subName,adminPath,siteLogo};
                await env.KV.put('CONFIG.json',JSON.stringify(next));
                return jsonResponse({ok:true,subName,adminPath,siteLogo});
            }

            if(['subapi_create','subapi_update','subapi_delete','subapi_default','subconfig_create','subconfig_update','subconfig_delete','subconfig_default'].includes(data.type)){
                const cfg=await getConfig(env);
                const isApi=data.type.startsWith('subapi_');
                const key=isApi?'subApis':'subConfigs';
                const defaultKey=isApi?'defaultSubApiId':'defaultSubConfigId';
                const list=normalizeProviderList(cfg[key]);
                const action=data.type.split('_')[1];
                const id=String(data.id||'').trim();

                if(action==='default'){
                    if(!list.some(x=>x.id===id)) return jsonResponse({ok:false,error:'项目不存在'},404);
                    cfg[defaultKey]=id;
                    await env.KV.put('CONFIG.json',JSON.stringify(cfg));
                    return jsonResponse({ok:true,items:normalizeProviderList(cfg[key]),defaultId:String(cfg[defaultKey]||'')});
                }

                if(action==='delete'){
                    if(!list.some(x=>x.id===id))return jsonResponse({ok:false,error:'项目不存在'},404);
                    cfg[key]=list.filter(x=>x.id!==id);
                    if(String(cfg[defaultKey]||'')===id) cfg[defaultKey]=cfg[key][0]?.id||'';
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
        subName:'SUB', subApi:'', subConfig:'',
        subApis:[], subConfigs:[],
        defaultSubApiId:'', defaultSubConfigId:'',
        noAds:'', user:'', pass:'', adminPath:DEFAULT_ADMIN_PATH, siteLogo:'',
        fakeMode:'', fakeUrl:'', fakeUrl302:'', fakeCode:''
    };
    if(!env.KV) return defaults;
    try {
        const raw=await env.KV.get('CONFIG.json');
        if(!raw) return defaults;
        const parsed={...defaults,...JSON.parse(raw)};
        if(parsed.subName==='CF-SUBS') parsed.subName='SUB';
        return parsed;
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
    // 新生成的公开 URL：优先、并且固定使用 KV 中保存的实际后端。
    if (tokenData?.type === 'sub-ui') {
        if (Array.isArray(tokenData.backends) && tokenData.backends.length) {
            return tokenData.backends.map(x=>({
                api:String(x.api||'').replace(/^https?:\/\//i,'').replace(/\/+$/,''),
                config:String(x.config||'').trim(),
                protocol:x.protocol==='http'?'http':'https'
            })).filter(x=>x.api&&x.config);
        }
        if (tokenData.backend?.api && tokenData.backend?.config) {
            const x=tokenData.backend;
            return [{
                api:String(x.api).replace(/^https?:\/\//i,'').replace(/\/+$/,''),
                config:String(x.config).trim(),
                protocol:x.protocol==='http'?'http':'https'
            }];
        }
        if (tokenData.subApi && tokenData.subConfig) {
            const raw=String(tokenData.subApi).trim();
            return [{
                api:raw.replace(/^https?:\/\//i,'').replace(/\/+$/,''),
                config:String(tokenData.subConfig).trim(),
                protocol:/^http:\/\//i.test(raw)?'http':'https'
            }];
        }
        return [];
    }

    // 旧数据兼容：旧 token 没有固定后端时，才从当前 CONFIG.json 解析。
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
        // 每个公开 URL 都把本次生成时实际使用的 SUBAPI / SUBCONFIG 固化进自己的 KV JSON。
        // 以后访问 /token、/token?clash、/token?sb 等入口时，只读取这里保存的值。
        const primaryBackend=backends[0];
        const item={
            url:token,
            path:`/${token}`,
            subscriptionUrl:`${requestUrl.origin}/${encodeURIComponent(token)}`,
            name,
            sources,
            subApiIds:selectedApis.map(x=>x.id),
            subConfigIds:selectedConfigs.map(x=>x.id),
            subApi:apiEntries[0]?.url||'',
            subApiName:apiEntries[0]?.name||'',
            subConfig:configEntries[0]?.url||'',
            subConfigName:configEntries[0]?.name||'',
            backend:primaryBackend,
            backends,
            noAds,
            target:'auto',
            createdAt:new Date().toISOString(),
            updatedAt:new Date().toISOString(),
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
        // 非 Base64 请求绝不能静默返回 Base64，否则客户端会把“转换失败”误认为成功订阅。
        // 这里明确返回 502，便于直接定位 SUBAPI / SUBCONFIG / 转换入口的问题。
        return new Response(
            `订阅转换失败：${error?.message || 'SUBAPI/SUBCONFIG 不可用'}`,
            {
                status: 502,
                headers: {
                    ...responseHeaders,
                    'content-type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            }
        );
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
<title>${escapeHTML(FileName)}管理面板</title>${SiteLogo?`<link rel="icon" href="${escapeHTML(SiteLogo)}">`:''}
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

function getSubscriptionLinks(url, token) {
    const base = `${url.origin}/${token}`;
    return [
        ['自适应订阅地址', base],
        ['Base64订阅地址', `${base}?b64`],
        ['Clash订阅地址', `${base}?clash`],
        ['Sing-box订阅地址', `${base}?sb`],
        ['Surge订阅地址', `${base}?surge`],
        ['Loon订阅地址', `${base}?loon`],
    ];
}

function renderGuestPage(url, guest, guestName = '', backend = null, status = null) {
    const links = getSubscriptionLinks(url, guest);
    const apiUrl = backend ? `${backend.protocol}://${backend.api}` : '';
    const configUrl = backend?.config || '';
    const apiOk = Boolean(status?.api?.ok);
    const configOk = Boolean(status?.config?.ok);
    const apiVersion = String(status?.api?.version || '').trim();
    const apiStatus = apiOk
        ? `✅SUBAPI状态正常${apiVersion ? ` (${escapeHTML(apiVersion)})` : ''}`
        : '❌SUBAPI状态异常';
    const configStatus = configOk
        ? '✅SUBCONFIG状态正常'
        : '❌SUBCONFIG状态异常';
    const apiCss = apiOk ? 'status-ok' : 'status-error';
    const configCss = configOk ? 'status-ok' : 'status-error';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<title>${escapeHTML(guestName || FileName)}访客订阅</title>${SiteLogo?`<link rel="icon" href="${escapeHTML(SiteLogo)}">`:''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${getToolStyles()}
.guest-link-list{display:grid;gap:10px}
.guest-link-item{padding:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:12px}
.guest-link-label{font-weight:700;margin-bottom:8px}
.guest-link-url{display:block;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(0,0,0,.28);color:#64b5f6;text-decoration:none;word-break:break-all;overflow-wrap:anywhere}
.guest-link-url:hover{background:rgba(100,181,246,.08);border-color:#64b5f6}
.guest-actions{display:flex;gap:8px;margin-top:9px;align-items:center}
.guest-actions button{min-width:56px}
.guest-hide{display:none}
.guest-status{margin-top:10px;padding:10px 12px;border-radius:10px;font-weight:700;word-break:break-all}
.guest-status.status-ok{background:rgba(129,199,132,.1);color:#81c784;border:1px solid rgba(129,199,132,.2)}
.guest-status.status-error{background:rgba(229,115,115,.1);color:#e57373;border:1px solid rgba(229,115,115,.2)}
.guest-current-label{margin-top:12px;margin-bottom:6px;color:#aaa;font-size:13px;font-weight:600}
.guest-current{display:block;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(0,0,0,.28);color:#64b5f6;word-break:break-all;overflow-wrap:anywhere}
#current-qrcode{display:none;background:#fff;border-radius:10px;padding:12px;margin-top:10px;width:max-content;max-width:100%;box-sizing:border-box}
@media(prefers-color-scheme:light){.guest-link-item{background:rgba(255,255,255,.5);border-color:rgba(229,229,223,.7)}.guest-link-url,.guest-current{background:rgba(250,250,250,.7);border-color:rgba(229,229,223,.8);color:#1f4b99}.guest-current-label{color:#666}.guest-status.status-ok{color:#2e7d32;background:rgba(76,175,80,.08)}.guest-status.status-error{color:#c62828;background:rgba(244,67,54,.08)}}
</style>
<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
</head>
<body>
<div id="copyNotice" class="toast"></div>
<main class="page">
<header class="header">
<h1 class="title">${escapeHTML(guestName || FileName)} 访客订阅</h1>
<div class="subtitle">复制订阅链接或生成二维码</div>
</header>
<section class="panel">
<h2 class="section-title">订阅链接</h2>
<div class="guest-link-list">
${links.map(([label,value])=>`<div class="guest-link-item">
<div class="guest-link-label">${escapeHTML(label)}</div>
<a class="guest-link-url" href="${escapeHTML(value)}" target="_blank" rel="noopener">${escapeHTML(value)}</a>
<div class="guest-actions">
<button type="button" class="copy-btn" data-url="${escapeHTML(value)}" onclick="copyGuest(this)">复制</button>
<button type="button" class="guest-hide" onclick="hideGuestQr(this)">隐藏二维码</button>
</div>
</div>`).join('')}
</div>
<div id="current-qrcode"></div>
</section>
<section class="panel">
<h2 class="section-title">订阅转换服务</h2>
<div class="guest-link-list">
<div class="guest-link-item">
<div class="guest-link-label">订阅转换后端 SUBAPI</div>
<div class="guest-status ${apiCss}">${apiStatus}</div>
<div class="guest-current-label">当前配置</div>
<div class="guest-current">${escapeHTML(apiUrl)}</div>
</div>
<div class="guest-link-item">
<div class="guest-link-label">订阅转换规则 SUBCONFIG</div>
<div class="guest-status ${configCss}">${configStatus}</div>
<div class="guest-current-label">当前配置</div>
<div class="guest-current">${escapeHTML(configUrl)}</div>
</div>
</div>
</section>
</main>
<script>
let guestToastTimer;
function guestToast(message){
 const el=document.getElementById('copyNotice');
 el.textContent=message;el.style.display='block';
 clearTimeout(guestToastTimer);guestToastTimer=setTimeout(()=>el.style.display='none',1500);
}
function copyGuest(button){
 const value=button.dataset.url||'';
 const done=()=>{guestToast('已复制到剪贴板');showGuestQr(button);button.style.display='none';const hide=button.parentElement.querySelector('.guest-hide');if(hide)hide.style.display='inline-flex';};
 if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done).catch(()=>guestToast('复制失败，请手动复制'));
 else {const ta=document.createElement('textarea');ta.value=value;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){guestToast('复制失败，请手动复制')}ta.remove();}
}
function showGuestQr(button){
 const qr=document.getElementById('current-qrcode');
 qr.innerHTML='';qr.style.display='block';
 if(window.QRCode)new QRCode(qr,{text:button.dataset.url,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.Q});
 button.closest('.guest-link-item').appendChild(qr);
}
function hideGuestQr(button){
 const qr=document.getElementById('current-qrcode');
 qr.style.display='none';qr.innerHTML='';
 const item=button.closest('.guest-link-item');
 const copy=item.querySelector('.copy-btn');if(copy)copy.style.display='inline-flex';button.style.display='none';
}
</script>
</body>
</html>`;
}

async function renderSubUIHome(request,url,env){
    const cfg=await getConfig(env);
    const apis=normalizeProviderList(cfg.subApis).filter(x=>x.enabled);
    const configs=normalizeProviderList(cfg.subConfigs).filter(x=>x.enabled);
    // 主页全部为临时变量：不读取、不写入 Cookie/KV。刷新后始终恢复管理员设置的默认配置，NOADS 默认留空。
    const defaultApiId=String(cfg.defaultSubApiId||'');
    const defaultConfigId=String(cfg.defaultSubConfigId||'');

    let apiId=defaultApiId&&apis.some(x=>x.id===defaultApiId)?defaultApiId:(apis[0]?.id||'');
    let configId=defaultConfigId&&configs.some(x=>x.id===defaultConfigId)?defaultConfigId:(configs[0]?.id||'');
    let apiCustom=false;
    let configCustom=false;
    let apiUrl='';
    let configUrl='';

    const selectedApi=apis.find(x=>x.id===apiId);
    const selectedConfig=configs.find(x=>x.id===configId);
    const apiCurrentValue=selectedApi?.url||'';
    const configCurrentValue=selectedConfig?.url||'';
    const noAds='';
    const esc=x=>escapeHTML(String(x??''));

    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.subName||'SUB')}</title>
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
<header class="header"><h1 class="title">${esc(cfg.subName||'SUB')}</h1><div class="subtitle">粘贴你的订阅链接，生成属于你的聚合订阅。</div></header>

<section class="panel"><h2 class="section-title">订阅链接</h2><div class="section-note">支持多个订阅地址，每行一个。</div><div class="field"><textarea id="sources" placeholder="https://example.com/subscribe&#10;https://example.com/another"></textarea></div></section>

<section class="panel">
<h2 class="section-title">订阅转换后端(SUBAPI)</h2><div class="section-note">选择一个订阅转换后端。</div>
<select class="native-picker" id="apiPicker" aria-label="选择订阅转换后端" data-default-id="${esc(apiId)}">
${apis.map(x=>`<option value="${esc(x.url)}" data-id="${esc(x.id)}" ${x.id===apiId?'selected':''}>${esc(x.name)}</option>`).join('')}
<option value="__custom">自定义</option>
</select>
<div class="current-box"><div class="current-title">当前配置</div><div class="current-row"><input id="apiCurrent" class="current-api-input" readonly value="${esc(apiCurrentValue)}" placeholder="请选择订阅转换后端"><button type="button" class="button secondary edit-custom" id="editApiCustom">编辑</button></div></div>
<div class="status-box"><div class="status-title">可用状态</div><div id="apiStatus" class="status-list"><div class="status-item wait">⏳ 状态检测中</div></div></div>
</section>

<section class="panel">
<h2 class="section-title">订阅转换规则(SUBCONFIG)</h2><div class="section-note">选择一个订阅转换规则。</div>
<select class="native-picker" id="configPicker" aria-label="选择订阅转换规则" data-default-id="${esc(configId)}">
${configs.map(x=>`<option value="${esc(x.url)}" data-id="${esc(x.id)}" ${x.id===configId?'selected':''}>${esc(x.name)}</option>`).join('')}
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

<script src="/__cfsubs.js" defer></script>
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
    const defaultApiId=String(settings.defaultSubApiId||'');
    const defaultConfigId=String(settings.defaultSubConfigId||'');
    const rows=(list,type,empty)=>list.length?list.map(x=>{
        return `<div class="link-item provider-item">
        <div class="provider-main">
            <div class="link-label">${esc(x.name)}</div>
            <div class="provider-url link-url">${esc(x.url)}</div>
        </div>
        <div class="actions admin-row-actions">
            <button type="button" class="secondary" data-provider-action="edit" data-provider-type="${esc(type)}" data-provider-id="${esc(x.id)}" data-provider-name="${esc(x.name)}" data-provider-url="${esc(x.url)}">编辑</button>
            <button type="button" class="danger" data-provider-action="delete" data-provider-type="${esc(type)}" data-provider-id="${esc(x.id)}">删除</button>
        </div>
    </div>`;
    }).join(''):`<div class="empty">${empty}</div>`;

    const defaultSelect=(list,type,defaultId)=>{
        const label=type==='subapi'?'SUBAPI':'SUBCONFIG';
        return `<select class="default-provider-select" data-type="${esc(type)}" aria-label="默认${label}">
            ${list.length?list.map(x=>`<option value="${esc(x.id)}" ${x.id===defaultId?'selected':''}>${esc(x.name)}</option>`).join(''): '<option value="">暂无配置</option>'}
        </select>`;
    };

    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(settings.subName||'SUB')} · 管理后台</title>${settings.siteLogo?`<link rel="icon" href="${esc(settings.siteLogo)}">`:''}<style>${getToolStyles()}
.sub-head{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:start;gap:14px}.sub-head .section-title{white-space:nowrap;font-size:16px;line-height:40px;margin:0}.sub-head-actions{display:grid;grid-template-columns:270px 190px;align-items:center;justify-content:end;gap:10px;width:100%}.default-provider-select{width:270px;min-width:270px;height:40px;padding:0 30px 0 12px;border:1px solid rgba(120,120,120,.45);border-radius:9px;background:rgba(255,255,255,.7);color:inherit;font-size:14px;font-weight:600;cursor:pointer;box-sizing:border-box}.default-provider-select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.18);width:max-content;min-width:270px;max-width:calc(100vw - 40px)}.sub-head-actions>button{width:190px;min-width:190px;height:40px;white-space:nowrap;word-break:keep-all;overflow:hidden;text-overflow:clip;font-size:14px}.provider-main{min-width:0;width:100%}.provider-url{display:block;width:100%;margin-bottom:0;word-break:break-all;overflow-wrap:anywhere}.provider-item{position:relative;padding:12px 104px 12px 12px}.admin-row-actions{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:7px;margin-top:0;align-items:stretch}.admin-row-actions button{min-width:68px}.empty{font-size:12px;color:#888}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.topbar-main{min-width:0;flex:1}.site-title-display{font-size:28px;font-weight:700;line-height:1.2;color:#1a1a1a}.site-title-input{font-size:15px!important}.site-title-input:focus{box-shadow:none!important}.top-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.top-actions .button{min-width:86px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px}.modal-content{width:min(460px,100%);background:rgba(255,255,255,.95);border-radius:20px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.5)}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}@media(max-width:760px){.sub-head{grid-template-columns:1fr;gap:8px}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 190px}.default-provider-select{width:100%;min-width:0;font-size:14px}.default-provider-select:focus{width:max-content;min-width:0;max-width:100%}}@media(max-width:600px){.top-actions{width:100%;justify-content:stretch}.top-actions .button{flex:1}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 170px}.default-provider-select{width:100%;min-width:0}.default-provider-select:focus{width:max-content;min-width:0;max-width:100%}.sub-head-actions>button{width:170px;min-width:170px;white-space:nowrap}.provider-item{padding-right:12px}.admin-row-actions{position:absolute;top:12px;right:12px;width:auto;justify-content:flex-start}.admin-row-actions button{flex:none}.modal-content{padding:20px}}@media(prefers-color-scheme:dark){.site-title-display{color:#f5f5f5}.site-title-input{color:#f5f5f5!important}.default-provider-select{background:rgba(30,30,30,.92);border-color:rgba(255,255,255,.18);color:#fff}.modal-content{background:rgba(30,30,30,.96);border-color:rgba(255,255,255,.1)}.empty{color:#aaa}}</style></head><body><main class="page">
<header class="header topbar"><div class="topbar-main"><div class="site-title-display">${esc(settings.subName||'SUB')}</div><div class="subtitle">管理订阅转换后端、订阅转换规则和站点安全设置。</div></div><div class="top-actions"><button type="button" class="button secondary" data-open-modal="securityModal">安全</button><button type="button" class="button secondary" data-open-modal="siteModal">站点</button><a class="button danger" href="/${esc(settings.adminPath||'admin')}/logout">退出</a></div></header>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">订阅转换后端(SUBAPI)</h2></div><div class="sub-head-actions">${defaultSelect(apis,'subapi',defaultApiId)}<button type="button" data-provider-action="add" data-provider-type="subapi">＋ 添加订阅转换后端</button></div></div><div class="sub-grid" style="margin-top:12px">${rows(apis,'subapi','暂无订阅转换后端，请手动添加。')}</div></section>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">订阅转换规则(SUBCONFIG)</h2></div><div class="sub-head-actions">${defaultSelect(configs,'subconfig',defaultConfigId)}<button type="button" data-provider-action="add" data-provider-type="subconfig">＋ 添加订阅转换规则</button></div></div><div class="sub-grid" style="margin-top:12px">${rows(configs,'subconfig','暂无订阅转换规则，请手动添加。')}</div></section>
</main>
<div id="providerModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title" id="modalTitle">添加</h2><div class="field"><label for="modalName">备注</label><input id="modalName"></div><div class="field"><label for="modalUrl">URL</label><input id="modalUrl" placeholder="https://..."></div><div class="modal-actions"><button type="button" class="secondary" id="providerCancel">取消</button><button type="button" id="modalSave">保存</button></div></div></div>
<div id="securityModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">安全</h2><div class="section-note">修改管理员账号和密码。修改密码时必须输入两次；两次留空表示保持原密码。</div><div class="field"><label for="securityUser">管理员账号</label><input id="securityUser" value="${esc(settings.user||'')}" autocomplete="username"></div><div class="field"><label for="securityPass">管理员密码</label><input id="securityPass" type="password" placeholder="留空保持原密码" autocomplete="new-password"></div><div class="field"><label for="securityPass2">确认管理员密码</label><input id="securityPass2" type="password" placeholder="再次输入新密码" autocomplete="new-password"></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="securityModal">取消</button><button type="button" id="saveSecurity">保存</button></div></div></div>
<div id="siteModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">站点</h2><div class="field"><label for="siteName">站点标题</label><input id="siteName" value="${esc(settings.subName||'SUB')}" placeholder="SUB"></div><div class="field"><label for="sitePath">管理员路径</label><input id="sitePath" value="${esc(settings.adminPath||'admin')}" placeholder="admin"></div><div class="field"><label for="siteLogo">站点标签栏 Logo 地址</label><input id="siteLogo" value="${esc(settings.siteLogo||'')}" placeholder="https://example.com/favicon.png" type="url"><div class="section-note">支持 http:// 或 https:// 直链；留空则不设置。</div></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="siteModal">取消</button><button type="button" id="saveSite">保存</button></div></div></div>
<script src="/__cfsubs.js" defer></script></body></html>`;
}
