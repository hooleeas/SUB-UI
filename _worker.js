/**
 * SUB-UI
 * 基于 SUB 核心能力扩展的公开订阅聚合转换前端
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
            console.error('SUB-UI request error:', error);
            return new Response('SUB-UI Worker Error: ' + (error?.message || String(error)), {
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

/* ---------- SUB-UI public homepage ---------- */
var PUBLIC_STATE={apiId:'',configId:'',apiCustom:false,configCustom:false,apiUrl:'',configUrl:''};
var GENERATED_LINKS_KEY='SUB_UI_GENERATED_LINKS_V1';
var CURRENT_DESTROY_KEY='';
function generatedLinks(){
 try{var data=JSON.parse(localStorage.getItem(GENERATED_LINKS_KEY)||'[]');return Array.isArray(data)?data:[]}
 catch(e){return []}
}
function saveGeneratedLinks(list){
 try{localStorage.setItem(GENERATED_LINKS_KEY,JSON.stringify(list))}catch(e){}
}
function tokenFromSubscriptionUrl(value){
 try{var u=new URL(String(value||''),location.origin);var token=decodeURIComponent(String(u.pathname||'').replace(/^\/+|\/+$/g,''));return token||''}
 catch(e){return ''}
}
function rememberGeneratedLink(value){
 var url=String(value||'').trim(),token=tokenFromSubscriptionUrl(url);if(!url||!token)return;
 var list=generatedLinks().filter(function(x){return x&&String(x.token||'')!==token});
 list.unshift({token:token,url:url,createdAt:new Date().toISOString()});
 saveGeneratedLinks(list);renderGeneratedLinks();
}
function forgetGeneratedLink(token){
 token=String(token||'').trim();if(!token)return;
 saveGeneratedLinks(generatedLinks().filter(function(x){return !x||String(x.token||'')!==token}));
 renderGeneratedLinks();
}
function aggregateNotice(message,isError){
 var notice=$('aggregateCopyNotice');if(!notice)return;
 notice.textContent=message;notice.style.display='block';notice.className='toast '+(isError?'error':'');
 window.clearTimeout(window.__aggregateCopyNoticeTimer);
 window.__aggregateCopyNoticeTimer=window.setTimeout(function(){notice.style.display='none';notice.className='toast'},1800);
}
function renderGeneratedLinks(){
 var wrap=$('generatedLinksPanel'),listEl=$('generatedLinksList');if(!wrap||!listEl)return;
 var list=generatedLinks();
 if(!list.length){wrap.style.display='none';listEl.innerHTML='';return}
 wrap.style.display='block';
 listEl.innerHTML=list.map(function(item){
   var token=String(item&&item.token||'').trim(),url=String(item&&item.url||'').trim();
   if(!token||!url)return '';
   return '<div class="generated-link-row" data-token="'+esc(token)+'"><a class="generated-link-url" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" title="打开订阅链接">'+esc(url)+'</a><button type="button" class="button generated-link-destroy" data-destroy-token="'+esc(token)+'">销毁</button></div>';
 }).join('');
 listEl.querySelectorAll('[data-destroy-token]').forEach(function(button){button.addEventListener('click',function(){destroyGeneratedLink(String(button.dataset.destroyToken||''),button,false)})});
}
function closeAggregateResult(){var rm=$('aggregateResultModal');if(rm)rm.style.display='none';resetAggregateResult()}
function destroyGeneratedLink(token,button,fromModal,key,skipConfirm){
 token=String(token||'').trim();if(!token)return;
 key=String(key||'');
 if(!skipConfirm&&!confirm('销毁后链接将立即失效且无法恢复，确定要销毁吗？'))return;
 if(button){button.disabled=true;button.textContent='销毁中…'}
 fetch('/api/destroy',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({token:token,key:key})})
 .then(function(r){return r.json().then(function(d){return {r:r,d:d}})})
 .then(function(x){
   if(!x.r.ok||!x.d.ok){
     if(x.d&&x.d.requireKey&&!key){
       var entered=prompt('该链接设置了销毁密钥，请输入密钥：');
       if(entered===null){if(button){button.disabled=false;button.textContent='销毁'};return}
       destroyGeneratedLink(token,button,fromModal,entered,true);
       return;
     }
     throw new Error(x.d.error||'销毁失败');
   }
   forgetGeneratedLink(token);
   if(fromModal)closeAggregateResult();
   aggregateNotice('链接已销毁，该链接已失效');
 })
 .catch(function(err){
   if(button){button.disabled=false;button.textContent='销毁'}
   aggregateNotice(err.message||'销毁失败',true);
 });
}
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
 var custom=picker.value==='__custom',value=currentValue(kind);current.textContent=value||('请选择'+(api?'订阅转换后端':'订阅转换规则'));current.href=value||'#';
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
 if(api){var ver=$('apiVersion');if(ver)ver.textContent=value?'正在获取…':'未选择 SUBAPI'}
 if(!value){setStatus(id,'<div class="status-item bad">'+statusText(kind,null,false)+'</div>');return}
 setStatus(id,'<div class="status-item wait">⏳ 状态检测中</div>');
 var query=api?'/api/status?api='+encodeURIComponent(value):'/api/status?config='+encodeURIComponent(value),timer=null;
 fetch(query,{cache:'no-store',headers:{Accept:'application/json'}}).then(function(r){return r.json().then(function(d){return {r:r,d:d}})}).then(function(x){
  var info=api?x.d.api:x.d.config,ok=Boolean(x.r.ok&&x.d.ok&&info&&info.ok);
  if(api){var ver=$('apiVersion');if(ver)ver.textContent=ok&&info&&info.version?String(info.version).trim():'无法获取版本'}
  setStatus(id,'<div class="status-item '+(ok?'ok':'bad')+'">'+statusText(kind,info,ok)+'</div>')
 }).catch(function(){
  if(api){var ver=$('apiVersion');if(ver)ver.textContent='无法获取版本'}
  setStatus(id,'<div class="status-item bad">'+(api?'❌ SUBAPI检测失败':'❌ SUBCONFIG检测失败')+'</div>')
 });
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
 updateCurrent('api');updateCurrent('config');checkStatus('api');checkStatus('config');renderGeneratedLinks();
 function renderAggregateQr(value){var q=$('aggregateResultQr');if(!q||!value)return;var draw=function(){if(!window.QRCode)return false;q.innerHTML='';q.style.display='block';try{new QRCode(q,{text:value,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.Q});return true}catch(err){q.innerHTML='';return false}};if(draw())return;var src='https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js';var script=document.querySelector('script[src="'+src+'"]');if(!script){script=document.createElement('script');script.src=src;script.onload=function(){draw()};document.head.appendChild(script)}else{var timer=window.setInterval(function(){if(draw())window.clearInterval(timer)},100);window.setTimeout(function(){window.clearInterval(timer)},5000)}}
function resetAggregateResult(){var q=$('aggregateResultQr');if(q){q.innerHTML='';q.style.display='block'}var b=$('copyDirect');if(b){b.textContent='复制';b.disabled=false}var d=$('destroyDirect');if(d){d.textContent='销毁';d.disabled=false}var status=$('aggregateCopyStatus');if(status){status.textContent='';status.className='aggregate-copy-status'}}
 e=$('copyDirect');if(e)e.addEventListener('click',function(){var a=$('direct'),v=a?a.textContent.trim():'';var done=function(){e.textContent='已复制';aggregateNotice('已复制');window.setTimeout(function(){if(e)e.textContent='复制'},1600)};var fail=function(){aggregateNotice('复制失败，请手动复制',true)};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(done).catch(fail);else{var ta=document.createElement('textarea');ta.value=v;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(err){fail()}ta.remove()}});e=$('destroyDirect');if(e)e.addEventListener('click',function(){var token=tokenFromSubscriptionUrl(($('direct')||{}).href||'');var key=String(CURRENT_DESTROY_KEY||'');destroyGeneratedLink(token,e,true,key,false)});e=$('aggregateResultClose');if(e)e.addEventListener('click',closeAggregateResult);var rm=$('aggregateResultModal');if(rm){rm.addEventListener('click',function(ev){if(ev.target===rm)closeAggregateResult()});document.addEventListener('keydown',function(ev){if(ev.key==='Escape'){closeAggregateResult()}})}
 e=$('generate');if(e)e.addEventListener('click',function(){
  var sources=$('sources')?$('sources').value.trim():'',a=$('apiPicker'),c=$('configPicker');if(!a||!c)return;
  var apiCustom=a.value==='__custom',configCustom=c.value==='__custom',apiValue=currentValue('api'),configValue=currentValue('config');
  if(!sources)return alert('请输入订阅链接');if(!apiValue)return alert('请选择订阅转换后端');if(!configValue)return alert('请选择订阅转换规则');
  var destroyKey=($('destroyKey')?$('destroyKey').value:'').trim();CURRENT_DESTROY_KEY=destroyKey;var body={sources:sources,apiIds:apiCustom?[]:[currentId('api')],apiCustom:apiCustom,apiUrl:apiCustom?apiValue:'',configIds:configCustom?[]:[currentId('config')],configCustom:configCustom,configUrl:configCustom?configValue:'',noAds:($('noAds')?$('noAds').value:'').trim(),destroyKey:destroyKey};
  var button=$('generate');button.disabled=true;button.textContent='生成聚合订阅链接';
  fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return {r:r,d:d}})}).then(function(x){if(!x.r.ok||!x.d.ok)throw new Error(x.d.error||'生成失败');rememberGeneratedLink(x.d.subscription_url);$('direct').textContent=x.d.subscription_url;$('direct').href=x.d.subscription_url;var resultModal=$('aggregateResultModal');if(resultModal){resultModal.style.display='flex';var copyButton=$('copyDirect');if(copyButton)copyButton.textContent='复制';var destroyButton=$('destroyDirect');if(destroyButton){destroyButton.textContent='销毁';destroyButton.disabled=false}var status=$('aggregateCopyStatus');if(status){status.textContent='';status.className='aggregate-copy-status'}renderAggregateQr(x.d.subscription_url)}}).catch(function(err){alert(err.message||'生成失败')}).finally(function(){button.disabled=false;button.textContent='生成聚合订阅链接'})
 })
}

/* ---------- SUB-UI admin ---------- */
var modalState=null;
function openModal(id){var el=$(id);if(el)el.style.display='flex'}
function closeModal(id){var el=$(id);if(el)el.style.display='none'}
function showProvider(type,id,name,url){modalState={type:type,id:id||''};var t=$('modalTitle');if(t)t.textContent=(id?'编辑 ':'添加 ')+(type==='subapi'?'订阅转换后端':'订阅转换规则');if($('modalName'))$('modalName').value=name||'';if($('modalUrl'))$('modalUrl').value=url||'';openModal('providerModal')}
function hideProvider(){closeModal('providerModal');modalState=null}
function post(data){return fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(data)}).then(function(r){return r.text().then(function(t){var d=null;try{d=t?JSON.parse(t):null}catch(e){}if(!d)throw new Error('服务器返回无效数据（HTTP '+r.status+'）');if(!r.ok||d.ok===false)throw new Error(d.error||('操作失败（HTTP '+r.status+'）'));return d})})}
function setDefaultProvider(type,id){post({type:type+'_default',id:id}).then(function(){toast('默认配置已更新')}).catch(function(e){alert(e.message||'设置默认配置失败');setTimeout(function(){location.reload()},100)})}
function deleteProvider(type,id){if(!confirm('确定删除这个项目？'))return;post({type:type+'_delete',id:id}).then(function(){toast('已删除');setTimeout(function(){location.reload()},500)}).catch(function(e){alert(e.message||'删除失败')})}
function saveProvider(){if(!modalState)return;var name=$('modalName')?$('modalName').value.trim():'',url=$('modalUrl')?$('modalUrl').value.trim():'';if(!name)return alert('请输入备注');if(!/^https?:\/\//i.test(url))return alert('URL 必须以 http:// 或 https:// 开头');var b=$('modalSave'),editing=Boolean(modalState.id);if(b){b.disabled=true;b.textContent='保存中...'}post({type:modalState.type+'_'+(editing?'update':'create'),id:modalState.id,name:name,url:url}).then(function(){hideProvider();toast(editing?'已保存':'已添加');setTimeout(function(){location.reload()},700)}).catch(function(e){alert(e.message||'保存失败')}).finally(function(){if(b){b.disabled=false;b.textContent='保存'}})}
function saveSecurity(){var user=$('securityUser')?$('securityUser').value.trim():'',pass=$('securityPass')?$('securityPass').value:'',pass2=$('securityPass2')?$('securityPass2').value:'';if(!user)return alert('管理员账号不能为空');if(pass!==pass2)return alert('两次输入的密码不一致');var b=$('saveSecurity');if(b){b.disabled=true;b.textContent='保存中...'}post({type:'security',user:user,pass:pass}).then(function(){closeModal('securityModal');toast('安全设置已保存');setTimeout(function(){location.reload()},700)}).catch(function(e){alert(e.message||'保存失败')}).finally(function(){if(b){b.disabled=false;b.textContent='保存'}})}
function saveSiteSettings(){var name=$('siteName')?$('siteName').value.trim()||'SUB':'SUB',path=$('sitePath')?$('sitePath').value.trim():'',logo=$('siteLogo')?$('siteLogo').value.trim():'';if(!/^[A-Za-z0-9_-]{2,60}$/.test(path))return alert('管理员路径只能使用 2-60 个字母、数字、下划线或短横线');if(logo&&!/^https?:\/\//i.test(logo))return alert('站点标签栏 Logo 必须是 http:// 或 https:// URL');var b=$('saveSite');if(b){b.disabled=true;b.textContent='保存中...'}post({type:'site_settings',subName:name,adminPath:path,siteLogo:logo}).then(function(d){closeModal('siteModal');toast('站点设置已保存');setTimeout(function(){location.href='/'+d.adminPath},700)}).catch(function(e){alert(e.message||'保存失败')}).finally(function(){if(b){b.disabled=false;b.textContent='保存'}})}
function saveProviderOrder(type,items){var order=items.map(function(el){return el.dataset.providerId}).filter(Boolean);if(!order.length)return Promise.resolve();return post({type:type+'_reorder',order:order})}
function initProviderDrag(){
 document.querySelectorAll('.provider-list').forEach(function(list){
  var dragged=null,touchDragging=false,touchMoved=false;
  function clearDrag(){if(dragged)dragged.classList.remove('dragging');list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});dragged=null;touchDragging=false;touchMoved=false}
  function saveOrder(){
   var type=list.dataset.providerType,all=Array.from(list.querySelectorAll('.provider-item')),order=all.map(function(x){return x.dataset.providerId}).filter(Boolean),changed=order.join(','),key='__cfsubs_order_'+type,old=window[key]||'';
   if(!order.length||changed===old)return;
   window[key]=changed;list.classList.add('saving-order');
   saveProviderOrder(type,all).then(function(){toast('排序已保存')}).catch(function(err){alert(err.message||'排序保存失败');location.reload()}).finally(function(){list.classList.remove('saving-order')})
  }
  list.querySelectorAll('.provider-item[draggable="true"]').forEach(function(item){
   item.addEventListener('dragstart',function(e){dragged=item;item.classList.add('dragging');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.dataset.providerId||'')}});
   item.addEventListener('dragend',function(){saveOrder();clearDrag()});
   item.addEventListener('dragover',function(e){e.preventDefault();if(!dragged||dragged===item)return;var r=item.getBoundingClientRect();var before=e.clientY<r.top+r.height/2;list.insertBefore(dragged,before?item:item.nextSibling);list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});item.classList.add('drag-over')});
   item.addEventListener('drop',function(e){e.preventDefault();if(!dragged)return;item.classList.remove('drag-over');saveOrder()});
   var handle=item.querySelector('.drag-handle');
   if(handle){
    handle.addEventListener('touchstart',function(e){if(!e.touches||!e.touches[0])return;dragged=item;touchDragging=true;touchMoved=false;item.classList.add('dragging')},{passive:true});
    handle.addEventListener('touchmove',function(e){if(!touchDragging||!dragged||!e.touches[0])return;touchMoved=true;if(e.cancelable)e.preventDefault();var y=e.touches[0].clientY;var target=null;list.querySelectorAll('.provider-item').forEach(function(x){if(x===dragged)return;var r=x.getBoundingClientRect();if(y>=r.top&&y<=r.bottom)target=x});if(target){var r=target.getBoundingClientRect();var before=y<r.top+r.height/2;list.insertBefore(dragged,before?target:target.nextSibling);list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});target.classList.add('drag-over')}},{passive:false});
    handle.addEventListener('touchend',function(){if(!touchDragging)return;list.querySelectorAll('.provider-item').forEach(function(x){x.classList.remove('drag-over')});if(touchMoved)saveOrder();clearDrag()});
    handle.addEventListener('touchcancel',function(){clearDrag()});
   }
  });
 });
}
function initAdmin(){
 if(window.__CF_SUBS_ADMIN_READY)return;window.__CF_SUBS_ADMIN_READY=true;
 document.querySelectorAll('[data-open-modal]').forEach(function(b){b.addEventListener('click',function(){openModal(b.dataset.openModal)})});
 document.querySelectorAll('[data-close-modal]').forEach(function(b){b.addEventListener('click',function(){closeModal(b.dataset.closeModal)})});
 document.querySelectorAll('[data-provider-action]').forEach(function(b){b.addEventListener('click',function(){var action=b.dataset.providerAction,type=b.dataset.providerType||'',id=b.dataset.providerId||'';if(action==='add')showProvider(type,'','','');else if(action==='edit')showProvider(type,id,b.dataset.providerName||'',b.dataset.providerUrl||'');else if(action==='delete')deleteProvider(type,id)})});
 var e=$('providerCancel');if(e)e.addEventListener('click',hideProvider);e=$('modalSave');if(e)e.addEventListener('click',saveProvider);e=$('saveSecurity');if(e)e.addEventListener('click',saveSecurity);e=$('saveSite');if(e)e.addEventListener('click',saveSiteSettings);
 document.querySelectorAll('.default-provider-select').forEach(function(select){select.addEventListener('change',function(){setDefaultProvider(select.dataset.type,select.value)})});
 initProviderDrag();
 document.querySelectorAll('.modal-overlay').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m)m.style.display='none'})});
}

/* ---------- SUB-UI aggregate subscription page ---------- */
function showQrcode(button){var q=document.getElementById('current-qrcode');if(!q||typeof QRCode==='undefined')return;button.closest('.link-item').appendChild(q);q.innerHTML='';q.style.display='block';new QRCode(q,{text:button.dataset.url,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.Q})}
function hideQrcode(button){var q=document.getElementById('current-qrcode');if(q){q.style.display='none';q.innerHTML=''}button.classList.add('hidden');var c=button.closest('.actions').querySelector('.copy-btn');if(c)c.classList.remove('hidden')}
function copySubscription(button){navigator.clipboard.writeText(button.dataset.url).then(function(){toast('已复制到剪贴板');showQrcode(button);button.classList.add('hidden');var h=button.closest('.actions').querySelector('.hide-btn');if(h)h.classList.remove('hidden')}).catch(function(){toast('复制失败，请手动复制')})}
function guestToast(message){
 var el=$('copyNotice');
 if(!el)return;
 el.textContent=message;
 el.style.display='block';
 clearTimeout(window.__cfGuestToastTimer);
 window.__cfGuestToastTimer=setTimeout(function(){el.style.display='none'},1500);
}
function guestCopy(button){
 var value=button.dataset.url||'';
 function done(){guestToast('已复制');showGuestQr(button)}
 function fail(){guestToast('复制失败，请手动复制')}
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(value).then(done).catch(fail);return}
 var ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();
 try{document.execCommand('copy');done()}catch(e){fail()}finally{ta.remove()}
}
function showGuestQr(button){
 var item=button.closest('.guest-link-item');
 var qr=item&&item.querySelector('.guest-qrcode');
 var copy=item&&item.querySelector('.guest-copy-btn');
 var hide=item&&item.querySelector('.guest-hide-btn');
 if(!item||!qr)return;
 document.querySelectorAll('.guest-link-item').forEach(function(other){
  if(other===item)return;
  var oq=other.querySelector('.guest-qrcode'),oc=other.querySelector('.guest-copy-btn'),oh=other.querySelector('.guest-hide-btn');
  if(oq){oq.style.display='none';oq.innerHTML=''}
  if(oc)oc.style.display='inline-flex';
  if(oh)oh.style.display='none';
 });
 qr.innerHTML='';qr.style.display='block';
 if(copy)copy.style.display='none';
 if(hide)hide.style.display='inline-flex';
 if(window.QRCode){try{new QRCode(qr,{text:button.dataset.url,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.Q})}catch(e){}}
}
function hideGuestQr(button){
 var item=button.closest('.guest-link-item');if(!item)return;
 var qr=item.querySelector('.guest-qrcode'),copy=item.querySelector('.guest-copy-btn'),hide=item.querySelector('.guest-hide-btn');
 if(qr){qr.style.display='none';qr.innerHTML=''}
 if(copy)copy.style.display='inline-flex';
 if(hide)hide.style.display='none';
}
function closeGuestDestroyModal(){var m=$('guestDestroyModal');if(m)m.style.display='none';var i=$('guestDestroyKey');if(i)i.value=''}
function openGuestDestroyModal(){var m=$('guestDestroyModal');if(m)m.style.display='flex';var i=$('guestDestroyKey');if(i){i.value='';setTimeout(function(){i.focus()},0)}}
function submitGuestDestroy(token,key){
 var button=document.querySelector('.guest-head-destroy');
 if(button){button.disabled=true;button.textContent='销毁中…'}
 fetch('/api/destroy',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({token:token,key:String(key||'')})})
 .then(function(r){return r.json().then(function(d){return {r:r,d:d}})})
 .then(function(x){
  if(!x.r.ok||!x.d.ok)throw new Error(x.d.error||'销毁失败');
  closeGuestDestroyModal();
  guestToast('链接已销毁，该链接已失效');
  setTimeout(function(){location.href='/'},900);
 })
 .catch(function(err){
  if(button){button.disabled=false;button.textContent='销毁本链接'}
  guestToast(err.message||'销毁失败');
 });
}
function initGuest(){
 var shell=document.querySelector('.guest-shell');
 if(!shell)return;
 var token=String(shell.dataset.token||'').trim();
 var keyRequired=shell.dataset.keyRequired==='true';
 document.querySelectorAll('.guest-copy-btn').forEach(function(b){b.addEventListener('click',function(){guestCopy(b)})});
 document.querySelectorAll('.guest-hide-btn').forEach(function(b){b.addEventListener('click',function(){hideGuestQr(b)})});
 var destroyButton=document.querySelector('.guest-head-destroy');
 if(destroyButton){destroyButton.addEventListener('click',function(){
  if(keyRequired){openGuestDestroyModal();return}
  if(!confirm('销毁后此聚合订阅链接将立即失效且无法恢复，确定要销毁吗？'))return;
  submitGuestDestroy(token,'');
 })}
 var modal=$('guestDestroyModal');
 if(modal)modal.addEventListener('click',function(e){if(e.target===modal)closeGuestDestroyModal()});
 var cancel=$('guestDestroyCancel');if(cancel)cancel.addEventListener('click',closeGuestDestroyModal);
 var confirmButton=$('guestDestroyConfirm');if(confirmButton)confirmButton.addEventListener('click',function(){
  var input=$('guestDestroyKey'),key=input?input.value.trim():'';
  if(!key){guestToast('请输入销毁密钥');if(input)input.focus();return}
  submitGuestDestroy(token,key);
 });
 document.addEventListener('keydown',function(e){if(e.key==='Escape')closeGuestDestroyModal()});
}

function boot(){
 if($('apiPicker')||$('generate'))initPublic();
 if(document.querySelector('[data-provider-action]')||$('saveSecurity')||$('saveSite'))initAdmin();
 if(document.querySelector('.guest-copy-btn')||document.querySelector('.guest-head-destroy'))initGuest();
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
        if (url.pathname === '/api/destroy' && request.method === 'POST') {
            return await handlePublicDestroy(request, env);
        }

        // ==================== 管理后台 API ====================
        // 管理保存操作使用独立 API 路径，避免 Safari/WebKit 对动态管理路径 POST
        // 的网络层报错（例如 Load failed）。认证仍然使用同一个管理员 Cookie。
        if (url.pathname === '/api/admin' && request.method === 'POST') {
            if (isAdminLoginEnabled(adminUser, adminPass)) {
                const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
                if (!isLoggedIn) return jsonResponse({ok:false,error:'未登录或登录已过期'},401);
            }
            return await handleAdmin(request, env, {
                adminUser,
                adminPass,
                effectiveSubConverter,
                effectiveSubConfig,
                effectiveSubProtocol,
                hasCustomApi,
                hasCustomConfig,
                adminPath,
                mytoken,
                url
            });
        }

        // ==================== JSON 管理页面 ====================
        if (url.pathname === `/${adminPath}/json`) {
            if (isAdminLoginEnabled(adminUser, adminPass)) {
                const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
                if (!isLoggedIn) {
                    return new Response(renderLoginPage(url), {
                        headers: {
                            'Content-Type': 'text/html;charset=utf-8',
                            'Cache-Control': 'no-store'
                        }
                    });
                }
            }
            return new Response(renderJsonManagerPage(url, env, adminPath), {
                headers: {
                    'Content-Type': 'text/html;charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            });
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
            return new Response(renderGuestPage(url, tokenData.url, tokenData.name, primaryBackend, guestStatus, Boolean(tokenData.destroyKeyHash)), {
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
                { headers:{'User-Agent':'SUB-UI/Status'} },
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
                { headers:{'User-Agent':'SUB-UI/Status'} },
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

            if(data.type==='json_list'){
                const query=String(data.query||'').trim().slice(0,500);
                const items=await listJsonManagerItems(env,query);
                return jsonResponse({ok:true,count:items.length,items});
            }

            if(data.type==='json_delete'){
                const token=normalizeToken(data.token);
                if(!token)return jsonResponse({ok:false,error:'缺少 Token'},400);
                const raw=await env.KV.get(`${URL_PREFIX}${token}`);
                if(!raw)return jsonResponse({ok:false,error:'链接不存在或已经被删除'},404);
                await env.KV.delete(`${URL_PREFIX}${token}`);
                return jsonResponse({ok:true,token});
            }

            if(data.type==='json_delete_keyword'){
                const keyword=String(data.keyword||'').trim().slice(0,500);
                if(!keyword)return jsonResponse({ok:false,error:'请输入 JSON 关键字'},400);
                const items=await listJsonManagerItems(env,keyword);
                let deleted=0;
                for(const item of items){
                    await env.KV.delete(`${URL_PREFIX}${item.token}`);
                    deleted++;
                }
                return jsonResponse({ok:true,deleted,keyword});
            }

            if(data.type==='json_delete_all'){
                const items=await listJsonManagerItems(env,'');
                for(const item of items) await env.KV.delete(`${URL_PREFIX}${item.token}`);
                return jsonResponse({ok:true,deleted:items.length});
            }

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

            if(['subapi_create','subapi_update','subapi_delete','subapi_default','subapi_reorder','subconfig_create','subconfig_update','subconfig_delete','subconfig_default','subconfig_reorder'].includes(data.type)){
                const cfg=await getConfig(env);
                const isApi=data.type.startsWith('subapi_');
                const key=isApi?'subApis':'subConfigs';
                const defaultKey=isApi?'defaultSubApiId':'defaultSubConfigId';
                const list=normalizeProviderList(cfg[key]);
                const action=data.type.split('_')[1];
                const id=String(data.id||'').trim();

                if(action==='reorder'){
                    const order=Array.isArray(data.order)?data.order.map(x=>String(x||'').trim()).filter(Boolean):[];
                    if(order.length!==list.length || new Set(order).size!==list.length || order.some(x=>!list.some(item=>item.id===x))){
                        return jsonResponse({ok:false,error:'排序数据无效'},400);
                    }
                    const map=new Map(list.map(item=>[item.id,item]));
                    cfg[key]=order.map(x=>map.get(x));
                    await env.KV.put('CONFIG.json',JSON.stringify(cfg));
                    return jsonResponse({ok:true,items:normalizeProviderList(cfg[key]),defaultId:String(cfg[defaultKey]||'')});
                }

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
        if(parsed.subName==='SUB-UI') parsed.subName='SUB';
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
        const destroyKey=String(data.destroyKey||'').trim().slice(0,256);

        const token=await makeRandomToken(env,8);
        const destroyKeyHash=destroyKey?await sha256Hex(`${token}:${destroyKey}`):'';
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
            type:'sub-ui',
            destroyKeyHash
        };
        await env.KV.put(`${URL_PREFIX}${token}`,JSON.stringify(item));

        const prefs={
            apiIds:selectedApis.map(x=>x.id),apiCustom,apiUrl:apiCustom?apiUrl:'',
            configIds:selectedConfigs.map(x=>x.id),configCustom,configUrl:configCustom?configUrl:'',noAds
        };
        const cookie=buildPublicPreferencesCookie(prefs);
        const headers=cookie?{'Set-Cookie':cookie}:{ };
        const subscriptionUrl=`${requestUrl.origin}/${encodeURIComponent(token)}`;
        const responseItem={...item};delete responseItem.destroyKeyHash;
        return jsonResponse({ok:true,url:responseItem,subscription_url:subscriptionUrl},200,headers);
    }catch(e){return jsonResponse({ok:false,error:e?.message||String(e)},500);}
}
async function handlePublicDestroy(request,env){
    if(!env.KV) return jsonResponse({ok:false,error:'未绑定 KV'},500);
    try{
        const data=await request.json();
        let token=String(data.token||'').trim();
        const suppliedKey=String(data.key||'');
        if(!token){
            const rawUrl=String(data.url||'').trim();
            if(rawUrl){
                try{ token=decodeURIComponent(new URL(rawUrl).pathname.replace(/^\/+/,'')); }catch(e){}
            }
        }
        token=String(token||'').trim().replace(/^\/+|\/+$/g,'');
        if(!token) return jsonResponse({ok:false,error:'缺少订阅链接标识'},400);
        if(!/^[A-Za-z0-9]+$/.test(token)||token.length>128) return jsonResponse({ok:false,error:'订阅链接标识无效'},400);

        const raw=await env.KV.get(`${URL_PREFIX}${token}`);
        if(!raw) return jsonResponse({ok:false,error:'链接不存在或已经被销毁'},404);
        let item=null;
        try{item=JSON.parse(raw)}catch(e){item=null}
        const storedHash=String(item?.destroyKeyHash||'');
        if(storedHash){
            if(!suppliedKey) return jsonResponse({ok:false,error:'需要提供销毁密钥',requireKey:true},403);
            const suppliedHash=await sha256Hex(`${token}:${suppliedKey}`);
            if(suppliedHash!==storedHash) return jsonResponse({ok:false,error:'销毁密钥错误',requireKey:true},403);
        }

        await env.KV.delete(`${URL_PREFIX}${token}`);
        return jsonResponse({ok:true,token});
    }catch(e){
        return jsonResponse({ok:false,error:e?.message||String(e)},500);
    }
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
async function sha256Hex(input){
    const bytes=new TextEncoder().encode(String(input));
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

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
        body { margin: 0; background: radial-gradient(circle at 0% 0%, rgba(222,246,235,.78), transparent 38%), linear-gradient(135deg, #f7faf8 0%, #eef7f2 52%, #e3f2e9 100%); color: #202124; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; min-height: 100vh; transition: background 0.3s, color 0.3s; background-attachment: fixed; }
        .page { width: 100%; max-width: 760px; margin: 0 auto; padding: 18px 14px 28px; }
        .page.app-shell { max-width: 1100px; margin: 24px auto 40px; padding: 0 28px 34px; border: 1px solid rgba(255,255,255,.72); border-radius: 28px; background: linear-gradient(135deg, rgba(255,255,255,.82) 0%, rgba(246,252,248,.76) 48%, rgba(225,244,233,.82) 100%); box-shadow: 0 18px 55px rgba(50,90,70,.10); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); overflow: hidden; }
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
        .toast { position: fixed; left: 50%; top: auto; bottom: 28px; transform: translateX(-50%); display: none; min-width: 190px; max-width: calc(100vw - 40px); padding: 12px 18px; text-align: center; color: #fff; background: rgba(0, 0, 0, 0.82); border-radius: 12px; z-index: 99999; box-sizing: border-box; }
        .status-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; font-weight: 600; width: 100%; word-break: break-all; transition: background 0.3s, color 0.3s, border-color 0.3s; }
        .status-ok { background: rgba(76, 175, 80, 0.1); color: #2e7d32; border: 1px solid rgba(76, 175, 80, 0.2); }
        .status-warn { background: rgba(255, 152, 0, 0.1); color: #f57c00; border: 1px solid rgba(255, 152, 0, 0.2); }
        .status-error { background: rgba(244, 67, 54, 0.1); color: #c62828; border: 1px solid rgba(244, 67, 54, 0.2); }
        #current-qrcode { display: none; margin-top: 12px; padding: 12px; border: 1px solid rgba(229, 229, 223, 0.6); border-radius: 12px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); width: fit-content; max-width: 100%; }
        .hidden { display: none !important; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center; z-index: 1000; overflow-y: auto; }
        .modal-content { background: rgba(255, 255, 255, 0.95); border-radius: 20px; padding: 24px; width: 90%; max-width: 480px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.5); transition: background 0.3s, border-color 0.3s; margin: 20px auto; }
        @media (prefers-color-scheme: dark) {
            body { background: radial-gradient(circle at 0% 28%, rgba(0,188,212,.12), transparent 24%), radial-gradient(circle at 100% 100%, rgba(0,120,70,.20), transparent 34%), linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%); background-attachment: fixed; color: #e0e0e0; }
            .page.app-shell { background: linear-gradient(135deg, rgba(1,5,6,.98) 0%, rgba(2,10,10,.96) 48%, rgba(0,54,35,.92) 100%); border-color: rgba(255,255,255,.13); box-shadow: 0 22px 75px rgba(0,0,0,.55); }
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
<main class="page app-shell" style="width:100%; max-width:420px; padding:20px; margin:0;">
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

function renderGuestPage(url, guest, guestName = '', backend = null, status = null, destroyKeyRequired = false) {
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
<title>聚合订阅链接</title>${SiteLogo?`<link rel="icon" href="${escapeHTML(SiteLogo)}">`:''}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${getToolStyles()}
.guest-link-list{display:grid;gap:10px}
.guest-link-item{position:relative;padding:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:12px}
.guest-link-label{font-weight:700;margin-bottom:0;padding-right:90px}
.guest-link-url{display:block;width:100%;box-sizing:border-box;padding:10px 12px;margin-top:14px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(0,0,0,.28);color:#64b5f6;text-decoration:none;word-break:break-all;overflow-wrap:anywhere}
.guest-link-url:hover,.guest-current-link:hover{background:rgba(100,181,246,.08);border-color:#64b5f6;text-decoration:none}
.guest-actions{position:absolute;top:12px;right:12px;display:flex;gap:8px;align-items:center;justify-content:flex-end}.guest-actions button{margin:0}.guest-link-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:30px;margin-bottom:14px}.guest-link-head .guest-link-label{margin:0}.guest-copy-btn,.guest-hide-btn{min-width:56px;width:auto;height:30px;min-height:30px;padding:0 10px;flex:0 0 auto;font-size:16px;line-height:30px}.guest-hide-btn{display:none}.guest-qrcode{display:none;background:#fff;border-radius:12px;padding:12px;margin:14px auto 0;width:max-content;max-width:100%;box-sizing:border-box;box-shadow:0 8px 24px rgba(0,0,0,.08)}
.guest-head-destroy{margin:0;min-width:104px;height:34px;min-height:34px;padding:0 12px;background:#d93025;color:#fff;border-color:#d93025}.guest-head-destroy:hover{background:#b91c1c;color:#fff;box-shadow:0 0 0 2px rgba(217,48,37,.12)}.guest-destroy-note{margin-top:6px;color:#999;font-size:12px;line-height:1.5}.guest-destroy-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.44);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.guest-destroy-dialog{width:min(440px,100%);padding:22px;border-radius:18px;background:rgba(255,255,255,.97);border:1px solid rgba(229,229,223,.9);box-shadow:0 20px 60px rgba(0,0,0,.24)}.guest-destroy-dialog h3{margin:0;font-size:18px}.guest-destroy-dialog p{margin:7px 0 14px;color:#888;font-size:12px;line-height:1.6}.guest-destroy-input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid rgba(229,229,223,.9);border-radius:10px;background:rgba(250,250,250,.8);color:inherit;font:inherit}.guest-destroy-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.guest-destroy-confirm{background:#d93025;color:#fff;border-color:#d93025}.guest-destroy-confirm:hover{background:#b91c1c;color:#fff}.guest-destroy-cancel{background:transparent}
.guest-actions button{min-width:56px;height:30px;min-height:30px;padding:0 10px;font-size:16px;line-height:30px}
.guest-hide{display:none}
.guest-status{margin-top:10px;padding:10px 12px;border-radius:10px;font-weight:700;word-break:break-all}
.guest-status.status-ok{background:rgba(129,199,132,.1);color:#81c784;border:1px solid rgba(129,199,132,.2)}
.guest-status.status-error{background:rgba(229,115,115,.1);color:#e57373;border:1px solid rgba(229,115,115,.2)}
.guest-current-label{margin-top:12px;margin-bottom:6px;color:#aaa;font-size:13px;font-weight:600}
.guest-current{display:block;width:100%;box-sizing:border-box;text-decoration:none;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(0,0,0,.28);color:#64b5f6;word-break:break-all;overflow-wrap:anywhere}
#current-qrcode{display:none;background:#fff;border-radius:12px;padding:12px;margin:18px auto 0;width:max-content;max-width:100%;box-sizing:border-box;box-shadow:0 8px 24px rgba(0,0,0,.08)}
.guest-shell{max-width:1100px;padding-top:24px}.guest-header{margin:0 -28px 18px;padding:28px 28px 24px;border-bottom:1px solid rgba(120,130,140,.18)}.guest-head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.guest-head-copy{flex:0 0 auto;white-space:nowrap;margin-top:2px}.guest-header .subtitle{word-break:keep-all;overflow-wrap:normal;hyphens:none}
@media(prefers-color-scheme:dark){.guest-destroy-dialog{background:rgba(30,30,30,.97);border-color:rgba(255,255,255,.1)}.guest-destroy-dialog p{color:#9aa7b5}.guest-destroy-input{background:rgba(0,0,0,.35);border-color:rgba(255,255,255,.12);color:#f3f6f7}.guest-head-destroy{background:#c62828;border-color:#c62828}.guest-head-destroy:hover{background:#a61f1f}.guest-destroy-confirm{background:#c62828;border-color:#c62828}.guest-destroy-confirm:hover{background:#a61f1f}}
@media(prefers-color-scheme:dark){body{background:#000;background-image:radial-gradient(circle at 0% 28%,rgba(0,188,212,.14),transparent 24%),radial-gradient(circle at 100% 100%,rgba(0,120,70,.18),transparent 32%),linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%);background-attachment:fixed;color:#f4f7f8}.guest-shell{background:linear-gradient(135deg,rgba(1,5,6,.98) 0%,rgba(2,10,10,.96) 48%,rgba(0,54,35,.92) 100%);border-color:rgba(255,255,255,.13)}.guest-header{border-bottom-color:rgba(255,255,255,.10)}.guest-head-copy{background:#3f4650;color:#fff;border-color:#69717c}}
@media(prefers-color-scheme:light){.guest-shell{background:linear-gradient(135deg,rgba(255,255,255,.95) 0%,rgba(250,255,252,.93) 55%,rgba(226,247,237,.9) 100%);border-color:rgba(120,150,135,.18)}.guest-link-item{background:rgba(255,255,255,.5);border-color:rgba(229,229,223,.7)}.guest-link-url,.guest-current{background:rgba(250,250,250,.7);border-color:rgba(229,229,223,.8);color:#1f4b99}.guest-current-label{color:#666}.guest-status.status-ok{color:#2e7d32;background:rgba(76,175,80,.08)}.guest-status.status-error{color:#c62828;background:rgba(244,67,54,.08)}}
@media(max-width:640px){.guest-shell{width:calc(100% - 28px);margin:14px 14px 28px;padding:18px 18px 28px;border-radius:22px}.guest-header{margin:0 -18px 16px;padding:22px 18px 20px}.guest-head-row{align-items:flex-start;gap:12px}.guest-head-row .title{font-size:40px}.guest-head-row .subtitle{font-size:12px}.guest-head-copy{font-size:12px;padding:0;background:transparent;border:0}.guest-head-destroy{min-width:92px;padding:0 10px}.guest-destroy-dialog{padding:18px}.guest-destroy-actions{gap:7px}}
</style>
<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
</head>
<body>
<div id="copyNotice" class="toast"></div>
<main class="page app-shell guest-shell" data-token="${escapeHTML(String(guest||''))}" data-key-required="${destroyKeyRequired?'true':'false'}">
<header class="header guest-header">
<div class="guest-head-row"><div><h1 class="title">聚合订阅链接</h1><div class="subtitle">复制订阅链接可同时生成二维码</div></div><div class="guest-head-copy"><button type="button" class="button guest-head-destroy">销毁本链接</button></div></div>
<div class="guest-destroy-note">销毁后此聚合订阅链接将立即失效且无法恢复。${destroyKeyRequired ? '本链接已设置销毁密钥。' : '本链接未设置销毁密钥，确认后即可销毁。'}</div>
</header>
<section class="panel">
<h2 class="section-title">订阅链接</h2>
<div class="guest-link-list">
${links.map(([label,value])=>`<div class="guest-link-item">
<div class="guest-link-head"><div class="guest-link-label">${escapeHTML(label)}</div></div>
<a class="guest-link-url" href="${escapeHTML(value)}" target="_blank" rel="noopener">${escapeHTML(value)}</a>
<div class="guest-actions"><button type="button" class="button guest-copy-btn" data-url="${escapeHTML(value)}" >复制</button><button type="button" class="button secondary guest-hide-btn" >隐藏</button></div>
<div class="guest-qrcode"></div>
</div>`).join('')}
</div>
</section>
<section class="panel">
<h2 class="section-title">订阅转换服务</h2>
<div class="guest-link-list">
<div class="guest-link-item">
<div class="guest-link-head"><div class="guest-link-label">订阅转换后端 SUBAPI</div></div>
<div class="guest-status ${apiCss}">${apiStatus}</div>
<div class="guest-current-label">当前配置</div>
<a class="guest-current guest-link-url" href="${escapeHTML(apiUrl)}" target="_blank" rel="noopener">${escapeHTML(apiUrl)}</a>
</div>
<div class="guest-link-item">
<div class="guest-link-head"><div class="guest-link-label">订阅转换规则 SUBCONFIG</div></div>
<div class="guest-status ${configCss}">${configStatus}</div>
<div class="guest-current-label">当前配置</div>
<a class="guest-current guest-link-url" href="${escapeHTML(configUrl)}" target="_blank" rel="noopener">${escapeHTML(configUrl)}</a>
</div>
</div>
</section>
</main>
<div id="guestDestroyModal" class="guest-destroy-modal"><div class="guest-destroy-dialog"><h3>销毁本链接</h3><p>销毁后此聚合订阅链接将立即失效，原订阅地址及其生成内容都将无法继续使用，且此操作无法恢复。
请输入本链接的销毁密钥。</p><input id="guestDestroyKey" class="guest-destroy-input" type="password" autocomplete="current-password" placeholder="请输入销毁密钥"><div class="guest-destroy-actions"><button id="guestDestroyCancel" type="button" class="button secondary guest-destroy-cancel">取消</button><button id="guestDestroyConfirm" type="button" class="button guest-destroy-confirm">确认销毁</button></div></div></div>
<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
<script src="/__cfsubs.js" defer></script>

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
<title>${esc(cfg.subName||'SUB')}</title>${cfg.siteLogo?`<link rel="icon" href="${esc(cfg.siteLogo)}">`:''}
<style>
${getSubUIStyles()}
.native-picker{display:block;width:100%;min-height:42px;padding:8px 12px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:inherit;font:inherit;cursor:pointer;appearance:auto;-webkit-appearance:auto}
.native-picker:focus{outline:none;border-color:#287ea8;box-shadow:0 0 0 2px rgba(40,126,168,.15)}
.current-box{margin-top:12px}.current-title{font-size:13px;font-weight:700;margin:0 0 7px}.current-row{display:flex;align-items:flex-start;gap:8px}
.current-api-input{width:100%;height:42px;min-width:0}.current-config-input{width:100%;min-height:70px;line-height:1.5;word-break:break-all;overflow-wrap:anywhere}.current-config-link{display:flex;align-items:center;padding:10px 12px;border:1px solid rgba(229,229,223,.8);border-radius:8px;background:rgba(250,250,250,.7);box-sizing:border-box;color:#1f4b99;text-decoration:none;cursor:pointer}.current-api-input.current-config-link{height:42px;min-height:42px}.current-config-link:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10);background:rgba(31,75,153,.04)}.current-config-link:empty{color:#888}.current-config-link:focus-visible{text-decoration:none;outline:none;border-color:#1f4b99;box-shadow:0 0 0 3px rgba(31,75,153,.14)}
.edit-custom{display:none;flex:0 0 auto;min-width:72px}.status-box{margin-top:12px}.status-title{font-size:13px;font-weight:700;margin:0 0 7px}.status-list{display:grid;gap:7px}
.status-item{padding:8px 10px;border-radius:9px;font-weight:650;word-break:break-all}.status-item.wait{background:rgba(255,152,0,.1);border:1px solid rgba(255,152,0,.2);color:#f57c00}.status-item.ok{background:rgba(76,175,80,.12);border:1px solid rgba(76,175,80,.25);color:#2e7d32}.status-item.bad{background:rgba(244,67,54,.1);border:1px solid rgba(244,67,54,.22);color:#c62828}
.custom-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1200;padding:20px}.custom-modal{width:min(480px,100%);background:rgba(255,255,255,.96);border:1px solid rgba(229,229,223,.9);border-radius:18px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.22)}.custom-modal h3{margin:0;font-size:17px}.custom-modal p{margin:6px 0 14px;color:#888;font-size:12px}.custom-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.aggregate-result-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.42);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow:auto;padding:20px}.aggregate-result-modal{position:relative;width:min(620px,calc(100vw - 40px));margin:auto;transition:height .2s ease,transform .2s ease}.aggregate-result-close{position:absolute;top:10px;right:10px;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:#777;font-size:24px;line-height:32px;text-align:center;cursor:pointer}.aggregate-result-close:hover{background:rgba(0,0,0,.07);color:#222}.aggregate-result-url{display:block;width:100%;padding:12px 14px;margin:14px 0 0;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere;line-height:1.55;user-select:text;text-decoration:none;box-sizing:border-box}.aggregate-result-url:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10)}.aggregate-result-actions{display:flex;justify-content:center;gap:10px;margin:14px auto 0}.aggregate-result-actions .button{width:160px;min-height:40px}.aggregate-result-actions .aggregate-destroy-btn{background:#d93025;color:#fff;border-color:#d93025}.aggregate-result-actions .aggregate-destroy-btn:hover{background:#b91c1c;color:#fff;box-shadow:0 0 0 2px rgba(217,48,37,.12)}.aggregate-result-qr{display:block;margin:16px auto 0;padding:12px;width:max-content;max-width:100%;box-sizing:border-box;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18)}.aggregate-copy-status{min-height:18px;margin:8px 0 0;text-align:center;font-size:13px;font-weight:700;color:transparent}.aggregate-copy-status.success{color:#2e7d32}.aggregate-copy-status.error{color:#c62828}.generated-links-panel{margin-top:14px}.generated-links-list{display:grid;gap:10px;margin-top:10px}.generated-link-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.generated-link-url{display:block;min-width:0;padding:11px 13px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere;line-height:1.45;text-decoration:none;box-sizing:border-box}.generated-link-url:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10)}.generated-link-destroy{width:84px;min-height:40px;background:#d93025!important;color:#fff!important;border-color:#d93025!important}.generated-link-destroy:hover{background:#b91c1c!important;box-shadow:0 0 0 2px rgba(217,48,37,.12)}
@media(prefers-color-scheme:dark){.native-picker{background:#111;color:#f1f1f1;border-color:rgba(255,255,255,.14)}.native-picker option{background:#1b1b1b;color:#f1f1f1}.current-api-input,.current-config-input{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.12)}.current-config-link{color:#64b5f6;background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.12)}.current-config-link:hover{color:#64b5f6;text-decoration:none;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}.status-item.ok{background:rgba(129,199,132,.1);color:#81c784;border-color:rgba(129,199,132,.2)}.status-item.bad{background:rgba(229,115,115,.1);color:#e57373;border-color:rgba(229,115,115,.2)}.status-item.wait{background:rgba(255,183,77,.1);color:#ffb74d;border-color:rgba(255,183,77,.2)}.custom-modal{background:rgba(30,30,30,.97);border-color:rgba(255,255,255,.1)}.aggregate-result-url{background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.12);color:#64b5f6}.aggregate-result-url:hover{color:#64b5f6;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}.aggregate-result-qr{background:#fff}.aggregate-result-close{color:#aaa}.aggregate-result-close:hover{background:rgba(255,255,255,.08);color:#fff}.aggregate-result-actions .aggregate-destroy-btn{background:#c62828;color:#fff;border-color:#c62828}.aggregate-result-actions .aggregate-destroy-btn:hover{background:#a61f1f}.aggregate-result-modal>#copyDirect{margin-top:16px}.aggregate-copy-status.success{color:#81c784}.aggregate-copy-status.error{color:#e57373}.generated-link-url{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.12)}.generated-link-url:hover{color:#64b5f6;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}}
</style>
</head>
<body>
<main class="page app-shell">
<header class="header home-hero">
<div class="hero-main"><h1 class="title">${esc(cfg.subName||'SUB')}</h1><div class="subtitle">生成一个专属于你的聚合订阅链接，适配Base64, Clash, Sing-box, Surge, Loon等常见格式</div></div>
<div class="backend-version-card"><div class="backend-version-label">后端版本</div><div class="backend-version-value" id="apiVersion">正在获取…</div></div>
</header>

<section class="panel"><h2 class="section-title">订阅链接</h2><div class="section-note">支持多个订阅地址，每行一个。</div><div class="field"><textarea id="sources" placeholder="https://example.com/subscribe&#10;https://example.com/another"></textarea></div></section>

<section class="panel">
<h2 class="section-title">订阅转换后端(SUBAPI)</h2><div class="section-note">选择一个订阅转换后端。</div>
<select class="native-picker" id="apiPicker" aria-label="选择订阅转换后端" data-default-id="${esc(apiId)}">
${apis.map(x=>`<option value="${esc(x.url)}" data-id="${esc(x.id)}" ${x.id===apiId?'selected':''}>${esc(x.name)}</option>`).join('')}
<option value="__custom">自定义</option>
</select>
<div class="current-box"><div class="current-title">当前配置</div><div class="current-row"><a id="apiCurrent" class="current-api-input current-config-link" href="${esc(apiCurrentValue)}" target="_blank" rel="noopener noreferrer">${esc(apiCurrentValue)||'请选择订阅转换后端'}</a><button type="button" class="button secondary edit-custom" id="editApiCustom">编辑</button></div></div>
<div class="status-box"><div class="status-title">可用状态</div><div id="apiStatus" class="status-list"><div class="status-item wait">⏳ 状态检测中</div></div></div>
</section>

<section class="panel">
<h2 class="section-title">订阅转换规则(SUBCONFIG)</h2><div class="section-note">选择一个订阅转换规则。</div>
<select class="native-picker" id="configPicker" aria-label="选择订阅转换规则" data-default-id="${esc(configId)}">
${configs.map(x=>`<option value="${esc(x.url)}" data-id="${esc(x.id)}" ${x.id===configId?'selected':''}>${esc(x.name)}</option>`).join('')}
<option value="__custom">自定义</option>
</select>
<div class="current-box"><div class="current-title">当前配置</div><div class="current-row"><a id="configCurrent" class="current-config-input current-config-link" href="${esc(configCurrentValue)}" target="_blank" rel="noopener noreferrer">${esc(configCurrentValue)||'请选择订阅转换规则'}</a><button type="button" class="button secondary edit-custom" id="editConfigCustom">编辑</button></div></div>
<div class="status-box"><div class="status-title">可用状态</div><div id="configStatus" class="status-list"><div class="status-item wait">⏳ 状态检测中</div></div></div>
</section>

<section class="panel"><h2 class="section-title">排除节点</h2><div class="section-note">公开使用。每行填写一个关键词，包含关键词的节点会被排除。</div><div class="field"><textarea id="noAds" placeholder="例如：t.me&#10;广告&#10;example.com">${esc(noAds)}</textarea></div></section>
<section class="panel"><h2 class="section-title">密钥</h2><div class="section-note">可选。用于在聚合订阅页面销毁本链接。填写后，销毁本链接时需要提供此密钥。</div><div class="field"><input id="destroyKey" type="password" autocomplete="new-password" placeholder="可选，设置用于销毁本链接的密钥"></div></section>
<button class="primary" id="generate" type="button">生成聚合订阅链接</button>
<section class="panel generated-links-panel" id="generatedLinksPanel" style="display:none"><h2 class="section-title">已生成的聚合订阅链接</h2><div class="section-note">根据本机浏览器缓存显示你生成过的链接。链接框可直接打开，销毁后链接将会失效。</div><div id="generatedLinksList" class="generated-links-list"></div></section>
</main>
<div id="aggregateResultModal" class="custom-modal-overlay aggregate-result-overlay"><div class="custom-modal aggregate-result-modal"><button type="button" class="aggregate-result-close" id="aggregateResultClose" aria-label="关闭">×</button><h3>聚合订阅链接</h3><p>二维码可直接扫码使用，复制下方订阅链接即可使用。销毁后链接将会失效。</p><a class="aggregate-result-url" id="direct" href="#" target="_blank" rel="noopener noreferrer"></a><div id="aggregateResultQr" class="aggregate-result-qr"></div><div class="aggregate-result-actions"><button type="button" class="button" id="copyDirect">复制</button><button type="button" class="button aggregate-destroy-btn" id="destroyDirect">销毁</button></div><div id="aggregateCopyStatus" class="aggregate-copy-status" aria-live="polite"></div></div></div><div id="aggregateCopyNotice" class="toast"></div>

<div id="customApiModal" class="custom-modal-overlay"><div class="custom-modal"><h3>自定义订阅转换后端</h3><p>输入你自己的 SUBAPI 地址。</p><input id="customApiInput" placeholder="https://subapi.example.com"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelApiCustom">取消</button><button type="button" class="button" id="saveApiCustom">保存</button></div></div></div>
<div id="customConfigModal" class="custom-modal-overlay"><div class="custom-modal"><h3>自定义订阅转换规则</h3><p>输入你自己的 SUBCONFIG 地址。</p><input id="customConfigInput" placeholder="https://example.com/config.ini"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelConfigCustom">取消</button><button type="button" class="button" id="saveConfigCustom">保存</button></div></div></div>

<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
<script src="/__cfsubs.js" defer></script>
</body></html>`;
}
function getSubUIStyles(){return getToolStyles()+`
.page{width:100%;max-width:1240px;margin:24px auto 40px;padding:0 28px 34px;border:1px solid rgba(255,255,255,.62);border-radius:28px;background:rgba(255,255,255,.34);box-shadow:0 14px 45px rgba(50,70,90,.08);overflow:hidden}
.app-shell{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.header{margin:0 -28px 18px;padding:28px 28px 24px;border-bottom:1px solid rgba(120,130,140,.18)}.home-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,520px);gap:28px;align-items:stretch}.hero-main{min-width:0;min-height:132px;height:132px;display:flex;flex-direction:column;align-items:flex-start}.title{margin:0;font-size:52px;font-weight:800;line-height:1.08;letter-spacing:-1.5px}.subtitle{margin-top:auto;padding-top:12px;font-size:14px;line-height:1.5;color:#687384;word-break:keep-all;overflow-wrap:normal;hyphens:none}.backend-version-card{min-height:132px;padding:28px 34px;border:1px solid rgba(255,255,255,.62);border-radius:28px;background:rgba(255,255,255,.58);box-shadow:0 8px 30px rgba(50,70,90,.06);box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}.backend-version-label{font-size:13.5px;line-height:1.3;color:#69717d;margin-bottom:10px}.backend-version-value{font-size:19px;line-height:1.25;font-weight:750;word-break:break-word;overflow-wrap:anywhere;color:#111}
.app-shell>.panel:first-of-type{margin-top:0}
@media(max-width:900px){.page{max-width:760px;margin:14px auto 28px;padding:0 18px 28px;border-radius:22px}.header{margin:0 -18px 16px;padding:22px 18px 20px}.home-hero{grid-template-columns:1fr;gap:18px}.hero-main{min-height:auto}.title{font-size:40px;letter-spacing:-.9px}.subtitle{margin-top:14px;padding-top:0;font-size:11px;word-break:keep-all;overflow-wrap:normal;hyphens:none}.backend-version-card{min-height:108px;padding:22px 24px;border-radius:22px}.backend-version-label{font-size:12.5px;margin-bottom:7px}.backend-version-value{font-size:16px}}
.panel{margin-top:12px}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.checks{display:grid;gap:8px}.check{display:grid;grid-template-columns:18px minmax(0,1fr);align-items:center;gap:8px;margin:0;padding:10px;border:1px solid rgba(229,229,223,.6);border-radius:10px;background:rgba(255,255,255,.5);cursor:pointer}
.check input{width:18px;height:18px;margin:0}.check span{font-weight:600}.check small{grid-column:2;color:#888;font-size:12px;word-break:break-all;overflow-wrap:anywhere}
.primary{width:100%;min-height:42px;margin-top:12px}.result-panel[hidden]{display:none}.result-label{margin-top:12px;margin-bottom:6px;font-size:12px;font-weight:600;color:#666}.result-url{padding:10px;border:1px solid rgba(229,229,223,.8);border-radius:8px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere}
@media(max-width:600px){.aggregate-result-modal{width:calc(100vw - 40px)}.aggregate-result-actions{gap:8px}.aggregate-result-actions .button{width:calc(50% - 4px)}.row{grid-template-columns:1fr}.generated-link-row{grid-template-columns:minmax(0,1fr) 76px}.generated-link-destroy{width:76px;padding-left:8px;padding-right:8px}.page.app-shell{width:calc(100% - 28px);margin-left:14px;margin-right:14px}}
@media(prefers-color-scheme:dark){body{background:#000;background-image:radial-gradient(circle at 0% 28%,rgba(0,188,212,.18),transparent 24%),radial-gradient(circle at 100% 100%,rgba(0,120,70,.22),transparent 32%),linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%);background-attachment:fixed;color:#f4f7f8}.page.app-shell{background:linear-gradient(135deg,rgba(1,5,6,.98) 0%,rgba(2,10,10,.96) 48%,rgba(0,54,35,.92) 100%);border-color:rgba(255,255,255,.13);box-shadow:0 20px 70px rgba(0,0,0,.55)}.header{border-bottom-color:rgba(255,255,255,.10)}.title{color:#fff}.subtitle{color:#9aa7b5}.backend-version-card{background:linear-gradient(135deg,rgba(4,10,14,.98) 0%,rgba(3,18,20,.98) 48%,rgba(0,65,42,.94) 100%);border-color:rgba(255,255,255,.16);box-shadow:0 12px 36px rgba(0,40,25,.28)}.backend-version-label{color:#91a0ae}.backend-version-value{color:#fff}.panel{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.10)}.section-note{color:#9aa7b5}.field input,.field textarea,.native-picker,.current-api-input,.current-config-input,.current-config-link{background:rgba(2,6,8,.82);border-color:rgba(255,255,255,.13);color:#f3f6f7}.native-picker option{background:#0b1012;color:#f3f6f7}.check{background:rgba(15,22,24,.7);border-color:rgba(255,255,255,.10)}.check small{color:#8e9aa6}.result-label{color:#aab4be}.result-url{background:rgba(2,6,8,.72);color:#64b5f6;border-color:rgba(255,255,255,.12)}}
`;}


async function listJsonManagerItems(env, query = '') {
    if (!env.KV) return [];
    const keyword = String(query || '').trim().toLowerCase();
    const result = [];
    let cursor;
    do {
        const page = await env.KV.list({
            prefix: URL_PREFIX,
            ...(cursor ? { cursor } : {})
        });
        const values = await Promise.all(page.keys.map(async key => {
            const token = key.name.slice(URL_PREFIX.length);
            const raw = await env.KV.get(key.name);
            if (!raw) return null;
            if (keyword && !raw.toLowerCase().includes(keyword) && !token.toLowerCase().includes(keyword)) return null;
            let item = null;
            try { item = JSON.parse(raw); } catch (e) {}
            return {
                token,
                subscriptionUrl: item?.subscriptionUrl || '',
                createdAt: item?.createdAt || '',
                updatedAt: item?.updatedAt || '',
                name: item?.name || '订阅链接',
                raw
            };
        }));
        for (const item of values) if (item) result.push(item);
        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    result.sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || a.token.localeCompare(b.token));
    return result;
}

function renderJsonManagerPage(url, env, adminPath) {
    const backPath = `/${encodeURIComponent(adminPath)}`;
    const pagePath = `/${encodeURIComponent(adminPath)}/json`;
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JSON 管理 · ${escapeHTML(FileName || 'SUB')}</title>${SiteLogo ? `<link rel="icon" href="${escapeHTML(SiteLogo)}">` : ''}<style>
${getToolStyles()}
body{min-height:100vh}.json-shell{max-width:1120px;padding-top:34px!important;padding-bottom:40px}.json-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.json-title{font-size:28px;font-weight:800;line-height:1.2}.json-actions{display:flex;gap:8px;flex-wrap:wrap}.json-actions .button{min-width:86px}.json-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center}.json-toolbar input{height:42px}.json-toolbar .button{height:42px;white-space:nowrap}.json-danger-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin-top:12px}.json-danger-row input{height:42px}.json-stat{font-size:15px;font-weight:700}.json-list{display:grid;gap:12px;margin-top:14px}.json-item{border:1px solid rgba(120,120,120,.2);border-radius:16px;padding:16px;background:rgba(255,255,255,.58)}.json-item-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.json-item-main{min-width:0}.json-item-title{font-weight:750;margin-bottom:6px}.json-item-url{display:block;color:#2563eb;word-break:break-all;overflow-wrap:anywhere;text-decoration:none;line-height:1.5}.json-item-url:hover{text-decoration:underline}.json-item-meta{font-size:12px;color:#777;margin-top:8px}.json-item-actions{display:flex;gap:8px;flex-wrap:wrap}.json-item-actions button{white-space:nowrap}.json-preview{display:none;margin-top:12px;max-height:360px;overflow:auto;border-radius:12px;padding:12px;background:rgba(10,15,17,.94);color:#d9f7e8;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;white-space:pre-wrap;word-break:break-all}.json-item.open .json-preview{display:block}.json-empty{padding:30px;text-align:center;color:#888}.json-confirm-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:3000;padding:20px}.json-confirm{width:min(460px,100%);background:rgba(255,255,255,.96);border-radius:20px;padding:22px;box-shadow:0 20px 70px rgba(0,0,0,.28)}.json-confirm h3{margin:0 0 8px}.json-confirm p{margin:0;color:#666;line-height:1.6}.json-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.json-confirm .danger{background:#d93025;color:#fff;border-color:#d93025}@media(max-width:720px){.json-toolbar{grid-template-columns:1fr}.json-danger-row{grid-template-columns:1fr}.json-item-head{flex-direction:column}.json-item-actions{width:100%}.json-item-actions .button{flex:1}.json-shell{width:calc(100% - 28px);margin:14px auto}.json-header{gap:12px}.json-actions{width:100%}.json-actions .button{flex:1}}@media(prefers-color-scheme:dark){.json-item{background:rgba(8,12,14,.8);border-color:rgba(255,255,255,.1)}.json-item-meta{color:#9aa7b5}.json-confirm{background:rgba(18,23,25,.98);color:#fff}.json-confirm p{color:#aeb8c1}}
</style></head><body><main class="page app-shell json-shell">
<header class="header json-header"><div><div class="json-title">JSON 管理</div><div class="subtitle">管理所有已经生成的聚合订阅链接。删除后对应链接将立即失效且无法恢复。</div></div><div class="json-actions"><a class="button secondary" href="${backPath}">返回后台</a><a class="button secondary" href="${pagePath}">刷新</a></div></header>
<section class="panel"><div class="json-toolbar"><input id="jsonSearch" placeholder="搜索 JSON 关键字、域名、Token……"><button type="button" class="button" id="jsonSearchBtn">搜索</button><div class="json-stat" id="jsonStat">加载中…</div></div><div class="json-danger-row"><input id="jsonKeyword" placeholder="输入 JSON 关键字后批量删除，例如 example.com"><button type="button" class="button danger" id="jsonKeywordDelete">按关键字批量删除</button></div></section>
<section class="panel"><div class="json-toolbar" style="grid-template-columns:minmax(0,1fr) auto"><div><h2 class="section-title" style="margin:0">全部聚合订阅 JSON</h2><div class="section-note">搜索会匹配 JSON 原文，因此 URL、规则、节点源、NOADS 等字段都可以搜索。</div></div><button type="button" class="button danger" id="jsonDeleteAll">全部删除</button></div><div id="jsonList" class="json-list"></div></section>
</main>
<div id="jsonConfirmOverlay" class="json-confirm-overlay"><div class="json-confirm"><h3 id="jsonConfirmTitle">确认操作</h3><p id="jsonConfirmText"></p><div class="json-confirm-actions"><button type="button" class="button secondary" id="jsonConfirmCancel">取消</button><button type="button" class="button danger" id="jsonConfirmOk">确认删除</button></div></div></div>
<script>
(function(){
'use strict';
var listEl=document.getElementById('jsonList'),statEl=document.getElementById('jsonStat'),searchEl=document.getElementById('jsonSearch'),keywordEl=document.getElementById('jsonKeyword'),overlay=document.getElementById('jsonConfirmOverlay'),confirmTitle=document.getElementById('jsonConfirmTitle'),confirmText=document.getElementById('jsonConfirmText'),pending=null;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function post(data){return fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(data)}).then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||('操作失败（HTTP '+r.status+'）'));return d})})}
function ask(title,text,fn){confirmTitle.textContent=title;confirmText.textContent=text;pending=fn;overlay.style.display='flex'}
function closeConfirm(){overlay.style.display='none';pending=null}
document.getElementById('jsonConfirmCancel').onclick=closeConfirm;document.getElementById('jsonConfirmOk').onclick=function(){if(!pending)return;var fn=pending;pending=null;overlay.style.display='none';fn()};overlay.onclick=function(e){if(e.target===overlay)closeConfirm()};document.addEventListener('keydown',function(e){if(e.key==='Escape')closeConfirm()});
function render(items){statEl.textContent='共 '+items.length+' 个';if(!items.length){listEl.innerHTML='<div class="json-empty">没有找到聚合订阅 JSON。</div>';return}listEl.innerHTML=items.map(function(x,i){var pretty=x.raw;try{pretty=JSON.stringify(JSON.parse(x.raw),null,2)}catch(e){}return '<article class="json-item" data-token="'+esc(x.token)+'"><div class="json-item-head"><div class="json-item-main"><div class="json-item-title">'+esc(x.name||'订阅链接')+' · '+esc(x.token)+'</div><a class="json-item-url" href="'+esc(x.subscriptionUrl||('/'+x.token))+'" target="_blank" rel="noopener noreferrer">'+esc(x.subscriptionUrl||('/'+x.token))+'</a><div class="json-item-meta">创建：'+esc(x.createdAt||'未知')+'　更新：'+esc(x.updatedAt||'未知')+'</div></div><div class="json-item-actions"><button type="button" class="button secondary json-view-btn">查看 JSON</button><button type="button" class="button danger json-delete-btn">删除</button></div></div><pre class="json-preview">'+esc(pretty)+'</pre></article>'}).join('');Array.prototype.forEach.call(document.querySelectorAll('.json-view-btn'),function(btn){btn.onclick=function(){btn.closest('.json-item').classList.toggle('open');btn.textContent=btn.closest('.json-item').classList.contains('open')?'隐藏 JSON':'查看 JSON'}});Array.prototype.forEach.call(document.querySelectorAll('.json-delete-btn'),function(btn){btn.onclick=function(){var item=btn.closest('.json-item'),token=item.getAttribute('data-token');ask('删除这个聚合订阅？','删除后链接将立即失效且无法恢复。',function(){post({type:'json_delete',token:token}).then(load).catch(function(e){alert(e.message||'删除失败')})})}})}
function load(){var q=searchEl.value.trim();statEl.textContent='加载中…';post({type:'json_list',query:q}).then(function(d){render(d.items||[])}).catch(function(e){statEl.textContent='加载失败';alert(e.message||'加载失败')})}
document.getElementById('jsonSearchBtn').onclick=load;searchEl.addEventListener('keydown',function(e){if(e.key==='Enter')load()});document.getElementById('jsonDeleteAll').onclick=function(){ask('删除全部聚合订阅？','这会删除当前 KV 中所有聚合订阅 JSON，所有对应链接都会立即失效且无法恢复。',function(){post({type:'json_delete_all'}).then(load).catch(function(e){alert(e.message||'删除失败')})})};document.getElementById('jsonKeywordDelete').onclick=function(){var k=keywordEl.value.trim();if(!k)return alert('请输入 JSON 关键字');ask('按关键字批量删除？','将删除 JSON 原文中包含“'+k+'”的所有聚合订阅链接，删除后无法恢复。',function(){post({type:'json_delete_keyword',keyword:k}).then(function(d){alert('已删除 '+(d.deleted||0)+' 个链接');load()}).catch(function(e){alert(e.message||'批量删除失败')})})};load();
})();
</script></body></html>`;
}

function renderAdminPage(url,env,settings){
    const apis=normalizeProviderList(settings.subApis),configs=normalizeProviderList(settings.subConfigs);
    
    const esc=x=>escapeHTML(String(x??''));
    const defaultApiId=String(settings.defaultSubApiId||'');
    const defaultConfigId=String(settings.defaultSubConfigId||'');
    const rows=(list,type,empty)=>list.length?list.map(x=>{
        return `<div class="link-item provider-item" draggable="true" data-provider-id="${esc(x.id)}">
        <div class="drag-handle" title="拖动排序" aria-label="拖动排序">⠿</div>
        <div class="provider-main">
            <div class="link-label">${esc(x.name)}</div>
            <a class="provider-url link-url" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a>
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
.admin-shell{max-width:1100px;padding-top:40px!important;padding-bottom:34px}.admin-shell>.topbar{margin-bottom:18px}.admin-shell>.panel{margin-top:12px}.admin-shell>.panel:first-of-type{margin-top:0}.admin-shell .topbar{padding-bottom:24px}
.sub-head{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:start;gap:14px}.sub-head .section-title{white-space:nowrap;font-size:16px;line-height:40px;margin:0}.sub-head-actions{display:grid;grid-template-columns:270px 190px;align-items:center;justify-content:end;gap:10px;width:100%}.default-provider-select{width:270px;min-width:270px;height:40px;padding:0 30px 0 12px;border:1px solid rgba(120,120,120,.45);border-radius:9px;background:rgba(255,255,255,.7);color:inherit;font-size:14px;font-weight:600;cursor:pointer;box-sizing:border-box}.default-provider-select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.18);width:max-content;min-width:270px;max-width:calc(100vw - 40px)}.sub-head-actions>button{width:190px;min-width:190px;height:40px;white-space:nowrap;word-break:keep-all;overflow:hidden;text-overflow:clip;font-size:14px}.provider-main{min-width:0;width:100%;position:relative;z-index:1}.provider-url{display:block;width:100%;margin-top:6px;margin-bottom:0;word-break:break-all;overflow-wrap:anywhere;line-height:1.55}.provider-item{position:relative;padding:12px 104px 12px 42px;cursor:grab;transition:opacity .15s ease,transform .15s ease,box-shadow .15s ease}.provider-item:active{cursor:grabbing}.provider-item.dragging{opacity:.55}.provider-item.drag-over{box-shadow:inset 0 0 0 2px rgba(59,130,246,.45)}.drag-handle{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:22px;line-height:1;color:#8a8a8a;letter-spacing:-3px;user-select:none;cursor:grab;touch-action:none}.admin-row-actions{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:7px;margin-top:0;align-items:stretch;z-index:2}.admin-row-actions button{min-width:68px}.provider-list.saving-order{opacity:.75;pointer-events:none}.empty{font-size:12px;color:#888}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.topbar-main{min-width:0;flex:1}.site-title-display{font-size:28px;font-weight:700;line-height:1.2;color:#1a1a1a}.site-title-input{font-size:15px!important}.site-title-input:focus{box-shadow:none!important}.top-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.top-actions .button{min-width:86px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px}.modal-content{width:min(460px,100%);background:rgba(255,255,255,.95);border-radius:20px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.5)}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}@media(max-width:760px){.sub-head{grid-template-columns:1fr;gap:8px}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 190px}.default-provider-select{width:100%;min-width:0;font-size:14px}.default-provider-select:focus{width:max-content;min-width:0;max-width:100%}}@media(max-width:600px){.admin-shell{width:calc(100% - 28px);margin-left:14px;margin-right:14px;padding-top:34px!important}.top-actions{width:100%;justify-content:stretch}.top-actions .button{flex:1}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 170px}.default-provider-select{width:100%;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:10px;padding-right:24px}.default-provider-select:focus{width:100%;min-width:0;max-width:100%;font-size:12px}.sub-head-actions>button{width:170px;min-width:170px;white-space:nowrap}.provider-item{padding:12px 12px 12px 38px;display:block}.provider-main{width:100%;padding-right:0}.provider-url{width:100%;margin-top:7px;line-height:1.5}.admin-row-actions{position:static;display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:10px}.admin-row-actions button{width:100%;min-width:0;height:40px}.drag-handle{left:10px;top:18px;transform:none;font-size:20px}.modal-content{padding:20px}}.json-count-panel{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:18px}.json-count-main{min-width:0}.json-count-main .section-title{margin-bottom:4px}.json-count-value{grid-column:2;font-size:26px;font-weight:800;white-space:nowrap;text-align:center}.json-count-view{grid-column:3;justify-self:end;min-width:92px;text-align:center;text-decoration:none}.json-count-panel>.json-count-main{grid-column:1}.json-count-panel>.json-count-view{grid-column:3}@media(max-width:600px){.json-count-panel{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px}.json-count-main{min-width:0}.json-count-value{font-size:22px}.json-count-view{min-width:76px;padding-left:12px;padding-right:12px}}@media(prefers-color-scheme:dark){.site-title-display{color:#f5f5f5}.site-title-input{color:#f5f5f5!important}.default-provider-select{background:rgba(30,30,30,.92);border-color:rgba(255,255,255,.18);color:#fff}.modal-content{background:rgba(30,30,30,.96);border-color:rgba(255,255,255,.1)}.empty{color:#aaa}body{background:#000;background-image:radial-gradient(circle at 0% 28%,rgba(0,188,212,.14),transparent 24%),radial-gradient(circle at 100% 100%,rgba(0,120,70,.18),transparent 32%),linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%);background-attachment:fixed;color:#f4f7f8}.page.admin-shell{background:linear-gradient(135deg,rgba(1,5,6,.98) 0%,rgba(2,10,10,.96) 48%,rgba(0,54,35,.92) 100%);border-color:rgba(255,255,255,.13);box-shadow:0 20px 70px rgba(0,0,0,.55)}.admin-shell .header{border-bottom-color:rgba(255,255,255,.10)}.admin-shell .site-title-display,.admin-shell .section-title,.admin-shell label{color:#fff}.admin-shell .subtitle,.admin-shell .empty{color:#9aa7b5}.admin-shell .provider-item{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.10)}.admin-shell .provider-url{color:#64b5f6}.admin-shell .default-provider-select,.admin-shell input{background:rgba(2,6,8,.82);border-color:rgba(255,255,255,.13);color:#f3f6f7}.admin-shell .modal-content{background:rgba(12,17,19,.97);border-color:rgba(255,255,255,.12);color:#fff}}</style></head><body><main class="page app-shell admin-shell">
<header class="header topbar"><div class="topbar-main"><div class="site-title-display">${esc(settings.subName||'SUB')}</div><div class="subtitle">管理订阅转换后端、订阅转换规则和站点安全设置。</div></div><div class="top-actions"><button type="button" class="button secondary" data-open-modal="securityModal">安全</button><button type="button" class="button secondary" data-open-modal="siteModal">站点</button><a class="button danger" href="/${esc(settings.adminPath||'admin')}/logout">退出</a></div></header>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">订阅转换后端(SUBAPI)</h2></div><div class="sub-head-actions">${defaultSelect(apis,'subapi',defaultApiId)}<button type="button" data-provider-action="add" data-provider-type="subapi">＋ 添加订阅转换后端</button></div></div><div class="sub-grid provider-list" data-provider-type="subapi" style="margin-top:12px">${rows(apis,'subapi','暂无订阅转换后端，请手动添加。')}</div></section>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">订阅转换规则(SUBCONFIG)</h2></div><div class="sub-head-actions">${defaultSelect(configs,'subconfig',defaultConfigId)}<button type="button" data-provider-action="add" data-provider-type="subconfig">＋ 添加订阅转换规则</button></div></div><div class="sub-grid provider-list" data-provider-type="subconfig" style="margin-top:12px">${rows(configs,'subconfig','暂无订阅转换规则，请手动添加。')}</div></section>
<section class="panel json-count-panel"><div class="json-count-main"><h2 class="section-title">聚合订阅链接</h2><div class="section-note">管理当前 KV 中已经生成的聚合订阅 JSON。</div></div><div class="json-count-value" id="jsonCountValue">加载中…</div><a class="button json-count-view" href="/${esc(settings.adminPath||'admin')}/json">查看</a></section>
</main>
<div id="providerModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title" id="modalTitle">添加</h2><div class="field"><label for="modalName">备注</label><input id="modalName"></div><div class="field"><label for="modalUrl">URL</label><input id="modalUrl" placeholder="https://..."></div><div class="modal-actions"><button type="button" class="secondary" id="providerCancel">取消</button><button type="button" id="modalSave">保存</button></div></div></div>
<div id="securityModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">安全</h2><div class="section-note">修改管理员账号和密码。修改密码时必须输入两次；两次留空表示保持原密码。</div><div class="field"><label for="securityUser">管理员账号</label><input id="securityUser" value="${esc(settings.user||'')}" autocomplete="username"></div><div class="field"><label for="securityPass">管理员密码</label><input id="securityPass" type="password" placeholder="留空保持原密码" autocomplete="new-password"></div><div class="field"><label for="securityPass2">确认管理员密码</label><input id="securityPass2" type="password" placeholder="再次输入新密码" autocomplete="new-password"></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="securityModal">取消</button><button type="button" id="saveSecurity">保存</button></div></div></div>
<div id="siteModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">站点</h2><div class="field"><label for="siteName">站点标题</label><input id="siteName" value="${esc(settings.subName||'SUB')}" placeholder="SUB"></div><div class="field"><label for="sitePath">管理员路径</label><input id="sitePath" value="${esc(settings.adminPath||'admin')}" placeholder="admin"></div><div class="field"><label for="siteLogo">全站 Logo 地址</label><input id="siteLogo" value="${esc(settings.siteLogo||'')}" placeholder="https://example.com/favicon.png" type="url"><div class="section-note">支持 http:// 或 https:// 直链；留空则不设置。此 Logo 会用于全站标签栏。</div></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="siteModal">取消</button><button type="button" id="saveSite">保存</button></div></div></div>
<script>document.addEventListener('DOMContentLoaded',function(){fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({type:'json_list',query:''})}).then(function(r){return r.json()}).then(function(d){var e=document.getElementById('jsonCountValue');if(e)e.textContent=d&&d.ok?String(d.count||0)+' 个':'读取失败'}).catch(function(){var e=document.getElementById('jsonCountValue');if(e)e.textContent='读取失败'})});</script><script src="/__cfsubs.js" defer></script></body></html>`;
}
