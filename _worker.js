var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _worker.js
var mytoken = "SUB-UI";
var FileName = "SUB";
var SiteLogo = "";
var SUBUpdateTime = 6;
var total = 99;
var timestamp = 41023296e5;
var subConverter = "";
var subConfig = "";
var subProtocol = "https";
var config_noAds = "";
var fakeMode = "";
var fakeUrl = "";
var fakeUrl302 = "";
var fakeCode = "";
var SUB_PREFIX = "SUB:";
var URL_PREFIX = "URL:";
var ID_CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefghijkmnpqrstwxyz2345678";
var DEFAULT_ADMIN_PATH = "admin";
var worker_default = {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error("SUB-UI request error:", error);
      return new Response("SUB-UI Worker Error: " + (error?.message || String(error)), {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
  }
};
var CF_SUBS_CLIENT_SCRIPT = String.raw`
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
function syncGeneratedLinks(){
 var list=generatedLinks();if(!list.length)return Promise.resolve();
 var tokens=list.map(function(item){return String(item&&item.token||'').trim()}).filter(Boolean);
 if(!tokens.length)return Promise.resolve();
 return fetch('/api/generated-links/check',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify({tokens:tokens})})
 .then(function(r){return r.json().then(function(d){return {r:r,d:d}})})
 .then(function(x){
   if(!x.r.ok||!x.d.ok)return;
   var valid={};(Array.isArray(x.d.tokens)?x.d.tokens:[]).forEach(function(token){valid[String(token||'').trim()]=true});
   var next=list.filter(function(item){return valid[String(item&&item.token||'').trim()]});
   if(next.length!==list.length){saveGeneratedLinks(next);renderGeneratedLinks()}
 })
 .catch(function(){});
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
 var custom=picker.value==='__custom',value=currentValue(kind);current.textContent=value||('暂无'+(api?'订阅转换后端':'订阅转换规则')+'，请编辑');if(!api){current.style.height='42px';var contentHeight=current.scrollHeight;if(contentHeight>52)current.style.height=contentHeight+'px'}if(value){current.href=value;current.target='_blank';current.style.pointerEvents='auto';current.style.cursor='pointer'}else{current.removeAttribute('href');current.removeAttribute('target');current.style.pointerEvents='none';current.style.cursor='default'}
 if(edit){edit.style.display=custom?'inline-flex':'none';edit.hidden=!custom}
 if(!api){current.style.height='auto';current.style.height=Math.max(42,Math.min(260,current.scrollHeight))+'px'}
}
function setStatus(id,html){var el=$(id);if(el)el.innerHTML=html}
function statusText(kind,info,ok){
 if(ok){if(kind==='api'){var version=String((info&&info.version)||'').trim();return '✅ SUBAPI状态正常'+(version?' ('+esc(version)+')':'')}return '✅ SUBCONFIG状态正常'}
 return kind==='api'?'❌ SUBAPI状态异常':'❌ SUBCONFIG状态异常'
}
var statusTimers={};
function scheduleStatus(kind,delay){
 if(statusTimers[kind])window.clearTimeout(statusTimers[kind]);
 statusTimers[kind]=window.setTimeout(function(){statusTimers[kind]=null;checkStatus(kind,false)},delay);
}
function checkStatus(kind,showLoading){
 var api=kind==='api',value=currentValue(kind),id=api?'apiStatus':'configStatus';
 if(api&&!value){var ver=$('apiVersion');if(ver)ver.textContent='未选择 SUBAPI'}
 if(!value){setStatus(id,'<div class="status-item bad">'+statusText(kind,null,false)+'</div>');return}
 if(showLoading)setStatus(id,'<div class="status-item wait">⏳ 状态检测中</div>');
 var query=api?'/api/status?api='+encodeURIComponent(value):'/api/status?config='+encodeURIComponent(value);
 fetch(query,{cache:'no-store',headers:{Accept:'application/json'}}).then(function(r){return r.json().then(function(d){return {r:r,d:d}})}).then(function(x){
 var info=api?x.d.api:x.d.config,ok=Boolean(x.r.ok&&x.d.ok&&info&&info.ok);
  if(api){var ver=$('apiVersion');if(ver)ver.textContent=ok&&info&&info.version?String(info.version).trim():'无法获取版本'}
  var current=$(api?'apiCurrent':'configCurrent');if(current){if(ok){current.style.pointerEvents='auto';current.style.cursor='pointer'}else{current.removeAttribute('href');current.removeAttribute('target');current.style.pointerEvents='none';current.style.cursor='default'}}
  setStatus(id,'<div class="status-item '+(ok?'ok':'bad')+'">'+statusText(kind,info,ok)+'</div>');scheduleStatus(kind,ok?60000:10000)
 }).catch(function(){
  if(api){var ver=$('apiVersion');if(ver)ver.textContent='无法获取版本'}
  var current=$(api?'apiCurrent':'configCurrent');if(current){current.removeAttribute('href');current.removeAttribute('target');current.style.pointerEvents='none';current.style.cursor='default'}
  setStatus(id,'<div class="status-item bad">'+(api?'❌ SUBAPI检测失败':'❌ SUBCONFIG检测失败')+'</div>');scheduleStatus(kind,10000)
 });
}
function onPickerChange(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');if(!picker)return;
 if(picker.value==='__custom'){var input=$(api?'customApiInput':'customConfigInput');if(input)input.value=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;var modal=$(api?'customApiModal':'customConfigModal');if(modal)modal.style.display='flex';if(input)setTimeout(function(){input.focus()},0);updateCurrent(kind);return}
 if(api){PUBLIC_STATE.apiId=currentId('api');PUBLIC_STATE.apiCustom=false;PUBLIC_STATE.apiUrl=''}else{PUBLIC_STATE.configId=currentId('config');PUBLIC_STATE.configCustom=false;PUBLIC_STATE.configUrl=''}
 updateCurrent(kind);checkStatus(kind,true)
}
function openCustom(kind){var api=kind==='api',input=$(api?'customApiInput':'customConfigInput'),modal=$(api?'customApiModal':'customConfigModal');if(input)input.value=api?PUBLIC_STATE.apiUrl:PUBLIC_STATE.configUrl;if(modal)modal.style.display='flex';if(input)setTimeout(function(){input.focus()},0)}
function cancelCustom(kind){
 var api=kind==='api',picker=$(api?'apiPicker':'configPicker');
 if(api){PUBLIC_STATE.apiCustom=false;PUBLIC_STATE.apiUrl=''}else{PUBLIC_STATE.configCustom=false;PUBLIC_STATE.configUrl=''}
 var defaultId=picker&&picker.dataset?picker.dataset.defaultId:'';var option=null;if(picker){for(var i=0;i<picker.options.length;i++){if(String(picker.options[i].dataset.id||'')===String(defaultId)){option=picker.options[i];break}}if(!option&&picker.options.length)option=picker.options[0];}
 if(option){picker.value=option.value;if(api)PUBLIC_STATE.apiId=String(option.dataset.id||'');else PUBLIC_STATE.configId=String(option.dataset.id||'')}
 var modal=$(api?'customApiModal':'customConfigModal');if(modal)modal.style.display='none';updateCurrent(kind);checkStatus(kind,true)
}
function saveCustom(kind){
 var api=kind==='api',input=$(api?'customApiInput':'customConfigInput'),value=input?input.value.trim():'';if(api&&!/^https?:\/\//i.test(value))value='https://'+value;if(!/^https?:\/\//i.test(value)){alert('URL 必须以 http:// 或 https:// 开头');return}
 if(api){PUBLIC_STATE.apiUrl=value;PUBLIC_STATE.apiCustom=true;PUBLIC_STATE.apiId='';$('apiPicker').value='__custom'}else{PUBLIC_STATE.configUrl=value;PUBLIC_STATE.configCustom=true;PUBLIC_STATE.configId='';$('configPicker').value='__custom'}
 var modal=$(api?'customApiModal':'customConfigModal');if(modal)modal.style.display='none';updateCurrent(kind);checkStatus(kind,true)
}
function randomLinkPath(){
 try{if(crypto&&crypto.randomUUID)return crypto.randomUUID()}catch(e){}
 return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})
}
function initPublic(){
 if(window.__CF_SUBS_PUBLIC_READY)return;window.__CF_SUBS_PUBLIC_READY=true;
 var ap=$('apiPicker'),cp=$('configPicker');
 var editNoAds=$('editNoAds'),noAdsField=$('noAdsField');
 if(editNoAds&&noAdsField)editNoAds.addEventListener('click',function(){var expanded=noAdsField.style.display!=='none';noAdsField.style.display=expanded?'none':'block';editNoAds.textContent=expanded?'编辑':'隐藏';if(!expanded){var input=$('noAds');if(input)input.focus()}});
 var randomPath=$('randomLinkPath'),pathInput=$('linkPath');if(randomPath&&pathInput)randomPath.addEventListener('click',function(){pathInput.value=randomLinkPath();pathInput.focus()});
 if(ap){PUBLIC_STATE.apiId=currentId('api');ap.addEventListener('change',function(){onPickerChange('api')})}
 if(cp){PUBLIC_STATE.configId=currentId('config');cp.addEventListener('change',function(){onPickerChange('config')})}
 var e=$('editApiCustom');if(e)e.addEventListener('click',function(){openCustom('api')});e=$('editConfigCustom');if(e)e.addEventListener('click',function(){openCustom('config')});
 e=$('cancelApiCustom');if(e)e.addEventListener('click',function(){cancelCustom('api')});e=$('cancelConfigCustom');if(e)e.addEventListener('click',function(){cancelCustom('config')});
 e=$('saveApiCustom');if(e)e.addEventListener('click',function(){saveCustom('api')});e=$('saveConfigCustom');if(e)e.addEventListener('click',function(){saveCustom('config')});
 updateCurrent('api');updateCurrent('config');checkStatus('api',true);checkStatus('config',true);renderGeneratedLinks();
 window.addEventListener('focus',syncGeneratedLinks);
 document.addEventListener('visibilitychange',function(){if(!document.hidden)syncGeneratedLinks()});
 function renderAggregateQr(value){var q=$('aggregateResultQr');if(!q||!value)return;var draw=function(){if(!window.QRCode)return false;q.innerHTML='';q.style.display='block';try{new QRCode(q,{text:value,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.Q});return true}catch(err){q.innerHTML='';return false}};if(draw())return;var src='https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js';var script=document.querySelector('script[src="'+src+'"]');if(!script){script=document.createElement('script');script.src=src;script.onload=function(){draw()};document.head.appendChild(script)}else{var timer=window.setInterval(function(){if(draw())window.clearInterval(timer)},100);window.setTimeout(function(){window.clearInterval(timer)},5000)}}
function resetAggregateResult(){var q=$('aggregateResultQr');if(q){q.innerHTML='';q.style.display='block'}var b=$('copyDirect');if(b){b.textContent='复制';b.disabled=false}var d=$('destroyDirect');if(d){d.textContent='销毁';d.disabled=false}var status=$('aggregateCopyStatus');if(status){status.textContent='';status.className='aggregate-copy-status'}}
 e=$('copyDirect');if(e)e.addEventListener('click',function(){var a=$('direct'),v=a?a.textContent.trim():'';var done=function(){e.textContent='已复制';aggregateNotice('已复制');window.setTimeout(function(){if(e)e.textContent='复制'},1600)};var fail=function(){aggregateNotice('复制失败，请手动复制',true)};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(done).catch(fail);else{var ta=document.createElement('textarea');ta.value=v;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(err){fail()}ta.remove()}});e=$('destroyDirect');if(e)e.addEventListener('click',function(){var token=tokenFromSubscriptionUrl(($('direct')||{}).href||'');var key=String(CURRENT_DESTROY_KEY||'');destroyGeneratedLink(token,e,true,key,false)});e=$('aggregateResultClose');if(e)e.addEventListener('click',closeAggregateResult);var rm=$('aggregateResultModal');if(rm){rm.addEventListener('click',function(ev){if(ev.target===rm)closeAggregateResult()});document.addEventListener('keydown',function(ev){if(ev.key==='Escape'){closeAggregateResult()}})}
 e=$('generate');if(e)e.addEventListener('click',function(){
  var sources=$('sources')?$('sources').value.trim():'',a=$('apiPicker'),c=$('configPicker');if(!a||!c)return;
  var apiCustom=a.value==='__custom',configCustom=c.value==='__custom',apiValue=currentValue('api'),configValue=currentValue('config');
  if(!sources)return alert('请输入订阅链接');if(!apiValue)return alert('请选择订阅转换后端');if(!configValue)return alert('请选择订阅转换规则');
  var path=($('linkPath')?$('linkPath').value:'').trim();if(path.length<3)return alert('链接路径至少需要 3 个字符');var destroyKey=($('destroyKey')?$('destroyKey').value:'').trim();CURRENT_DESTROY_KEY=destroyKey;var body={path:path,sources:sources,apiIds:apiCustom?[]:[currentId('api')],apiCustom:apiCustom,apiUrl:apiCustom?apiValue:'',configIds:configCustom?[]:[currentId('config')],configCustom:configCustom,configUrl:configCustom?configValue:'',noAds:($('noAds')?$('noAds').value:'').trim(),destroyKey:destroyKey};
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
function saveProvider(){if(!modalState)return;var name=$('modalName')?$('modalName').value.trim():'',url=$('modalUrl')?$('modalUrl').value.trim():'';if(!name)return alert('请输入备注');if(modalState.type==='subapi'&&!/^https?:\/\//i.test(url))url='https://'+url;if(!/^https?:\/\//i.test(url))return alert('URL 必须以 http:// 或 https:// 开头');var b=$('modalSave'),editing=Boolean(modalState.id);if(b){b.disabled=true;b.textContent='保存中...'}post({type:modalState.type+'_'+(editing?'update':'create'),id:modalState.id,name:name,url:url}).then(function(){hideProvider();toast(editing?'已保存':'已添加');setTimeout(function(){location.reload()},700)}).catch(function(e){alert(e.message||'保存失败')}).finally(function(){if(b){b.disabled=false;b.textContent='保存'}})}
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
  const userAgentHeader = request.headers.get("User-Agent") || "";
  const userAgent = userAgentHeader.toLowerCase();
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") || "";
  const conversionSourceToken = url.searchParams.get("sourceToken") || "";
  let adminUser = "";
  let adminPass = "";
  let adminPath = DEFAULT_ADMIN_PATH;
  fakeUrl = "";
  fakeUrl302 = "";
  fakeCode = "";
  SiteLogo = "";
  if (env.KV) {
    try {
      const kvConfigStr = await env.KV.get("CONFIG.JSON");
      if (kvConfigStr) {
        const kvConfig = JSON.parse(kvConfigStr);
        FileName = kvConfig.subName || "SUB";
        subConverter = "";
        subConfig = "";
        config_noAds = "";
        adminUser = kvConfig.user || adminUser;
        adminPass = kvConfig.pass || adminPass;
        adminPath = normalizeAdminPath(kvConfig.adminPath) || DEFAULT_ADMIN_PATH;
        fakeMode = kvConfig.fakeMode !== void 0 ? kvConfig.fakeMode : "";
        fakeUrl = kvConfig.fakeUrl !== void 0 ? kvConfig.fakeUrl : fakeUrl;
        fakeUrl302 = kvConfig.fakeUrl302 !== void 0 ? kvConfig.fakeUrl302 : fakeUrl302;
        fakeCode = kvConfig.fakeCode !== void 0 ? kvConfig.fakeCode : fakeCode;
        SiteLogo = String(kvConfig.siteLogo || "");
      }
    } catch (e) {
      console.error("\u89E3\u6790 KV \u914D\u7F6E\u5931\u8D25", e);
    }
  }
  const customSubApi = String(subConverter || "").trim();
  const customSubConfig = String(subConfig || "").trim();
  const hasCustomApi = !!customSubApi;
  const hasCustomConfig = !!customSubConfig;
  subConverter = customSubApi;
  subConfig = customSubConfig;
  subProtocol = /^http:\/\//i.test(customSubApi) ? "http" : "https";
  const effectiveSubConverter = customSubApi.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const effectiveSubProtocol = customSubApi ? subProtocol : "https";
  const effectiveSubConfig = customSubConfig;
  const currentDate = /* @__PURE__ */ new Date();
  currentDate.setHours(0, 0, 0, 0);
  const timeTemp = Math.ceil(currentDate.getTime() / 1e3);
  const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
  let UD = Math.floor((timestamp - Date.now()) / timestamp * total * 1099511627776 / 2);
  total = total * 1099511627776;
  let expire = Math.floor(timestamp / 1e3);
  const isProxyClientUA = [
    "clash",
    "meta",
    "mihomo",
    "sing-box",
    "singbox",
    "surge",
    "quantumult",
    "loon",
    "nekobox",
    "v2rayn",
    "v2rayng",
    "shadowrocket",
    "subconverter"
  ].some((keyword) => userAgent.includes(keyword));
  if (url.searchParams.has("logout") || url.pathname === `/${adminPath}/logout`) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Cache-Control": "no-store",
        "Set-Cookie": "CF_SUB_ADMIN=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
      }
    });
  }
  if (url.pathname === "/__cfsubs.js" && request.method === "GET") {
    return new Response(CF_SUBS_CLIENT_SCRIPT, {
      headers: {
        "Content-Type": "application/javascript; charset=UTF-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  }
  if (url.pathname === "/api/ui-config" && request.method === "GET") {
    const cfg = await getConfig(env);
    return jsonResponse({
      ok: true,
      subApis: normalizeProviderList(cfg.subApis),
      subConfigs: normalizeProviderList(cfg.subConfigs),
      defaultSubApiId: String(cfg.defaultSubApiId || ""),
      defaultSubConfigId: String(cfg.defaultSubConfigId || "")
    });
  }
  if (url.pathname === "/api/status" && request.method === "GET") {
    const api = String(url.searchParams.get("api") || "").trim();
    const config = String(url.searchParams.get("config") || "").trim();
    if (!api && !config) return jsonResponse({ ok: false, error: "\u7F3A\u5C11 SUBAPI \u6216 SUBCONFIG" }, 400);
    return jsonResponse({ ok: true, ...await probeBackend(api, config) });
  }
  if (url.pathname === "/api/generate" && request.method === "POST") {
    return await handlePublicGenerate(request, env, url);
  }
  if (url.pathname === "/api/destroy" && request.method === "POST") {
    return await handlePublicDestroy(request, env);
  }
  if (url.pathname === "/api/generated-links/check" && request.method === "POST") {
    try {
      const data = await request.json();
      const input = Array.isArray(data?.tokens) ? data.tokens : [];
      const tokens = [...new Set(input.map((x) => String(x || "").trim()).filter((x) => /^[A-Za-z0-9]+$/.test(x) && x.length <= 128))].slice(0, 100);
      const existing = [];
      for (const token of tokens) {
        if (await getToken(env, token)) existing.push(token);
      }
      return jsonResponse({ ok: true, tokens: existing });
    } catch (e) {
      return jsonResponse({ ok: false, error: e?.message || String(e) }, 400);
    }
  }
  if (url.pathname === "/api/admin" && request.method === "POST") {
    if (isAdminLoginEnabled(adminUser, adminPass)) {
      const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
      if (!isLoggedIn) return jsonResponse({ ok: false, error: "\u672A\u767B\u5F55\u6216\u767B\u5F55\u5DF2\u8FC7\u671F" }, 401);
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
  if (url.pathname === `/${adminPath}/json`) {
    if (isAdminLoginEnabled(adminUser, adminPass)) {
      const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
      if (!isLoggedIn) {
        return new Response(renderLoginPage(url), {
          headers: {
            "Content-Type": "text/html;charset=utf-8",
            "Cache-Control": "no-store"
          }
        });
      }
    }
    return new Response(renderJsonManagerPage(url, env, adminPath), {
      headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
  if (url.pathname === `/${adminPath}`) {
    if (isAdminLoginEnabled(adminUser, adminPass)) {
      const isLoggedIn = await isAdminLoggedIn(request, mytoken, adminUser, adminPass);
      if (!isLoggedIn) {
        if (request.method === "POST") {
          return await handleAdminLogin(request, url, mytoken, adminUser, adminPass);
        }
        return new Response(renderLoginPage(url), {
          headers: {
            "Content-Type": "text/html;charset=utf-8",
            "Cache-Control": "no-store"
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
  let publicToken = queryToken;
  if (!publicToken && url.pathname !== "/") publicToken = decodeURIComponent(url.pathname.slice(1));
  let tokenData = null;
  if (env.KV && publicToken) tokenData = await getToken(env, publicToken);
  const isFakeTokenRequest = publicToken === fakeToken || url.pathname === "/" + fakeToken;
  let effectiveTokenData = tokenData;
  if (!effectiveTokenData && isFakeTokenRequest && conversionSourceToken) {
    effectiveTokenData = await getToken(env, conversionSourceToken);
  }
  if (!tokenData && !isFakeTokenRequest && url.pathname !== "/") {
    return Response.redirect(url.origin + "/", 302);
  }
  if (!tokenData && !isFakeTokenRequest && url.pathname === "/") {
    const page = await renderSubUIHome(request, url, env);
    const html = page;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store"
      }
    });
  }
  let selectedSources = Array.isArray(effectiveTokenData?.sources) && effectiveTokenData.sources.length ? cleanSourceList(effectiveTokenData.sources) : [];
  if (isFakeTokenRequest && !selectedSources.length && !conversionSourceToken) {
    selectedSources = await getAllManagedSources(env);
  }
  if (userAgent.includes("mozilla") && !url.search && !isProxyClientUA && tokenData) {
    const tokenBackends = await getSelectedBackends(env, tokenData, {});
    const primaryBackend = tokenBackends[0] || null;
    let guestStatus = {
      api: { ok: false, url: "", version: "" },
      config: { ok: false, url: "" },
      available: false
    };
    if (primaryBackend) {
      guestStatus = await probeBackend(
        `${primaryBackend.protocol}://${primaryBackend.api}`,
        primaryBackend.config
      );
    }
    return new Response(renderGuestPage(url, tokenData.url, tokenData.name, primaryBackend, guestStatus, Boolean(tokenData.destroyKeyHash)), {
      headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" }
    });
  }
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
      config_noAds: String(effectiveTokenData?.noAds || ""),
      FileName,
      UD,
      expire,
      tokenData: effectiveTokenData
    },
    publicToken
  );
}
__name(handleRequest, "handleRequest");
async function fetchWithTimeout(resource, options = {}, timeoutMs = 3e3) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");
async function probeBackend(apiUrl, configUrl) {
  const rawApi = String(apiUrl || "").trim();
  const protocol = /^http:\/\//i.test(rawApi) ? "http" : "https";
  const host = rawApi.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const api = host ? `${protocol}://${host}` : "";
  let apiOk = false, apiVersion = "";
  if (api) {
    try {
      const res = await fetchWithTimeout(
        `${api}/version`,
        { headers: { "User-Agent": "SUB-UI/Status" } },
        3e3
      );
      if (res.ok) {
        apiOk = true;
        apiVersion = (await res.text()).trim().slice(0, 80);
      }
    } catch (e) {
    }
  }
  let configOk = false;
  const config = String(configUrl || "").trim();
  if (config) {
    try {
      const res = await fetchWithTimeout(
        config,
        { headers: { "User-Agent": "SUB-UI/Status" } },
        3e3
      );
      configOk = res.ok;
    } catch (e) {
    }
  }
  return {
    api: { ok: apiOk, url: api, version: apiVersion },
    config: { ok: configOk, url: config },
    available: (api ? apiOk : true) && (config ? configOk : true)
  };
}
__name(probeBackend, "probeBackend");
function makeSubId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let value = "";
  for (const b of bytes) value += ID_CHARS[b % ID_CHARS.length];
  return value;
}
__name(makeSubId, "makeSubId");
async function getSub(env, id) {
  if (!env.KV || !id) return null;
  try {
    return await env.KV.get(`${SUB_PREFIX}${id}`, "json");
  } catch (e) {
    return null;
  }
}
__name(getSub, "getSub");
function upperCaseObject(value) {
  if (Array.isArray(value)) return value.map(upperCaseObject);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key.toUpperCase()] = upperCaseObject(item);
  return result;
}
__name(upperCaseObject, "upperCaseObject");
function normalizeTokenData(value) {
  if (!value || typeof value !== "object") return null;
  const map = { URL: "url", PATH: "path", SUBSCRIPTIONURL: "subscriptionUrl", NAME: "name", SOURCES: "sources", SUBAPIIDS: "subApiIds", SUBCONFIGIDS: "subConfigIds", SUBAPI: "subApi", SUBAPINAME: "subApiName", SUBCONFIG: "subConfig", SUBCONFIGNAME: "subConfigName", BACKEND: "backend", BACKENDS: "backends", NOADS: "noAds", TARGET: "target", CREATEDAT: "createdAt", UPDATEDAT: "updatedAt", TYPE: "type", DESTROYKEYHASH: "destroyKeyHash" };
  const output = { ...value };
  for (const [key, internal] of Object.entries(map)) if (Object.prototype.hasOwnProperty.call(value, key)) output[internal] = value[key];
  if (output.BACKEND && typeof output.BACKEND === "object") output.backend = { api: output.BACKEND.API, config: output.BACKEND.CONFIG, protocol: output.BACKEND.PROTOCOL };
  if (Array.isArray(output.BACKENDS)) output.backends = output.BACKENDS.map((x) => ({ api: x.API, config: x.CONFIG, protocol: x.PROTOCOL }));
  return output;
}
__name(normalizeTokenData, "normalizeTokenData");
async function getToken(env, token) {
  if (!env.KV || !token) return null;
  try {
    const raw = await env.KV.get(`${URL_PREFIX}${token}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw), normalized = upperCaseObject(parsed), normalizedRaw = JSON.stringify(normalized);
    if (normalizedRaw !== raw) await env.KV.put(`${URL_PREFIX}${token}`, normalizedRaw);
    return normalizeTokenData(normalized);
  } catch (e) {
    return null;
  }
}
__name(getToken, "getToken");
async function listSubs(env) {
  if (!env.KV) return [];
  const result = [];
  let cursor;
  do {
    const page = await env.KV.list({
      prefix: SUB_PREFIX,
      ...cursor ? { cursor } : {}
    });
    const values = await Promise.all(page.keys.map(
      (item) => getSub(env, item.name.slice(SUB_PREFIX.length))
    ));
    for (const data of values) {
      if (data) result.push(data);
    }
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  result.sort((a, b) => String(a.name).localeCompare(String(b.name), "zh-CN"));
  return result;
}
__name(listSubs, "listSubs");
function normalizeAdminPath(value) {
  let path = String(value || "").trim();
  if (!path) return DEFAULT_ADMIN_PATH;
  path = path.replace(/^[/]+/, "").replace(/[/]+$/, "");
  if (!/^[A-Za-z0-9_-]{2,60}$/.test(path)) return "";
  return path;
}
__name(normalizeAdminPath, "normalizeAdminPath");
function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
__name(normalizeName, "normalizeName");
function normalizeToken(value) {
  return String(value || "").trim();
}
__name(normalizeToken, "normalizeToken");
function validName(name) {
  return name.length >= 1 && name.length <= 80;
}
__name(validName, "validName");
function cleanSourceList(input) {
  if (Array.isArray(input)) {
    return input.flatMap((x) => String(x || "").split(/\r?\n/)).map((x) => x.trim()).filter(Boolean);
  }
  return String(input || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
__name(cleanSourceList, "cleanSourceList");
async function getAllManagedSources(env) {
  const result = [];
  const subs = await listSubs(env);
  for (const sub of subs) {
    if (sub.enabled === false) continue;
    if (Array.isArray(sub.sources)) result.push(...sub.sources);
  }
  return [...new Set(result.map((x) => String(x).trim()).filter(Boolean))];
}
__name(getAllManagedSources, "getAllManagedSources");
async function handleAdmin(request, env, runtime) {
  if (!env.KV) {
    return new Response(
      "\u672A\u7ED1\u5B9A\u540D\u4E3A KV \u7684 Cloudflare KV Namespace\u3002",
      { status: 500 }
    );
  }
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return new Response("\u4E0D\u652F\u6301\u7684\u6570\u636E\u683C\u5F0F", { status: 400 });
    }
    try {
      const data = await request.json();
      if (data.type === "json_list") {
        const query = String(data.query || "").trim().slice(0, 500);
        const items = await listJsonManagerItems(env, query);
        return jsonResponse({ ok: true, count: items.length, items });
      }
      if (data.type === "json_delete") {
        const token = normalizeToken(data.token);
        if (!token) return jsonResponse({ ok: false, error: "\u7F3A\u5C11 Token" }, 400);
        const raw = await env.KV.get(`${URL_PREFIX}${token}`);
        if (!raw) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u7ECF\u88AB\u5220\u9664" }, 404);
        await env.KV.delete(`${URL_PREFIX}${token}`);
        return jsonResponse({ ok: true, token });
      }
      if (data.type === "json_delete_keyword") {
        const keyword = String(data.keyword || "").trim().slice(0, 500);
        if (!keyword) return jsonResponse({ ok: false, error: "\u8BF7\u8F93\u5165 JSON \u5173\u952E\u5B57" }, 400);
        const items = await listJsonManagerItems(env, keyword);
        let deleted = 0;
        for (const item of items) {
          await env.KV.delete(`${URL_PREFIX}${item.token}`);
          deleted++;
        }
        return jsonResponse({ ok: true, deleted, keyword });
      }
      if (data.type === "json_delete_all") {
        const items = await listJsonManagerItems(env, "");
        for (const item of items) await env.KV.delete(`${URL_PREFIX}${item.token}`);
        return jsonResponse({ ok: true, deleted: items.length });
      }
      if (data.type === "config") {
        const old = await getConfig(env);
        const next = {
          ...old,
          subName: normalizeName(data.settings?.subName ?? old.subName) || "SUB",
          subApis: normalizeProviderList(data.settings?.subApis ?? old.subApis),
          subConfigs: normalizeProviderList(data.settings?.subConfigs ?? old.subConfigs),
          defaultSubApiId: String(data.settings?.defaultSubApiId ?? old.defaultSubApiId ?? ""),
          defaultSubConfigId: String(data.settings?.defaultSubConfigId ?? old.defaultSubConfigId ?? ""),
          user: String(data.settings?.user ?? old.user ?? ""),
          pass: data.settings?.pass ? String(data.settings.pass) : String(old.pass || ""),
          adminPath: normalizeAdminPath(data.settings?.adminPath ?? old.adminPath) || DEFAULT_ADMIN_PATH,
          noAds: "",
          fakeMode: String(data.settings?.fakeMode ?? old.fakeMode ?? ""),
          fakeUrl: String(data.settings?.fakeUrl ?? old.fakeUrl ?? ""),
          fakeUrl302: String(data.settings?.fakeUrl302 ?? old.fakeUrl302 ?? ""),
          fakeCode: String(data.settings?.fakeCode ?? old.fakeCode ?? ""),
          siteLogo: String(data.settings?.siteLogo ?? old.siteLogo ?? "")
        };
        await env.KV.put("CONFIG.JSON", JSON.stringify(next));
        return jsonResponse({ ok: true, adminPath: next.adminPath });
      }
      if (data.type === "security") {
        const old = await getConfig(env), user = String(data.user || "").trim();
        if (!user) return jsonResponse({ ok: false, error: "\u7BA1\u7406\u5458\u8D26\u53F7\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
        await env.KV.put("CONFIG.JSON", JSON.stringify({ ...old, user, pass: data.pass ? String(data.pass) : String(old.pass || "") }));
        return jsonResponse({ ok: true });
      }
      if (data.type === "admin_path") {
        const old = await getConfig(env), adminPath = normalizeAdminPath(data.adminPath);
        if (!adminPath) return jsonResponse({ ok: false, error: "\u7BA1\u7406\u5458\u8DEF\u5F84\u65E0\u6548" }, 400);
        await env.KV.put("CONFIG.JSON", JSON.stringify({ ...old, adminPath }));
        return jsonResponse({ ok: true, adminPath });
      }
      if (data.type === "site_name") {
        const old = await getConfig(env), subName = normalizeName(data.subName) || "SUB";
        await env.KV.put("CONFIG.JSON", JSON.stringify({ ...old, subName }));
        return jsonResponse({ ok: true, subName });
      }
      if (data.type === "site_settings") {
        const old = await getConfig(env);
        const subName = normalizeName(data.subName) || "SUB";
        const adminPath = normalizeAdminPath(data.adminPath) || DEFAULT_ADMIN_PATH;
        const siteLogo = String(data.siteLogo || "").trim();
        if (siteLogo && !/^https?:\/\//i.test(siteLogo)) return jsonResponse({ ok: false, error: "\u7AD9\u70B9\u6807\u7B7E\u680F Logo \u5FC5\u987B\u662F http:// \u6216 https:// URL" }, 400);
        const next = { ...old, subName, adminPath, siteLogo };
        await env.KV.put("CONFIG.JSON", JSON.stringify(next));
        return jsonResponse({ ok: true, subName, adminPath, siteLogo });
      }
      if (["subapi_create", "subapi_update", "subapi_delete", "subapi_default", "subapi_reorder", "subconfig_create", "subconfig_update", "subconfig_delete", "subconfig_default", "subconfig_reorder"].includes(data.type)) {
        const cfg = await getConfig(env);
        const isApi = data.type.startsWith("subapi_");
        const key = isApi ? "subApis" : "subConfigs";
        const defaultKey = isApi ? "defaultSubApiId" : "defaultSubConfigId";
        const list = normalizeProviderList(cfg[key]);
        const action = data.type.split("_")[1];
        const id = String(data.id || "").trim();
        if (action === "reorder") {
          const order = Array.isArray(data.order) ? data.order.map((x) => String(x || "").trim()).filter(Boolean) : [];
          if (order.length !== list.length || new Set(order).size !== list.length || order.some((x) => !list.some((item) => item.id === x))) {
            return jsonResponse({ ok: false, error: "\u6392\u5E8F\u6570\u636E\u65E0\u6548" }, 400);
          }
          const map = new Map(list.map((item) => [item.id, item]));
          cfg[key] = order.map((x) => map.get(x));
          await env.KV.put("CONFIG.JSON", JSON.stringify(cfg));
          return jsonResponse({ ok: true, items: normalizeProviderList(cfg[key]), defaultId: String(cfg[defaultKey] || "") });
        }
        if (action === "default") {
          if (!list.some((x) => x.id === id)) return jsonResponse({ ok: false, error: "\u9879\u76EE\u4E0D\u5B58\u5728" }, 404);
          cfg[defaultKey] = id;
          await env.KV.put("CONFIG.JSON", JSON.stringify(cfg));
          return jsonResponse({ ok: true, items: normalizeProviderList(cfg[key]), defaultId: String(cfg[defaultKey] || "") });
        }
        if (action === "delete") {
          if (!list.some((x) => x.id === id)) return jsonResponse({ ok: false, error: "\u9879\u76EE\u4E0D\u5B58\u5728" }, 404);
          cfg[key] = list.filter((x) => x.id !== id);
          if (String(cfg[defaultKey] || "") === id) cfg[defaultKey] = cfg[key][0]?.id || "";
        } else {
          const name = normalizeName(data.name);
          let value = String(data.url || "").trim();
          if (isApi && !/^https?:\/\//i.test(value)) value = "https://" + value;
          if (!validName(name)) return jsonResponse({ ok: false, error: "\u5907\u6CE8\u4E0D\u80FD\u4E3A\u7A7A\u4E14\u4E0D\u80FD\u8D85\u8FC7 80 \u4E2A\u5B57\u7B26" }, 400);
          if (!/^https?:\/\//i.test(value)) return jsonResponse({ ok: false, error: "URL \u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" }, 400);
          const itemId = id || makeSubId(), item = { id: itemId, name, url: value, enabled: true };
          if (action === "create") list.push(item);
          else {
            const index = list.findIndex((x) => x.id === id);
            if (index < 0) return jsonResponse({ ok: false, error: "\u9879\u76EE\u4E0D\u5B58\u5728" }, 404);
            list[index] = { ...list[index], ...item, id };
          }
          if (!String(cfg[defaultKey] || "") && list.length) cfg[defaultKey] = list[0].id;
          if (item.enabled === false && String(cfg[defaultKey] || "") === itemId) cfg[defaultKey] = "";
          cfg[key] = list;
        }
        await env.KV.put("CONFIG.JSON", JSON.stringify(cfg));
        return jsonResponse({ ok: true, items: normalizeProviderList(cfg[key]), defaultId: String(cfg[defaultKey] || "") });
      }
      return new Response("\u4E0D\u652F\u6301\u7684\u6570\u636E\u7C7B\u578B", { status: 400 });
    } catch (e) {
      return jsonResponse({
        ok: false,
        error: e?.message || String(e) || "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF"
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
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
__name(handleAdmin, "handleAdmin");
async function getConfig(env) {
  const defaults = {
    subName: "SUB",
    subApi: "",
    subConfig: "",
    subApis: [],
    subConfigs: [],
    defaultSubApiId: "",
    defaultSubConfigId: "",
    noAds: "",
    user: "",
    pass: "",
    adminPath: DEFAULT_ADMIN_PATH,
    siteLogo: "",
    fakeMode: "",
    fakeUrl: "",
    fakeUrl302: "",
    fakeCode: ""
  };
  if (!env.KV) return defaults;
  try {
    const raw = await env.KV.get("CONFIG.JSON");
    if (!raw) return defaults;
    const parsed = { ...defaults, ...JSON.parse(raw) };
    if (parsed.subName === "SUB-UI") parsed.subName = "SUB";
    return parsed;
  } catch (e) {
    return defaults;
  }
}
__name(getConfig, "getConfig");
function normalizeProviderList(input) {
  if (!Array.isArray(input)) return [];
  return input.map((x) => ({
    id: String(x?.id || makeSubId()),
    name: normalizeName(x?.name || "\u672A\u547D\u540D"),
    url: String(x?.url || "").trim(),
    enabled: x?.enabled !== false,
    ...x?.providerType ? { providerType: String(x.providerType) } : {}
  })).filter((x) => x.url);
}
__name(normalizeProviderList, "normalizeProviderList");
function buildPublicPreferencesCookie(value) {
  const encoded = encodeURIComponent(JSON.stringify(value));
  if (encoded.length > 3600) return "";
  return `CF_SUB_PREFS=${encoded}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`;
}
__name(buildPublicPreferencesCookie, "buildPublicPreferencesCookie");
async function getSelectedBackends(env, tokenData, runtime) {
  if (tokenData?.type === "sub-ui") {
    if (Array.isArray(tokenData.backends) && tokenData.backends.length) {
      return tokenData.backends.map((x) => ({
        api: String(x.api || "").replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
        config: String(x.config || "").trim(),
        protocol: x.protocol === "http" ? "http" : "https"
      })).filter((x) => x.api && x.config);
    }
    if (tokenData.backend?.api && tokenData.backend?.config) {
      const x = tokenData.backend;
      return [{
        api: String(x.api).replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
        config: String(x.config).trim(),
        protocol: x.protocol === "http" ? "http" : "https"
      }];
    }
    if (tokenData.subApi && tokenData.subConfig) {
      const raw = String(tokenData.subApi).trim();
      return [{
        api: raw.replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
        config: String(tokenData.subConfig).trim(),
        protocol: /^http:\/\//i.test(raw) ? "http" : "https"
      }];
    }
    return [];
  }
  const cfg = await getConfig(env);
  const apis = normalizeProviderList(cfg.subApis).filter((x) => x.enabled);
  const configs = normalizeProviderList(cfg.subConfigs).filter((x) => x.enabled);
  const selectedApis = (tokenData?.subApiIds || []).map((id) => apis.find((x) => x.id === id)).filter(Boolean);
  const selectedConfigs = (tokenData?.subConfigIds || []).map((id) => configs.find((x) => x.id === id)).filter(Boolean);
  if (!selectedApis.length || !selectedConfigs.length) return [];
  const pairs = [];
  for (const api of selectedApis) {
    const raw = String(api.url || "").trim();
    const protocol = /^http:\/\//i.test(raw) ? "http" : "https";
    const host = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    for (const config of selectedConfigs) pairs.push({ api: host, config: config.url, protocol });
  }
  return pairs;
}
__name(getSelectedBackends, "getSelectedBackends");
async function handlePublicGenerate(request, env, requestUrl) {
  if (!env.KV) return jsonResponse({ ok: false, error: "\u672A\u7ED1\u5B9A KV" }, 500);
  try {
    const data = await request.json();
    const sources = cleanSourceList(data.sources || "");
    if (!sources.length) return jsonResponse({ ok: false, error: "\u8BF7\u8F93\u5165\u81F3\u5C11\u4E00\u4E2A\u8BA2\u9605\u94FE\u63A5" }, 400);
    if (sources.length > 100) return jsonResponse({ ok: false, error: "\u8BA2\u9605\u94FE\u63A5\u6700\u591A 100 \u6761" }, 400);
    const cfg = await getConfig(env);
    const apis = normalizeProviderList(cfg.subApis).filter((x) => x.enabled);
    const configs = normalizeProviderList(cfg.subConfigs).filter((x) => x.enabled);
    const apiIds = Array.isArray(data.apiIds) ? [...new Set(data.apiIds.map((x) => String(x).trim()).filter(Boolean))] : [];
    const configIds = Array.isArray(data.configIds) ? [...new Set(data.configIds.map((x) => String(x).trim()).filter(Boolean))] : [];
    const apiCustom = Boolean(data.apiCustom);
    const configCustom = Boolean(data.configCustom);
    let apiUrl = String(data.apiUrl || "").trim();
    const configUrl = String(data.configUrl || "").trim();
    const selectedApis = apiIds.map((id) => apis.find((x) => x.id === id)).filter(Boolean);
    const selectedConfigs = configIds.map((id) => configs.find((x) => x.id === id)).filter(Boolean);
    if (!selectedApis.length && !apiCustom) return jsonResponse({ ok: false, error: "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF" }, 400);
    if (!selectedConfigs.length && !configCustom) return jsonResponse({ ok: false, error: "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u4E2A\u8BA2\u9605\u8F6C\u6362\u89C4\u5219" }, 400);
    if (apiCustom && !/^https?:\/\//i.test(apiUrl)) apiUrl = "https://" + apiUrl;
    if (apiCustom && !/^https?:\/\//i.test(apiUrl)) return jsonResponse({ ok: false, error: "\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" }, 400);
    if (configCustom && !/^https?:\/\//i.test(configUrl)) return jsonResponse({ ok: false, error: "\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934" }, 400);
    const apiEntries = [...selectedApis.map((x) => ({ id: x.id, url: x.url, name: x.name })), ...apiCustom ? [{ id: "", url: apiUrl, name: "\u81EA\u5B9A\u4E49" }] : []];
    const configEntries = [...selectedConfigs.map((x) => ({ id: x.id, url: x.url, name: x.name })), ...configCustom ? [{ id: "", url: configUrl, name: "\u81EA\u5B9A\u4E49" }] : []];
    const backends = [];
    for (const api of apiEntries) {
      const rawApi = String(api.url || "").trim();
      const protocol = /^http:\/\//i.test(rawApi) ? "http" : "https";
      const host = rawApi.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      if (!host) continue;
      for (const config of configEntries) {
        const rawConfig = String(config.url || "").trim();
        if (!/^https?:\/\//i.test(rawConfig)) continue;
        backends.push({ api: host, config: rawConfig, protocol });
      }
    }
    if (!backends.length) return jsonResponse({ ok: false, error: "\u6CA1\u6709\u6709\u6548\u7684\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\u4E0E\u89C4\u5219\u7EC4\u5408" }, 400);
    const noAds = String(data.noAds || "").trim().slice(0, 5e3);
    const destroyKey = String(data.destroyKey || "").trim().slice(0, 256);
    const token = String(data.path || "").trim();
    if (token.length < 3 || token.length > 128 || !/^[-A-Za-z0-9_]+$/.test(token)) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u8DEF\u5F84\u53EA\u80FD\u4F7F\u7528\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u77ED\u6A2A\u7EBF\u6216\u4E0B\u5212\u7EBF\uFF0C\u4E14\u957F\u5EA6\u81F3\u5C11\u4E3A 3 \u4E2A\u5B57\u7B26" }, 400);
    if (["admin", "api", "login", "logout", "favicon"].includes(token.toLowerCase())) return jsonResponse({ ok: false, error: "\u8BE5\u94FE\u63A5\u8DEF\u5F84\u4E0D\u53EF\u4F7F\u7528" }, 400);
    if (await getToken(env, token)) return jsonResponse({ ok: false, error: "\u8BE5\u94FE\u63A5\u8DEF\u5F84\u5DF2\u5B58\u5728\uFF0C\u8BF7\u66F4\u6362\u4E00\u4E2A" }, 409);
    const destroyKeyHash = destroyKey ? await sha256Hex(`${token}:${destroyKey}`) : "";
    const name = "\u8BA2\u9605\u94FE\u63A5";
    const primaryBackend = backends[0];
    const item = {
      url: token,
      path: `/${token}`,
      subscriptionUrl: `${requestUrl.origin}/${encodeURIComponent(token)}`,
      name,
      sources,
      subApiIds: selectedApis.map((x) => x.id),
      subConfigIds: selectedConfigs.map((x) => x.id),
      subApi: apiEntries[0]?.url || "",
      subApiName: apiEntries[0]?.name || "",
      subConfig: configEntries[0]?.url || "",
      subConfigName: configEntries[0]?.name || "",
      backend: primaryBackend,
      backends,
      noAds,
      target: "auto",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      type: "sub-ui",
      destroyKeyHash
    };
    const storedItem = upperCaseObject(item);
    await env.KV.put(`${URL_PREFIX}${token}`, JSON.stringify(storedItem));
    const prefs = {
      apiIds: selectedApis.map((x) => x.id),
      apiCustom,
      apiUrl: apiCustom ? apiUrl : "",
      configIds: selectedConfigs.map((x) => x.id),
      configCustom,
      configUrl: configCustom ? configUrl : "",
      noAds
    };
    const cookie = buildPublicPreferencesCookie(prefs);
    const headers = cookie ? { "Set-Cookie": cookie } : {};
    const subscriptionUrl = `${requestUrl.origin}/${encodeURIComponent(token)}`;
    const responseItem = { ...storedItem };
    delete responseItem.DESTROYKEYHASH;
    return jsonResponse({ ok: true, url: responseItem, subscription_url: subscriptionUrl }, 200, headers);
  } catch (e) {
    return jsonResponse({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(handlePublicGenerate, "handlePublicGenerate");
async function handlePublicDestroy(request, env) {
  if (!env.KV) return jsonResponse({ ok: false, error: "\u672A\u7ED1\u5B9A KV" }, 500);
  try {
    const data = await request.json();
    let token = String(data.token || "").trim();
    const suppliedKey = String(data.key || "");
    if (!token) {
      const rawUrl = String(data.url || "").trim();
      if (rawUrl) {
        try {
          token = decodeURIComponent(new URL(rawUrl).pathname.replace(/^\/+/, ""));
        } catch (e) {
        }
      }
    }
    token = String(token || "").trim().replace(/^\/+|\/+$/g, "");
    if (!token) return jsonResponse({ ok: false, error: "\u7F3A\u5C11\u8BA2\u9605\u94FE\u63A5\u6807\u8BC6" }, 400);
    if (!/^[A-Za-z0-9]+$/.test(token) || token.length > 128) return jsonResponse({ ok: false, error: "\u8BA2\u9605\u94FE\u63A5\u6807\u8BC6\u65E0\u6548" }, 400);
    const raw = await env.KV.get(`${URL_PREFIX}${token}`);
    if (!raw) return jsonResponse({ ok: false, error: "\u94FE\u63A5\u4E0D\u5B58\u5728\u6216\u5DF2\u7ECF\u88AB\u9500\u6BC1" }, 404);
    let item = null;
    try {
      item = JSON.parse(raw);
    } catch (e) {
      item = null;
    }
    item = normalizeTokenData(item);
    const storedHash = String(item?.destroyKeyHash || "");
    if (storedHash) {
      if (!suppliedKey) return jsonResponse({ ok: false, error: "\u9700\u8981\u63D0\u4F9B\u9500\u6BC1\u5BC6\u94A5", requireKey: true }, 403);
      const suppliedHash = await sha256Hex(`${token}:${suppliedKey}`);
      if (suppliedHash !== storedHash) return jsonResponse({ ok: false, error: "\u9500\u6BC1\u5BC6\u94A5\u9519\u8BEF", requireKey: true }, 403);
    }
    await env.KV.delete(`${URL_PREFIX}${token}`);
    return jsonResponse({ ok: true, token });
  } catch (e) {
    return jsonResponse({ ok: false, error: e?.message || String(e) }, 500);
  }
}
__name(handlePublicDestroy, "handlePublicDestroy");
function encodeBase64(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function generateSubscription(request, env, sourceList, runtime, token) {
  let allSources = [...new Set((sourceList || []).map((x) => String(x).trim()).filter(Boolean))];
  let \u81EA\u5EFA\u8282\u70B9 = "";
  let \u8BA2\u9605\u94FE\u63A5 = "";
  for (const x of allSources) {
    if (x.toLowerCase().startsWith("http")) {
      \u8BA2\u9605\u94FE\u63A5 += x + "\n";
    } else {
      \u81EA\u5EFA\u8282\u70B9 += x + "\n";
    }
  }
  let nodeUrls = await ADD(\u8BA2\u9605\u94FE\u63A5);
  let req_data = \u81EA\u5EFA\u8282\u70B9;
  const isSubConverterRequest = request.headers.get("subconverter-request") || request.headers.get("subconverter-version") || runtime.userAgent.includes("subconverter");
  let \u8BA2\u9605\u683C\u5F0F = "base64";
  if (!(runtime.userAgent.includes("null") || isSubConverterRequest || runtime.userAgent.includes("nekobox") || runtime.userAgent.includes("cf-sub"))) {
    if (runtime.userAgent.includes("sing-box") || runtime.userAgent.includes("singbox") || new URL(request.url).searchParams.has("sb") || new URL(request.url).searchParams.has("singbox")) {
      \u8BA2\u9605\u683C\u5F0F = "singbox";
    } else if (runtime.userAgent.includes("surge") || new URL(request.url).searchParams.has("surge")) {
      \u8BA2\u9605\u683C\u5F0F = "surge";
    } else if (runtime.userAgent.includes("quantumult") || new URL(request.url).searchParams.has("quanx")) {
      \u8BA2\u9605\u683C\u5F0F = "quanx";
    } else if (runtime.userAgent.includes("loon") || new URL(request.url).searchParams.has("loon")) {
      \u8BA2\u9605\u683C\u5F0F = "loon";
    } else if (runtime.userAgent.includes("clash") || runtime.userAgent.includes("meta") || runtime.userAgent.includes("mihomo") || new URL(request.url).searchParams.has("clash")) {
      \u8BA2\u9605\u683C\u5F0F = "clash";
    }
  }
  if (runtime.tokenData?.target && runtime.tokenData.target !== "auto") {
    \u8BA2\u9605\u683C\u5F0F = runtime.tokenData.target;
  }
  const sourceToken = new URL(request.url).searchParams.get("sourceToken") || token || "";
  const conversionSeed = `${new URL(request.url).origin}/${await MD5MD5(runtime.fakeToken)}?token=${encodeURIComponent(runtime.fakeToken)}${sourceToken ? `&sourceToken=${encodeURIComponent(sourceToken)}` : ""}`;
  let \u8BA2\u9605\u8F6C\u6362URL = conversionSeed;
  let \u8FFD\u52A0UA = "v2rayn";
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.has("b64") || requestUrl.searchParams.has("base64")) {
    \u8BA2\u9605\u683C\u5F0F = "base64";
  } else if (requestUrl.searchParams.has("clash")) {
    \u8FFD\u52A0UA = "clash";
  } else if (requestUrl.searchParams.has("singbox")) {
    \u8FFD\u52A0UA = "singbox";
  } else if (requestUrl.searchParams.has("surge")) {
    \u8FFD\u52A0UA = "surge";
  } else if (requestUrl.searchParams.has("quanx")) {
    \u8FFD\u52A0UA = "Quantumult%20X";
  } else if (requestUrl.searchParams.has("loon")) {
    \u8FFD\u52A0UA = "Loon";
  }
  nodeUrls = [...new Set(nodeUrls)].filter((item) => item && item.trim());
  if (nodeUrls.length > 0) {
    const \u8BF7\u6C42\u8BA2\u9605\u54CD\u5E94\u5185\u5BB9 = await getSUB(
      nodeUrls,
      request,
      \u8FFD\u52A0UA,
      runtime.userAgentHeader
    );
    req_data += \u8BF7\u6C42\u8BA2\u9605\u54CD\u5E94\u5185\u5BB9[0].join("\n");
    \u8BA2\u9605\u8F6C\u6362URL += "|" + \u8BF7\u6C42\u8BA2\u9605\u54CD\u5E94\u5185\u5BB9[1];
    if (\u8BA2\u9605\u683C\u5F0F === "base64" && !isSubConverterRequest && \u8BF7\u6C42\u8BA2\u9605\u54CD\u5E94\u5185\u5BB9[1].includes("://")) {
      try {
        const backendPairs = await getSelectedBackends(env, runtime.tokenData, runtime);
        const backend = backendPairs[0];
        if (backend?.api && backend?.config) {
          const u = buildSubUrl(backend.api, backend.config, "mixed", \u8BF7\u6C42\u8BA2\u9605\u54CD\u5E94\u5185\u5BB9[1], backend.protocol);
          const res = await fetch(u, { headers: { "User-Agent": "v2rayn/CF-SUB" } });
          if (res.ok) req_data += "\n" + atob(await res.text());
        }
      } catch (error) {
      }
    }
  }
  const text = new TextDecoder().decode(
    new TextEncoder().encode(req_data)
  );
  let filteredLines = text.split("\n");
  if (runtime.config_noAds) {
    const adKeywords = runtime.config_noAds.split(/[, \r\n]+/).map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0);
    if (adKeywords.length > 0) {
      filteredLines = filteredLines.filter((line) => {
        const lowerLine = line.toLowerCase();
        return !adKeywords.some((keyword) => lowerLine.includes(keyword));
      });
    }
  }
  const uniqueLines = new Set(filteredLines);
  const result = [...uniqueLines].join("\n");
  let base64Data;
  try {
    base64Data = btoa(result);
  } catch (e) {
    base64Data = encodeBase64(result);
  }
  const responseHeaders = {
    "content-type": "text/plain; charset=utf-8",
    "Profile-Update-Interval": `${SUBUpdateTime}`,
    "Profile-web-page-url": request.url.includes("?") ? request.url.split("?")[0] : request.url
  };
  if (\u8BA2\u9605\u683C\u5F0F === "base64" || token === runtime.fakeToken) {
    return new Response(base64Data, { headers: responseHeaders });
  }
  try {
    const backendPairs = await getSelectedBackends(env, runtime.tokenData, runtime);
    let lastError;
    for (const backend of backendPairs) {
      try {
        const finalUrl = buildSubUrl(backend.api, backend.config, \u8BA2\u9605\u683C\u5F0F, \u8BA2\u9605\u8F6C\u6362URL, backend.protocol);
        const res = await fetch(finalUrl, { headers: { "User-Agent": runtime.userAgentHeader } });
        if (!res.ok) throw new Error(`SUBAPI ${res.status}`);
        let content = await res.text();
        if (\u8BA2\u9605\u683C\u5F0F === "clash") content = clashFix(content);
        if (!runtime.userAgent.includes("mozilla")) {
          responseHeaders["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(runtime.FileName)}`;
        }
        return new Response(content, { headers: responseHeaders });
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error("\u6CA1\u6709\u53EF\u7528\u7684 SUBAPI/SUBCONFIG");
  } catch (error) {
    return new Response(
      `\u8BA2\u9605\u8F6C\u6362\u5931\u8D25\uFF1A${error?.message || "SUBAPI/SUBCONFIG \u4E0D\u53EF\u7528"}`,
      {
        status: 502,
        headers: {
          ...responseHeaders,
          "content-type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
__name(generateSubscription, "generateSubscription");
function buildSubUrl(api, config, target, urlToConvert, protocol) {
  let base = `${protocol}://${api}/sub?target=${target}&url=${encodeURIComponent(urlToConvert)}&insert=false&config=${encodeURIComponent(config)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
  if (target === "surge") base += "&ver=4&new_name=true";
  else if (target === "quanx") base += "&udp=true";
  else if (target === "clash" || target === "singbox" || target === "mixed") base += "&new_name=true";
  return base;
}
__name(buildSubUrl, "buildSubUrl");
async function ADD(envadd) {
  var addtext = envadd.replace(/[ "'|\r\n]+/g, "\n").replace(/\n+/g, "\n");
  if (addtext.charAt(0) == "\n") addtext = addtext.slice(1);
  if (addtext.charAt(addtext.length - 1) == "\n") addtext = addtext.slice(0, addtext.length - 1);
  return addtext.split("\n");
}
__name(ADD, "ADD");
function base64Decode(str) {
  const bytes = new Uint8Array(atob(str).split("").map((c) => c.charCodeAt(0)));
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
}
__name(base64Decode, "base64Decode");
async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(String(input));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function md5Hex(input) {
  const data = new TextEncoder().encode(String(input));
  const bitLen = data.length * 8;
  const len = ((data.length + 8 >> 6) + 1) * 64;
  const bytes = new Uint8Array(len);
  bytes.set(data);
  bytes[data.length] = 128;
  const view = new DataView(bytes.buffer);
  view.setUint32(len - 8, bitLen >>> 0, true);
  view.setUint32(len - 4, Math.floor(bitLen / 4294967296), true);
  let a0 = 1732584193;
  let b0 = 4023233417;
  let c0 = 2562383102;
  let d0 = 271733878;
  const s = [
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21
  ];
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  }
  const leftRotate = /* @__PURE__ */ __name((x, amount) => (x << amount | x >>> 32 - amount) >>> 0, "leftRotate");
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(offset + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) {
        F = B & C | ~B & D;
        g = i;
      } else if (i < 32) {
        F = D & B | ~D & C;
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = 7 * i % 16;
      }
      F = F + A + K[i] + M[g] >>> 0;
      A = D;
      D = C;
      C = B;
      B = B + leftRotate(F, s[i]) >>> 0;
    }
    a0 = a0 + A >>> 0;
    b0 = b0 + B >>> 0;
    c0 = c0 + C >>> 0;
    d0 = d0 + D >>> 0;
  }
  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(md5Hex, "md5Hex");
async function MD5MD5(text) {
  const firstHex = md5Hex(text);
  return md5Hex(firstHex.slice(7, 27));
}
__name(MD5MD5, "MD5MD5");
function clashFix(content) {
  if (content.includes("wireguard") && !content.includes("remote-dns-resolve")) {
    let lines = content.includes("\r\n") ? content.split("\r\n") : content.split("\n");
    let result = "";
    for (let line of lines) {
      if (line.includes("type: wireguard")) {
        result += line.replace(new RegExp(`, mtu: 1280, udp: true`, "g"), `, mtu: 1280, remote-dns-resolve: true, udp: true`) + "\n";
      } else {
        result += line + "\n";
      }
    }
    return result;
  }
  return content;
}
__name(clashFix, "clashFix");
async function getSUB(api, request, \u8FFD\u52A0UA, userAgentHeader) {
  if (!api || api.length === 0) return [];
  else api = [...new Set(api)];
  let newapi = "";
  let \u8BA2\u9605\u8F6C\u6362URLs = "";
  let \u5F02\u5E38\u8BA2\u9605 = "";
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 2e3);
  try {
    const responses = await Promise.allSettled(api.map((apiUrl) => getUrl(request, apiUrl, \u8FFD\u52A0UA, userAgentHeader).then((response) => response.ok ? response.text() : Promise.reject(response))));
    const modifiedResponses = responses.map((response, index) => {
      if (response.status === "rejected") {
        return { status: response.reason && response.reason.name === "AbortError" ? "\u8D85\u65F6" : "\u8BF7\u6C42\u5931\u8D25", value: null, apiUrl: api[index] };
      }
      return { status: response.status, value: response.value, apiUrl: api[index] };
    });
    for (const response of modifiedResponses) {
      if (response.status === "fulfilled") {
        const content = await response.value || "null";
        if (content.includes("proxies:") || content.includes('outbounds"') && content.includes('inbounds"')) {
          \u8BA2\u9605\u8F6C\u6362URLs += "|" + response.apiUrl;
        } else if (content.includes("://")) {
          newapi += content + "\n";
        } else if (isValidBase64(content)) {
          newapi += base64Decode(content) + "\n";
        } else {
          const \u5F02\u5E38\u8BA2\u9605LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${response.apiUrl.split("://")[1].split("/")[0]}`;
          \u5F02\u5E38\u8BA2\u9605 += `${\u5F02\u5E38\u8BA2\u9605LINK}
`;
        }
      }
    }
  } catch (error) {
  } finally {
    clearTimeout(timeout);
  }
  return [await ADD(newapi + \u5F02\u5E38\u8BA2\u9605), \u8BA2\u9605\u8F6C\u6362URLs];
}
__name(getSUB, "getSUB");
async function getUrl(request, targetUrl, \u8FFD\u52A0UA, userAgentHeader) {
  const newHeaders = new Headers(request.headers);
  newHeaders.set("User-Agent", `${atob("djJyYXlOLzYuNDU=")} cmliu/CF-SUB ${\u8FFD\u52A0UA}(${userAgentHeader})`);
  return fetch(new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.method === "GET" ? null : request.body,
    redirect: "follow",
    cf: { insecureSkipVerify: true, allowUntrusted: true, validateCertificate: false }
  }));
}
__name(getUrl, "getUrl");
function isValidBase64(str) {
  const v = String(str || "").replace(/\s/g, "");
  return v.length >= 4 && v.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v);
}
__name(isValidBase64, "isValidBase64");
function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const cookies = cookie.split(";").map((item) => item.trim());
  for (const item of cookies) {
    const index = item.indexOf("=");
    if (index === -1) continue;
    if (item.slice(0, index) === name) return decodeURIComponent(item.slice(index + 1));
  }
  return "";
}
__name(getCookie, "getCookie");
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}
__name(jsonResponse, "jsonResponse");
function escapeHTML(text = "") {
  return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
__name(escapeHTML, "escapeHTML");
async function getAdminSessionValue(user, pass, token) {
  if (!user || !pass) return "";
  return await MD5MD5(`${user}:${pass}:${token}:admin-login`);
}
__name(getAdminSessionValue, "getAdminSessionValue");
function isAdminLoginEnabled(user, pass) {
  return !!(user && pass);
}
__name(isAdminLoginEnabled, "isAdminLoginEnabled");
async function isAdminLoggedIn(request, token, user, pass) {
  const session = await getAdminSessionValue(user, pass, token);
  return session ? getCookie(request, "CF_SUB_ADMIN") === session : false;
}
__name(isAdminLoggedIn, "isAdminLoggedIn");
function buildAdminCookie(value, url) {
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return `CF_SUB_ADMIN=${encodeURIComponent(value)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${secure}`;
}
__name(buildAdminCookie, "buildAdminCookie");
async function handleAdminLogin(request, url, token, user, pass) {
  let inputUser = "";
  let inputPass = "";
  try {
    const form = await request.formData();
    inputUser = String(form.get("username") || "");
    inputPass = String(form.get("password") || "");
  } catch (e) {
    return new Response(renderLoginPage(url, "\u767B\u5F55\u8BF7\u6C42\u683C\u5F0F\u4E0D\u6B63\u786E"), { status: 400, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
  }
  if (inputUser === user && inputPass === pass) {
    const session = await getAdminSessionValue(user, pass, token);
    return new Response("", { status: 302, headers: { "Location": url.pathname, "Set-Cookie": buildAdminCookie(session, url), "Cache-Control": "no-store" } });
  }
  return new Response(renderLoginPage(url, "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF"), { status: 401, headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
}
__name(handleAdminLogin, "handleAdminLogin");
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
        .path-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; margin-top: 12px; }
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
__name(getToolStyles, "getToolStyles");
function renderLoginPage(url, error = "") {
  return `<!DOCTYPE html>
<html>
<head>
<title>${escapeHTML(FileName)}\u7BA1\u7406\u9762\u677F</title>${SiteLogo ? `<link rel="icon" href="${escapeHTML(SiteLogo)}">` : ""}
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
<div class="subtitle" style="margin-bottom:24px;">\u8BF7\u767B\u5F55\u7BA1\u7406\u5458\u63A7\u5236\u53F0</div>
<form method="POST" action="${escapeHTML(url.pathname)}" style="text-align:left;">
<div class="field"><label>\u7528\u6237\u540D</label><input name="username" type="text" required autofocus></div>
<div class="field"><label>\u5BC6\u7801</label><input name="password" type="password" required></div>
<button type="submit" class="login-btn">\u767B\u5F55</button>
${error ? `<div class="error">${escapeHTML(error)}</div>` : ""}
</form>
</section>
</main>
</body>
</html>`;
}
__name(renderLoginPage, "renderLoginPage");
function getSubscriptionLinks(url, token) {
  const base = `${url.origin}/${token}`;
  return [
    ["\u81EA\u9002\u5E94\u8BA2\u9605\u5730\u5740", base],
    ["Base64\u8BA2\u9605\u5730\u5740", `${base}?b64`],
    ["Clash\u8BA2\u9605\u5730\u5740", `${base}?clash`],
    ["Sing-box\u8BA2\u9605\u5730\u5740", `${base}?sb`],
    ["Surge\u8BA2\u9605\u5730\u5740", `${base}?surge`],
    ["Loon\u8BA2\u9605\u5730\u5740", `${base}?loon`]
  ];
}
__name(getSubscriptionLinks, "getSubscriptionLinks");
function renderCFSubsGuestPage(url, guest, guestName = "") {
  const links = getSubscriptionLinks(url, guest);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(guestName ? `${guestName} 聚合订阅` : '聚合订阅')}</title>
<style>
${getToolStyles()}
.guest-shell{max-width:1100px;padding-top:0!important}.guest-header{margin:0 -28px 18px;padding:28px;border-bottom:1px solid rgba(120,130,140,.18)}.guest-link-list{display:grid;gap:10px}.guest-link-item{position:relative;padding:12px;border:1px solid rgba(229,229,223,.6);border-radius:12px;background:rgba(255,255,255,.5)}.guest-link-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:30px;margin-bottom:14px}.guest-link-label{font-weight:700;word-break:break-word;padding-right:90px}.guest-link-url{display:block;width:100%;box-sizing:border-box;padding:10px 12px;margin-top:14px;border:1px solid rgba(229,229,223,.8);border-radius:9px;background:rgba(250,250,250,.7);color:#1f4b99;text-decoration:none;word-break:break-all;overflow-wrap:anywhere}.guest-actions{position:absolute;top:12px;right:12px;display:flex;gap:8px}.guest-copy-btn,.guest-hide-btn{min-width:56px;width:auto;height:30px;min-height:30px;padding:0 10px}.guest-hide-btn{display:none}.guest-qrcode{display:none;background:#fff;border-radius:12px;padding:12px;margin:14px auto 0;width:max-content;max-width:100%;box-shadow:0 8px 24px rgba(0,0,0,.08)}
@media(max-width:640px){.guest-shell{width:calc(100% - 28px);margin:14px 14px 28px;padding:0 18px 24px;border-radius:22px}.guest-header{margin:0 -18px 16px;padding:22px 18px 20px}.guest-header .title{font-size:34px}.guest-link-item{padding:10px}.guest-link-url{margin-top:10px}}
@media(prefers-color-scheme:dark){.guest-link-item{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.10)}.guest-link-url{background:rgba(2,6,8,.82);border-color:rgba(255,255,255,.12);color:#64b5f6}}
</style><script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script></head><body><div id="copyNotice" class="toast"></div><main class="page app-shell guest-shell"><header class="header guest-header"><h1 class="title" style="font-size:26px">聚合订阅链接</h1><div class="subtitle">复制订阅链接可同时生成二维码</div></header><div class="guest-link-list">${links.map(([label,value])=>`<div class="guest-link-item"><div class="guest-link-head"><div class="guest-link-label">${escapeHTML(label)}</div></div><a class="guest-link-url" href="${escapeHTML(value)}" target="_blank" rel="noopener">${escapeHTML(value)}</a><div class="guest-actions"><button type="button" class="button guest-copy-btn" data-url="${escapeHTML(value)}">复制</button><button type="button" class="button secondary guest-hide-btn">隐藏</button></div><div class="guest-qrcode"></div></div>`).join('')}</div></main><script>
let guestToastTimer;function guestToast(message){const e=document.getElementById('copyNotice');e.textContent=message;e.style.display='block';clearTimeout(guestToastTimer);guestToastTimer=setTimeout(()=>e.style.display='none',1500)}function showGuestQr(b){const i=b.closest('.guest-link-item'),q=i.querySelector('.guest-qrcode'),c=i.querySelector('.guest-copy-btn'),h=i.querySelector('.guest-hide-btn');document.querySelectorAll('.guest-qrcode').forEach(x=>{x.style.display='none';x.innerHTML=''});document.querySelectorAll('.guest-copy-btn').forEach(x=>x.style.display='inline-flex');document.querySelectorAll('.guest-hide-btn').forEach(x=>x.style.display='none');q.innerHTML='';q.style.display='block';c.style.display='none';h.style.display='inline-flex';if(window.QRCode)new QRCode(q,{text:b.dataset.url,width:220,height:220,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.Q})}function hideGuestQr(b){const i=b.closest('.guest-link-item');i.querySelector('.guest-qrcode').style.display='none';i.querySelector('.guest-qrcode').innerHTML='';i.querySelector('.guest-copy-btn').style.display='inline-flex';b.style.display='none'}document.querySelectorAll('.guest-copy-btn').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.url||'';const done=()=>{guestToast('已复制到剪贴板');showGuestQr(b)};if(navigator.clipboard)navigator.clipboard.writeText(v).then(done).catch(()=>guestToast('复制失败，请手动复制'));else{const t=document.createElement('textarea');t.value=v;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();done()}}));document.querySelectorAll('.guest-hide-btn').forEach(b=>b.addEventListener('click',()=>hideGuestQr(b)));
</script></body></html>`;
}

function renderGuestPage(url, guest, guestName = "", backend = null, status = null, destroyKeyRequired = false) {
  return renderCFSubsGuestPage(url, guest, guestName);
  const links = getSubscriptionLinks(url, guest);
  const apiUrl = backend ? `${backend.protocol}://${backend.api}` : "";
  const configUrl = backend?.config || "";
  const apiOk = Boolean(status?.api?.ok);
  const configOk = Boolean(status?.config?.ok);
  const apiVersion = String(status?.api?.version || "").trim();
  const apiStatus = apiOk ? `\u2705SUBAPI\u72B6\u6001\u6B63\u5E38${apiVersion ? ` (${escapeHTML(apiVersion)})` : ""}` : "\u274CSUBAPI\u72B6\u6001\u5F02\u5E38";
  const configStatus = configOk ? "\u2705SUBCONFIG\u72B6\u6001\u6B63\u5E38" : "\u274CSUBCONFIG\u72B6\u6001\u5F02\u5E38";
  const apiCss = apiOk ? "status-ok" : "status-error";
  const configCss = configOk ? "status-ok" : "status-error";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<title>\u805A\u5408\u8BA2\u9605\u94FE\u63A5</title>${SiteLogo ? `<link rel="icon" href="${escapeHTML(SiteLogo)}">` : ""}
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
<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"><\/script>
</head>
<body>
<div id="copyNotice" class="toast"></div>
<main class="page app-shell guest-shell" data-token="${escapeHTML(String(guest || ""))}" data-key-required="${destroyKeyRequired ? "true" : "false"}">
<header class="header guest-header">
<div class="guest-head-row"><div><h1 class="title">\u805A\u5408\u8BA2\u9605\u94FE\u63A5</h1><div class="subtitle">\u590D\u5236\u8BA2\u9605\u94FE\u63A5\u53EF\u540C\u65F6\u751F\u6210\u4E8C\u7EF4\u7801</div></div><div class="guest-head-copy"><button type="button" class="button guest-head-destroy">\u9500\u6BC1\u672C\u94FE\u63A5</button></div></div>
<div class="guest-destroy-note">\u9500\u6BC1\u540E\u6B64\u805A\u5408\u8BA2\u9605\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u4E14\u65E0\u6CD5\u6062\u590D\u3002${destroyKeyRequired ? "\u672C\u94FE\u63A5\u5DF2\u8BBE\u7F6E\u9500\u6BC1\u5BC6\u94A5\u3002" : "\u672C\u94FE\u63A5\u672A\u8BBE\u7F6E\u9500\u6BC1\u5BC6\u94A5\uFF0C\u786E\u8BA4\u540E\u5373\u53EF\u9500\u6BC1\u3002"}</div>
</header>
<section class="panel">
<h2 class="section-title">\u8BA2\u9605\u94FE\u63A5</h2>
<div class="guest-link-list">
${links.map(([label, value]) => `<div class="guest-link-item">
<div class="guest-link-head"><div class="guest-link-label">${escapeHTML(label)}</div></div>
<a class="guest-link-url" href="${escapeHTML(value)}" target="_blank" rel="noopener">${escapeHTML(value)}</a>
<div class="guest-actions"><button type="button" class="button guest-copy-btn" data-url="${escapeHTML(value)}" >\u590D\u5236</button><button type="button" class="button secondary guest-hide-btn" >\u9690\u85CF</button></div>
<div class="guest-qrcode"></div>
</div>`).join("")}
</div>
</section>
<section class="panel">
<h2 class="section-title">\u8BA2\u9605\u8F6C\u6362\u670D\u52A1</h2>
<div class="guest-link-list">
<div class="guest-link-item">
<div class="guest-link-head"><div class="guest-link-label">\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF SUBAPI</div></div>
<div class="guest-status ${apiCss}">${apiStatus}</div>
<div class="guest-current-label">\u5F53\u524D\u914D\u7F6E</div>
<a class="guest-current guest-link-url" href="${escapeHTML(apiUrl)}" target="_blank" rel="noopener">${escapeHTML(apiUrl)}</a>
</div>
<div class="guest-link-item">
<div class="guest-link-head"><div class="guest-link-label">\u8BA2\u9605\u8F6C\u6362\u89C4\u5219 SUBCONFIG</div></div>
<div class="guest-status ${configCss}">${configStatus}</div>
<div class="guest-current-label">\u5F53\u524D\u914D\u7F6E</div>
<a class="guest-current guest-link-url" href="${escapeHTML(configUrl)}" target="_blank" rel="noopener">${escapeHTML(configUrl)}</a>
</div>
</div>
</section>
</main>
<div id="guestDestroyModal" class="guest-destroy-modal"><div class="guest-destroy-dialog"><h3>\u9500\u6BC1\u672C\u94FE\u63A5</h3><p>\u9500\u6BC1\u540E\u6B64\u805A\u5408\u8BA2\u9605\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\uFF0C\u539F\u8BA2\u9605\u5730\u5740\u53CA\u5176\u751F\u6210\u5185\u5BB9\u90FD\u5C06\u65E0\u6CD5\u7EE7\u7EED\u4F7F\u7528\uFF0C\u4E14\u6B64\u64CD\u4F5C\u65E0\u6CD5\u6062\u590D\u3002
\u8BF7\u8F93\u5165\u672C\u94FE\u63A5\u7684\u9500\u6BC1\u5BC6\u94A5\u3002</p><input id="guestDestroyKey" class="guest-destroy-input" type="password" autocomplete="current-password" placeholder="\u8BF7\u8F93\u5165\u9500\u6BC1\u5BC6\u94A5"><div class="guest-destroy-actions"><button id="guestDestroyCancel" type="button" class="button secondary guest-destroy-cancel">\u53D6\u6D88</button><button id="guestDestroyConfirm" type="button" class="button guest-destroy-confirm">\u786E\u8BA4\u9500\u6BC1</button></div></div></div>
<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"><\/script>
<script src="/__cfsubs.js" defer><\/script>

</body>
</html>`;
}
__name(renderGuestPage, "renderGuestPage");
async function renderSubUIHome(request, url, env) {
  const cfg = await getConfig(env);
  const apis = normalizeProviderList(cfg.subApis).filter((x) => x.enabled);
  const configs = normalizeProviderList(cfg.subConfigs).filter((x) => x.enabled);
  const defaultApiId = String(cfg.defaultSubApiId || "");
  const defaultConfigId = String(cfg.defaultSubConfigId || "");
  let apiId = defaultApiId && apis.some((x) => x.id === defaultApiId) ? defaultApiId : apis[0]?.id || "";
  let configId = defaultConfigId && configs.some((x) => x.id === defaultConfigId) ? defaultConfigId : configs[0]?.id || "";
  let apiCustom = false;
  let configCustom = false;
  let apiUrl = "";
  let configUrl = "";
  const selectedApi = apis.find((x) => x.id === apiId);
  const selectedConfig = configs.find((x) => x.id === configId);
  const apiCurrentValue = selectedApi?.url || "";
  const configCurrentValue = selectedConfig?.url || "";
  const noAds = "";
  const esc = /* @__PURE__ */ __name((x) => escapeHTML(String(x ?? "")), "esc");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.subName || "SUB")}</title>${cfg.siteLogo ? `<link rel="icon" href="${esc(cfg.siteLogo)}">` : ""}
<style>
${getSubUIStyles()}
.native-picker{display:block;width:100%;min-height:42px;padding:8px 12px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:inherit;font:inherit;cursor:pointer;appearance:auto;-webkit-appearance:auto}
.native-picker:focus{outline:none;border-color:#287ea8;box-shadow:0 0 0 2px rgba(40,126,168,.15)}
.current-box{margin-top:12px}.current-title{font-size:13px;font-weight:700;margin:0 0 7px}.current-row{display:flex;align-items:flex-start;gap:8px}
 .current-api-input{width:100%;height:42px;min-width:0}.current-config-input{width:100%;height:auto!important;min-height:42px!important;line-height:1.5;word-break:break-all;overflow-wrap:anywhere;white-space:normal}.current-config-link{display:flex;align-items:center;min-height:42px;height:auto;padding:10px 12px;border:1px solid rgba(229,229,223,.8);border-radius:8px;background:rgba(250,250,250,.7);box-sizing:border-box;color:#1f4b99;text-decoration:none;cursor:pointer;white-space:normal;word-break:break-all;overflow-wrap:anywhere}.current-api-input.current-config-link{height:auto;min-height:42px}.current-config-link:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10);background:rgba(31,75,153,.04)}.current-config-link:empty{color:#888}.current-config-link:focus-visible{text-decoration:none;outline:none;border-color:#1f4b99;box-shadow:0 0 0 3px rgba(31,75,153,.14)}
.edit-custom{display:none;flex:0 0 auto;min-width:72px}.status-box{margin-top:12px}.status-title{font-size:13px;font-weight:700;margin:0 0 7px}.status-list{display:grid;gap:7px}
.status-item{padding:8px 10px;border-radius:9px;font-weight:650;word-break:break-all}.status-item.wait{background:rgba(255,152,0,.1);border:1px solid rgba(255,152,0,.2);color:#f57c00}.status-item.ok{background:rgba(76,175,80,.12);border:1px solid rgba(76,175,80,.25);color:#2e7d32}.status-item.bad{background:rgba(244,67,54,.1);border:1px solid rgba(244,67,54,.22);color:#c62828}
.custom-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1200;padding:20px}.custom-modal{width:min(480px,100%);background:rgba(255,255,255,.96);border:1px solid rgba(229,229,223,.9);border-radius:18px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.22)}.custom-modal h3{margin:0;font-size:17px}.custom-modal p{margin:6px 0 14px;color:#888;font-size:12px}.custom-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.aggregate-result-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.42);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow:auto;padding:20px}.aggregate-result-modal{position:relative;width:min(620px,calc(100vw - 40px));margin:auto;transition:height .2s ease,transform .2s ease}.aggregate-result-close{position:absolute;top:10px;right:10px;width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:#777;font-size:24px;line-height:32px;text-align:center;cursor:pointer}.aggregate-result-close:hover{background:rgba(0,0,0,.07);color:#222}.aggregate-result-url{display:block;width:100%;padding:12px 14px;margin:14px 0 0;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere;line-height:1.55;user-select:text;text-decoration:none;box-sizing:border-box}.aggregate-result-url:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10)}.aggregate-result-actions{display:flex;justify-content:center;gap:10px;margin:14px auto 0}.aggregate-result-actions .button{width:160px;min-height:40px}.aggregate-result-actions .aggregate-destroy-btn{background:#d93025;color:#fff;border-color:#d93025}.aggregate-result-actions .aggregate-destroy-btn:hover{background:#b91c1c;color:#fff;box-shadow:0 0 0 2px rgba(217,48,37,.12)}.aggregate-result-qr{display:block;margin:16px auto 0;padding:12px;width:max-content;max-width:100%;box-sizing:border-box;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18)}.aggregate-copy-status{min-height:18px;margin:8px 0 0;text-align:center;font-size:13px;font-weight:700;color:transparent}.aggregate-copy-status.success{color:#2e7d32}.aggregate-copy-status.error{color:#c62828}.generated-links-panel{margin-top:14px}.generated-links-list{display:grid;gap:10px;margin-top:10px}.generated-link-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.generated-link-url{display:block;min-width:0;padding:11px 13px;border:1px solid rgba(229,229,223,.8);border-radius:10px;background:rgba(250,250,250,.7);color:#1f4b99;word-break:break-all;overflow-wrap:anywhere;line-height:1.45;text-decoration:none;box-sizing:border-box}.generated-link-url:hover{text-decoration:none;border-color:#1f4b99;box-shadow:0 0 0 2px rgba(31,75,153,.10)}.generated-link-destroy{width:84px;min-height:40px;background:#d93025!important;color:#fff!important;border-color:#d93025!important}.generated-link-destroy:hover{background:#b91c1c!important;box-shadow:0 0 0 2px rgba(217,48,37,.12)}
@media(prefers-color-scheme:dark){.native-picker{background:#111;color:#f1f1f1;border-color:rgba(255,255,255,.14)}.native-picker option{background:#1b1b1b;color:#f1f1f1}.current-api-input,.current-config-input{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.12)}.current-config-link{color:#64b5f6;background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.12)}.current-config-link:hover{color:#64b5f6;text-decoration:none;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}.status-item.ok{background:rgba(129,199,132,.1);color:#81c784;border-color:rgba(129,199,132,.2)}.status-item.bad{background:rgba(229,115,115,.1);color:#e57373;border-color:rgba(229,115,115,.2)}.status-item.wait{background:rgba(255,183,77,.1);color:#ffb74d;border-color:rgba(255,183,77,.2)}.custom-modal{background:rgba(30,30,30,.97);border-color:rgba(255,255,255,.1)}.aggregate-result-url{background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.12);color:#64b5f6}.aggregate-result-url:hover{color:#64b5f6;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}.aggregate-result-qr{background:#fff}.aggregate-result-close{color:#aaa}.aggregate-result-close:hover{background:rgba(255,255,255,.08);color:#fff}.aggregate-result-actions .aggregate-destroy-btn{background:#c62828;color:#fff;border-color:#c62828}.aggregate-result-actions .aggregate-destroy-btn:hover{background:#a61f1f}.aggregate-result-modal>#copyDirect{margin-top:16px}.aggregate-copy-status.success{color:#81c784}.aggregate-copy-status.error{color:#e57373}.generated-link-url{background:rgba(0,0,0,.3);color:#64b5f6;border-color:rgba(255,255,255,.12)}.generated-link-url:hover{color:#64b5f6;border-color:#64b5f6;background:rgba(100,181,246,.08);box-shadow:0 0 0 2px rgba(100,181,246,.10)}}
</style>
</head>
<body>
<main class="page app-shell">
<header class="header home-hero">
<div class="hero-main"><h1 class="title">${esc(cfg.subName || "SUB")}</h1><div class="subtitle">\u751F\u6210\u4E00\u4E2A\u4E13\u5C5E\u4E8E\u4F60\u7684\u805A\u5408\u8BA2\u9605\u94FE\u63A5\uFF0C\u9002\u914DBase64, Clash, Sing-box, Surge, Loon\u7B49\u5E38\u89C1\u683C\u5F0F</div></div>
<div class="backend-version-card"><div class="backend-version-label">\u540E\u7AEF\u7248\u672C</div><div class="backend-version-value" id="apiVersion">\u6B63\u5728\u83B7\u53D6\u2026</div></div>
</header>

<section class="panel"><h2 class="section-title">\u8BA2\u9605\u94FE\u63A5</h2><div class="section-note">\u652F\u6301\u591A\u4E2A\u8BA2\u9605\u5730\u5740\uFF0C\u6BCF\u884C\u4E00\u4E2A\u3002</div><div class="field"><textarea id="sources" placeholder="https://example.com/subscribe&#10;https://example.com/another"></textarea></div></section>

<section class="panel">
<h2 class="section-title">\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF(SUBAPI)</h2><div class="section-note">\u9009\u62E9\u4E00\u4E2A\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\u3002</div>
<select class="native-picker" id="apiPicker" aria-label="\u9009\u62E9\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF" data-default-id="${esc(apiId)}">
${apis.map((x) => `<option value="${esc(x.url)}" data-id="${esc(x.id)}" ${x.id === apiId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}
<option value="__custom">\u81EA\u5B9A\u4E49</option>
</select>
<div class="current-box"><div class="current-title">\u5F53\u524D\u914D\u7F6E</div><div class="current-row"><a id="apiCurrent" class="current-api-input current-config-link" href="${esc(apiCurrentValue)}" target="_blank" rel="noopener noreferrer">${esc(apiCurrentValue) || "\u6682\u65E0\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\uFF0C\u8BF7\u7F16\u8F91"}</a><button type="button" class="button secondary edit-custom" id="editApiCustom">\u7F16\u8F91</button></div></div>
<div class="status-box"><div class="status-title">\u53EF\u7528\u72B6\u6001</div><div id="apiStatus" class="status-list"></div></div>
</section>

<section class="panel">
<h2 class="section-title">\u8BA2\u9605\u8F6C\u6362\u89C4\u5219(SUBCONFIG)</h2><div class="section-note">\u9009\u62E9\u4E00\u4E2A\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\u3002</div>
<select class="native-picker" id="configPicker" aria-label="\u9009\u62E9\u8BA2\u9605\u8F6C\u6362\u89C4\u5219" data-default-id="${esc(configId)}">
${configs.map((x) => `<option value="${esc(x.url)}" data-id="${esc(x.id)}" ${x.id === configId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}
<option value="__custom">\u81EA\u5B9A\u4E49</option>
</select>
<div class="current-box"><div class="current-title">\u5F53\u524D\u914D\u7F6E</div><div class="current-row"><a id="configCurrent" class="current-config-input current-config-link" href="${esc(configCurrentValue)}" target="_blank" rel="noopener noreferrer">${esc(configCurrentValue) || "\u6682\u65E0\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\uFF0C\u8BF7\u7F16\u8F91"}</a><button type="button" class="button secondary edit-custom" id="editConfigCustom">\u7F16\u8F91</button></div></div>
<div class="status-box"><div class="status-title">\u53EF\u7528\u72B6\u6001</div><div id="configStatus" class="status-list"></div></div>
</section>

<section class="panel"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 class="section-title" style="margin-bottom:0">\u6392\u9664\u8282\u70B9</h2><button type="button" class="button secondary" id="editNoAds">\u7F16\u8F91</button></div><div class="section-note">\u516C\u5F00\u4F7F\u7528\u3002\u6BCF\u884C\u586B\u5199\u4E00\u4E2A\u5173\u952E\u8BCD\uFF0C\u5305\u542B\u5173\u952E\u8BCD\u7684\u8282\u70B9\u4F1A\u88AB\u6392\u9664\u3002</div><div class="field" id="noAdsField" style="display:none"><textarea id="noAds" placeholder="\u4F8B\u5982\uFF1At.me&#10;\u5E7F\u544A&#10;example.com">${esc(noAds)}</textarea></div></section>
<section class="panel"><h2 class="section-title">\u5BC6\u94A5</h2><div class="section-note">\u53EF\u9009\u3002\u7528\u4E8E\u5728\u805A\u5408\u8BA2\u9605\u9875\u9762\u9500\u6BC1\u672C\u94FE\u63A5\u3002\u586B\u5199\u540E\uFF0C\u9500\u6BC1\u672C\u94FE\u63A5\u65F6\u9700\u8981\u63D0\u4F9B\u6B64\u5BC6\u94A5\u3002</div><div class="field"><input id="destroyKey" type="password" autocomplete="new-password" placeholder="\u53EF\u9009\uFF0C\u8BBE\u7F6E\u7528\u4E8E\u9500\u6BC1\u672C\u94FE\u63A5\u7684\u5BC6\u94A5"></div></section>
<section class="panel"><h2 class="section-title">\u94FE\u63A5\u8DEF\u5F84</h2><div class="section-note">\u5FC5\u586B\u3002\u4E3A\u5B89\u5168\u8D77\u89C1\uFF0C\u5EFA\u8BAE\u4F7F\u7528\u968F\u673A UUID \u7B49\u590D\u6742\u8DEF\u5F84\uFF0C\u907F\u514D\u4F7F\u7528\u5BB9\u6613\u731C\u5230\u7684\u5185\u5BB9\u3002</div><div class="path-row"><input id="linkPath" type="text" minlength="3" maxlength="128" autocomplete="off" placeholder="\u4F8B\u5982\uFF1A550e8400-e29b-41d4-a716-446655440000"><button type="button" class="button secondary" id="randomLinkPath">\u968F\u673A UUID</button></div></section>
<style>@media(max-width:600px){.path-row{grid-template-columns:1fr}.path-row .button{width:100%}}</style>
<button class="primary" id="generate" type="button">\u751F\u6210\u805A\u5408\u8BA2\u9605\u94FE\u63A5</button>
<section class="panel generated-links-panel" id="generatedLinksPanel" style="display:none"><h2 class="section-title">\u5DF2\u751F\u6210\u7684\u805A\u5408\u8BA2\u9605\u94FE\u63A5</h2><div class="section-note">\u6839\u636E\u672C\u673A\u6D4F\u89C8\u5668\u7F13\u5B58\u663E\u793A\u4F60\u751F\u6210\u8FC7\u7684\u94FE\u63A5\u3002\u94FE\u63A5\u6846\u53EF\u76F4\u63A5\u6253\u5F00\uFF0C\u9500\u6BC1\u540E\u94FE\u63A5\u5C06\u4F1A\u5931\u6548\u3002</div><div id="generatedLinksList" class="generated-links-list"></div></section>
</main>
<div id="aggregateResultModal" class="custom-modal-overlay aggregate-result-overlay"><div class="custom-modal aggregate-result-modal"><button type="button" class="aggregate-result-close" id="aggregateResultClose" aria-label="\u5173\u95ED">\xD7</button><h3>\u805A\u5408\u8BA2\u9605\u94FE\u63A5</h3><p>\u4E8C\u7EF4\u7801\u53EF\u76F4\u63A5\u626B\u7801\u4F7F\u7528\uFF0C\u590D\u5236\u4E0B\u65B9\u8BA2\u9605\u94FE\u63A5\u5373\u53EF\u4F7F\u7528\u3002\u9500\u6BC1\u540E\u94FE\u63A5\u5C06\u4F1A\u5931\u6548\u3002</p><a class="aggregate-result-url" id="direct" href="#" target="_blank" rel="noopener noreferrer"></a><div id="aggregateResultQr" class="aggregate-result-qr"></div><div class="aggregate-result-actions"><button type="button" class="button" id="copyDirect">\u590D\u5236</button><button type="button" class="button aggregate-destroy-btn" id="destroyDirect">\u9500\u6BC1</button></div><div id="aggregateCopyStatus" class="aggregate-copy-status" aria-live="polite"></div></div></div><div id="aggregateCopyNotice" class="toast"></div>

<div id="customApiModal" class="custom-modal-overlay"><div class="custom-modal"><h3>\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF</h3><p>\u8F93\u5165\u4F60\u81EA\u5DF1\u7684 SUBAPI \u5730\u5740\u3002</p><input id="customApiInput" placeholder="https://subapi.example.com"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelApiCustom">\u53D6\u6D88</button><button type="button" class="button" id="saveApiCustom">\u4FDD\u5B58</button></div></div></div>
<div id="customConfigModal" class="custom-modal-overlay"><div class="custom-modal"><h3>\u81EA\u5B9A\u4E49\u8BA2\u9605\u8F6C\u6362\u89C4\u5219</h3><p>\u8F93\u5165\u4F60\u81EA\u5DF1\u7684 SUBCONFIG \u5730\u5740\u3002</p><input id="customConfigInput" placeholder="https://example.com/config.ini"><div class="custom-modal-actions"><button type="button" class="button secondary" id="cancelConfigCustom">\u53D6\u6D88</button><button type="button" class="button" id="saveConfigCustom">\u4FDD\u5B58</button></div></div></div>

<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"><\/script>
<script src="/__cfsubs.js" defer><\/script>
</body></html>`;
}
__name(renderSubUIHome, "renderSubUIHome");
function getSubUIStyles() {
  return getToolStyles() + `
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
`;
}
__name(getSubUIStyles, "getSubUIStyles");
async function listJsonManagerItems(env, query = "") {
  if (!env.KV) return [];
  const keyword = String(query || "").trim().toLowerCase();
  const result = [];
  let cursor;
  do {
    const page = await env.KV.list({
      prefix: URL_PREFIX,
      ...cursor ? { cursor } : {}
    });
    const values = await Promise.all(page.keys.map(async (key) => {
      const token = key.name.slice(URL_PREFIX.length);
      let item = null;
      let raw = await env.KV.get(key.name);
      if (!raw) return null;
      try {
        item = JSON.parse(raw);
        const upperRaw = JSON.stringify(upperCaseObject(item));
        if (upperRaw !== raw) {
          await env.KV.put(key.name, upperRaw);
          raw = upperRaw;
        }
        item = normalizeTokenData(JSON.parse(raw));
      } catch (e) {
      }
      if (keyword && !raw.toLowerCase().includes(keyword) && !token.toLowerCase().includes(keyword)) return null;
      return {
        token,
        subscriptionUrl: item?.subscriptionUrl || "",
        createdAt: item?.createdAt || "",
        updatedAt: item?.updatedAt || "",
        name: item?.name || "\u8BA2\u9605\u94FE\u63A5",
        raw
      };
    }));
    for (const item of values) if (item) result.push(item);
    cursor = page.list_complete ? void 0 : page.cursor;
  } while (cursor);
  result.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || a.token.localeCompare(b.token));
  return result;
}
__name(listJsonManagerItems, "listJsonManagerItems");
function renderJsonManagerPage(url, env, adminPath) {
  const backPath = `/${encodeURIComponent(adminPath)}`;
  const pagePath = `/${encodeURIComponent(adminPath)}/json`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JSON \u7BA1\u7406 \xB7 ${escapeHTML(FileName || "SUB")}</title>${SiteLogo ? `<link rel="icon" href="${escapeHTML(SiteLogo)}">` : ""}<style>
${getToolStyles()}
body{min-height:100vh}.json-shell{max-width:1120px;padding-top:34px!important;padding-bottom:40px}.json-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.json-title{font-size:28px;font-weight:800;line-height:1.2}.json-actions{display:flex;gap:8px;flex-wrap:wrap}.json-actions .button{min-width:86px}.json-toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center}.json-toolbar input{height:42px}.json-toolbar .button{height:42px;white-space:nowrap}.json-danger-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin-top:12px}.json-danger-row input{height:42px}.json-stat{font-size:15px;font-weight:700}.json-list{display:grid;gap:12px;margin-top:14px}.json-item{border:1px solid rgba(120,120,120,.2);border-radius:16px;padding:16px;background:rgba(255,255,255,.58)}.json-item-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.json-item-main{min-width:0}.json-item-title{font-weight:750;margin-bottom:6px}.json-item-url{display:block;color:#2563eb;word-break:break-all;overflow-wrap:anywhere;text-decoration:none;line-height:1.5}.json-item-url:hover{text-decoration:underline}.json-item-meta{font-size:12px;color:#777;margin-top:8px}.json-item-actions{display:flex;gap:8px;flex-wrap:wrap}.json-item-actions button{white-space:nowrap}.json-preview{display:none;margin-top:12px;max-height:360px;overflow:auto;border-radius:12px;padding:12px;background:rgba(10,15,17,.94);color:#d9f7e8;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;white-space:pre-wrap;word-break:break-all}.json-item.open .json-preview{display:block}.json-empty{padding:30px;text-align:center;color:#888}.json-confirm-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:3000;padding:20px}.json-confirm{width:min(460px,100%);background:rgba(255,255,255,.96);border-radius:20px;padding:22px;box-shadow:0 20px 70px rgba(0,0,0,.28)}.json-confirm h3{margin:0 0 8px}.json-confirm p{margin:0;color:#666;line-height:1.6}.json-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.json-confirm .danger{background:#d93025;color:#fff;border-color:#d93025}@media(max-width:720px){.json-toolbar{grid-template-columns:1fr}.json-danger-row{grid-template-columns:1fr}.json-item-head{flex-direction:column}.json-item-actions{width:100%}.json-item-actions .button{flex:1}.json-shell{width:calc(100% - 28px);margin:14px auto}.json-header{gap:12px}.json-actions{width:100%}.json-actions .button{flex:1}}@media(prefers-color-scheme:dark){.json-item{background:rgba(8,12,14,.8);border-color:rgba(255,255,255,.1)}.json-item-meta{color:#9aa7b5}.json-confirm{background:rgba(18,23,25,.98);color:#fff}.json-confirm p{color:#aeb8c1}}
</style></head><body><main class="page app-shell json-shell">
<header class="header json-header"><div><div class="json-title">JSON \u7BA1\u7406</div><div class="subtitle">\u7BA1\u7406\u6240\u6709\u5DF2\u7ECF\u751F\u6210\u7684\u805A\u5408\u8BA2\u9605\u94FE\u63A5\u3002\u5220\u9664\u540E\u5BF9\u5E94\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u4E14\u65E0\u6CD5\u6062\u590D\u3002</div></div><div class="json-actions"><a class="button secondary" href="${backPath}">\u8FD4\u56DE\u540E\u53F0</a><a class="button secondary" href="${pagePath}">\u5237\u65B0</a></div></header>
<section class="panel"><div class="json-toolbar"><input id="jsonSearch" placeholder="\u641C\u7D22 JSON \u5173\u952E\u5B57\u3001\u57DF\u540D\u3001Token\u2026\u2026"><button type="button" class="button" id="jsonSearchBtn">\u641C\u7D22</button><div class="json-stat" id="jsonStat">\u52A0\u8F7D\u4E2D\u2026</div></div><div class="json-danger-row"><input id="jsonKeyword" placeholder="\u8F93\u5165 JSON \u5173\u952E\u5B57\u540E\u6279\u91CF\u5220\u9664\uFF0C\u4F8B\u5982 example.com"><button type="button" class="button danger" id="jsonKeywordDelete">\u6309\u5173\u952E\u5B57\u6279\u91CF\u5220\u9664</button></div></section>
<section class="panel"><div class="json-toolbar" style="grid-template-columns:minmax(0,1fr) auto"><div><h2 class="section-title" style="margin:0">\u5168\u90E8\u805A\u5408\u8BA2\u9605 JSON</h2><div class="section-note">\u641C\u7D22\u4F1A\u5339\u914D JSON \u539F\u6587\uFF0C\u56E0\u6B64 URL\u3001\u89C4\u5219\u3001\u8282\u70B9\u6E90\u3001NOADS \u7B49\u5B57\u6BB5\u90FD\u53EF\u4EE5\u641C\u7D22\u3002</div></div><button type="button" class="button danger" id="jsonDeleteAll">\u5168\u90E8\u5220\u9664</button></div><div id="jsonList" class="json-list"></div></section>
</main>
<div id="jsonConfirmOverlay" class="json-confirm-overlay"><div class="json-confirm"><h3 id="jsonConfirmTitle">\u786E\u8BA4\u64CD\u4F5C</h3><p id="jsonConfirmText"></p><div class="json-confirm-actions"><button type="button" class="button secondary" id="jsonConfirmCancel">\u53D6\u6D88</button><button type="button" class="button danger" id="jsonConfirmOk">\u786E\u8BA4\u5220\u9664</button></div></div></div>
<script>
(function(){
'use strict';
var listEl=document.getElementById('jsonList'),statEl=document.getElementById('jsonStat'),searchEl=document.getElementById('jsonSearch'),keywordEl=document.getElementById('jsonKeyword'),overlay=document.getElementById('jsonConfirmOverlay'),confirmTitle=document.getElementById('jsonConfirmTitle'),confirmText=document.getElementById('jsonConfirmText'),pending=null;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function post(data){return fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},cache:'no-store',body:JSON.stringify(data)}).then(function(r){return r.json().then(function(d){if(!r.ok||!d.ok)throw new Error(d.error||('\u64CD\u4F5C\u5931\u8D25\uFF08HTTP '+r.status+'\uFF09'));return d})})}
function ask(title,text,fn){confirmTitle.textContent=title;confirmText.textContent=text;pending=fn;overlay.style.display='flex'}
function closeConfirm(){overlay.style.display='none';pending=null}
document.getElementById('jsonConfirmCancel').onclick=closeConfirm;document.getElementById('jsonConfirmOk').onclick=function(){if(!pending)return;var fn=pending;pending=null;overlay.style.display='none';fn()};overlay.onclick=function(e){if(e.target===overlay)closeConfirm()};document.addEventListener('keydown',function(e){if(e.key==='Escape')closeConfirm()});
function render(items){statEl.textContent='\u5171 '+items.length+' \u4E2A';if(!items.length){listEl.innerHTML='<div class="json-empty">\u6CA1\u6709\u627E\u5230\u805A\u5408\u8BA2\u9605 JSON\u3002</div>';return}listEl.innerHTML=items.map(function(x,i){var pretty=x.raw;try{pretty=JSON.stringify(JSON.parse(x.raw),null,2)}catch(e){}return '<article class="json-item" data-token="'+esc(x.token)+'"><div class="json-item-head"><div class="json-item-main"><div class="json-item-title">'+esc(x.name||'\u8BA2\u9605\u94FE\u63A5')+' \xB7 '+esc(x.token)+'</div><a class="json-item-url" href="'+esc(x.subscriptionUrl||('/'+x.token))+'" target="_blank" rel="noopener noreferrer">'+esc(x.subscriptionUrl||('/'+x.token))+'</a><div class="json-item-meta">\u521B\u5EFA\uFF1A'+esc(x.createdAt||'\u672A\u77E5')+'\u3000\u66F4\u65B0\uFF1A'+esc(x.updatedAt||'\u672A\u77E5')+'</div></div><div class="json-item-actions"><button type="button" class="button secondary json-view-btn">\u67E5\u770B JSON</button><button type="button" class="button danger json-delete-btn">\u5220\u9664</button></div></div><pre class="json-preview">'+esc(pretty)+'</pre></article>'}).join('');Array.prototype.forEach.call(document.querySelectorAll('.json-view-btn'),function(btn){btn.onclick=function(){btn.closest('.json-item').classList.toggle('open');btn.textContent=btn.closest('.json-item').classList.contains('open')?'\u9690\u85CF JSON':'\u67E5\u770B JSON'}});Array.prototype.forEach.call(document.querySelectorAll('.json-delete-btn'),function(btn){btn.onclick=function(){var item=btn.closest('.json-item'),token=item.getAttribute('data-token');ask('\u5220\u9664\u8FD9\u4E2A\u805A\u5408\u8BA2\u9605\uFF1F','\u5220\u9664\u540E\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u4E14\u65E0\u6CD5\u6062\u590D\u3002',function(){post({type:'json_delete',token:token}).then(load).catch(function(e){alert(e.message||'\u5220\u9664\u5931\u8D25')})})}})}
function load(){var q=searchEl.value.trim();statEl.textContent='\u52A0\u8F7D\u4E2D\u2026';post({type:'json_list',query:q}).then(function(d){render(d.items||[])}).catch(function(e){statEl.textContent='\u52A0\u8F7D\u5931\u8D25';alert(e.message||'\u52A0\u8F7D\u5931\u8D25')})}
document.getElementById('jsonSearchBtn').onclick=load;searchEl.addEventListener('keydown',function(e){if(e.key==='Enter')load()});document.getElementById('jsonDeleteAll').onclick=function(){ask('\u5220\u9664\u5168\u90E8\u805A\u5408\u8BA2\u9605\uFF1F','\u8FD9\u4F1A\u5220\u9664\u5F53\u524D KV \u4E2D\u6240\u6709\u805A\u5408\u8BA2\u9605 JSON\uFF0C\u6240\u6709\u5BF9\u5E94\u94FE\u63A5\u90FD\u4F1A\u7ACB\u5373\u5931\u6548\u4E14\u65E0\u6CD5\u6062\u590D\u3002',function(){post({type:'json_delete_all'}).then(load).catch(function(e){alert(e.message||'\u5220\u9664\u5931\u8D25')})})};document.getElementById('jsonKeywordDelete').onclick=function(){var k=keywordEl.value.trim();if(!k)return alert('\u8BF7\u8F93\u5165 JSON \u5173\u952E\u5B57');ask('\u6309\u5173\u952E\u5B57\u6279\u91CF\u5220\u9664\uFF1F','\u5C06\u5220\u9664 JSON \u539F\u6587\u4E2D\u5305\u542B\u201C'+k+'\u201D\u7684\u6240\u6709\u805A\u5408\u8BA2\u9605\u94FE\u63A5\uFF0C\u5220\u9664\u540E\u65E0\u6CD5\u6062\u590D\u3002',function(){post({type:'json_delete_keyword',keyword:k}).then(function(d){alert('\u5DF2\u5220\u9664 '+(d.deleted||0)+' \u4E2A\u94FE\u63A5');load()}).catch(function(e){alert(e.message||'\u6279\u91CF\u5220\u9664\u5931\u8D25')})})};load();
})();
<\/script></body></html>`;
}
__name(renderJsonManagerPage, "renderJsonManagerPage");
function renderAdminPage(url, env, settings) {
  const apis = normalizeProviderList(settings.subApis), configs = normalizeProviderList(settings.subConfigs);
  const esc = /* @__PURE__ */ __name((x) => escapeHTML(String(x ?? "")), "esc");
  const defaultApiId = String(settings.defaultSubApiId || "");
  const defaultConfigId = String(settings.defaultSubConfigId || "");
  const rows = /* @__PURE__ */ __name((list, type, empty) => list.length ? list.map((x) => {
    return `<div class="link-item provider-item" draggable="true" data-provider-id="${esc(x.id)}">
        <div class="drag-handle" title="\u62D6\u52A8\u6392\u5E8F" aria-label="\u62D6\u52A8\u6392\u5E8F">\u283F</div>
        <div class="provider-main">
            <div class="link-label">${esc(x.name)}</div>
            <a class="provider-url link-url" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a>
        </div>
        <div class="actions admin-row-actions">
            <button type="button" class="secondary" data-provider-action="edit" data-provider-type="${esc(type)}" data-provider-id="${esc(x.id)}" data-provider-name="${esc(x.name)}" data-provider-url="${esc(x.url)}">\u7F16\u8F91</button>
            <button type="button" class="danger" data-provider-action="delete" data-provider-type="${esc(type)}" data-provider-id="${esc(x.id)}">\u5220\u9664</button>
        </div>
    </div>`;
  }).join("") : `<div class="empty">${empty}</div>`, "rows");
  const defaultSelect = /* @__PURE__ */ __name((list, type, defaultId) => {
    const label = type === "subapi" ? "SUBAPI" : "SUBCONFIG";
    return `<select class="default-provider-select" data-type="${esc(type)}" aria-label="\u9ED8\u8BA4${label}">
            ${list.length ? list.map((x) => `<option value="${esc(x.id)}" ${x.id === defaultId ? "selected" : ""}>${esc(x.name)}</option>`).join("") : '<option value="">\u6682\u65E0\u914D\u7F6E</option>'}
        </select>`;
  }, "defaultSelect");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(settings.subName || "SUB")} \xB7 \u7BA1\u7406\u540E\u53F0</title>${settings.siteLogo ? `<link rel="icon" href="${esc(settings.siteLogo)}">` : ""}<style>${getToolStyles()}
.admin-shell{max-width:1100px;padding-top:40px!important;padding-bottom:34px}.admin-shell>.topbar{margin-bottom:18px}.admin-shell>.panel{margin-top:12px}.admin-shell>.panel:first-of-type{margin-top:0}.admin-shell .topbar{padding-bottom:24px}
.sub-head{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:start;gap:14px}.sub-head .section-title{white-space:nowrap;font-size:16px;line-height:40px;margin:0}.sub-head-actions{display:grid;grid-template-columns:270px 190px;align-items:center;justify-content:end;gap:10px;width:100%}.default-provider-select{width:270px;min-width:270px;height:40px;padding:0 30px 0 12px;border:1px solid rgba(120,120,120,.45);border-radius:9px;background:rgba(255,255,255,.7);color:inherit;font-size:14px;font-weight:600;cursor:pointer;box-sizing:border-box}.default-provider-select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.18);width:max-content;min-width:270px;max-width:calc(100vw - 40px)}.sub-head-actions>button{width:190px;min-width:190px;height:40px;white-space:nowrap;word-break:keep-all;overflow:hidden;text-overflow:clip;font-size:14px}.provider-main{min-width:0;width:100%;position:relative;z-index:1}.provider-url{display:block;width:100%;margin-top:6px;margin-bottom:0;word-break:break-all;overflow-wrap:anywhere;line-height:1.55}.provider-item{position:relative;padding:12px 104px 12px 42px;cursor:grab;transition:opacity .15s ease,transform .15s ease,box-shadow .15s ease}.provider-item:active{cursor:grabbing}.provider-item.dragging{opacity:.55}.provider-item.drag-over{box-shadow:inset 0 0 0 2px rgba(59,130,246,.45)}.drag-handle{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:22px;line-height:1;color:#8a8a8a;letter-spacing:-3px;user-select:none;cursor:grab;touch-action:none}.admin-row-actions{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:7px;margin-top:0;align-items:stretch;z-index:2}.admin-row-actions button{min-width:68px}.provider-list.saving-order{opacity:.75;pointer-events:none}.empty{font-size:12px;color:#888}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.topbar-main{min-width:0;flex:1}.site-title-display{font-size:28px;font-weight:700;line-height:1.2;color:#1a1a1a}.site-title-input{font-size:15px!important}.site-title-input:focus{box-shadow:none!important}.top-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.top-actions .button{min-width:86px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px}.modal-content{width:min(460px,100%);background:rgba(255,255,255,.95);border-radius:20px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.5)}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}@media(max-width:760px){.sub-head{grid-template-columns:1fr;gap:8px}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 190px}.default-provider-select{width:100%;min-width:0;font-size:14px}.default-provider-select:focus{width:max-content;min-width:0;max-width:100%}}@media(max-width:600px){.admin-shell{width:calc(100% - 28px);margin-left:14px;margin-right:14px;padding-top:34px!important}.top-actions{width:100%;justify-content:stretch}.top-actions .button{flex:1}.sub-head-actions{width:100%;grid-template-columns:minmax(0,1fr) 170px}.default-provider-select{width:100%;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:10px;padding-right:24px}.default-provider-select:focus{width:100%;min-width:0;max-width:100%;font-size:12px}.sub-head-actions>button{width:170px;min-width:170px;white-space:nowrap}.provider-item{padding:12px 12px 12px 38px;display:block}.provider-main{width:100%;padding-right:0}.provider-url{width:100%;margin-top:7px;line-height:1.5}.admin-row-actions{position:static;display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:10px}.admin-row-actions button{width:100%;min-width:0;height:40px}.drag-handle{left:10px;top:18px;transform:none;font-size:20px}.modal-content{padding:20px}}.json-count-panel{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:18px}.json-count-main{min-width:0}.json-count-main .section-title{margin-bottom:4px}.json-count-value{grid-column:2;font-size:26px;font-weight:800;white-space:nowrap;text-align:center}.json-count-view{grid-column:3;justify-self:end;min-width:92px;text-align:center;text-decoration:none}.json-count-panel>.json-count-main{grid-column:1}.json-count-panel>.json-count-view{grid-column:3}@media(max-width:600px){.json-count-panel{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px}.json-count-main{min-width:0}.json-count-value{font-size:22px}.json-count-view{min-width:76px;padding-left:12px;padding-right:12px}}@media(prefers-color-scheme:dark){.site-title-display{color:#f5f5f5}.site-title-input{color:#f5f5f5!important}.default-provider-select{background:rgba(30,30,30,.92);border-color:rgba(255,255,255,.18);color:#fff}.modal-content{background:rgba(30,30,30,.96);border-color:rgba(255,255,255,.1)}.empty{color:#aaa}body{background:#000;background-image:radial-gradient(circle at 0% 28%,rgba(0,188,212,.14),transparent 24%),radial-gradient(circle at 100% 100%,rgba(0,120,70,.18),transparent 32%),linear-gradient(180deg,#000 0%,#020807 58%,#00140b 100%);background-attachment:fixed;color:#f4f7f8}.page.admin-shell{background:linear-gradient(135deg,rgba(1,5,6,.98) 0%,rgba(2,10,10,.96) 48%,rgba(0,54,35,.92) 100%);border-color:rgba(255,255,255,.13);box-shadow:0 20px 70px rgba(0,0,0,.55)}.admin-shell .header{border-bottom-color:rgba(255,255,255,.10)}.admin-shell .site-title-display,.admin-shell .section-title,.admin-shell label{color:#fff}.admin-shell .subtitle,.admin-shell .empty{color:#9aa7b5}.admin-shell .provider-item{background:rgba(8,12,14,.78);border-color:rgba(255,255,255,.10)}.admin-shell .provider-url{color:#64b5f6}.admin-shell .default-provider-select,.admin-shell input{background:rgba(2,6,8,.82);border-color:rgba(255,255,255,.13);color:#f3f6f7}.admin-shell .modal-content{background:rgba(12,17,19,.97);border-color:rgba(255,255,255,.12);color:#fff}}
/* SUBAPI / SUBCONFIG mobile layout fix */
@media(max-width:600px){
  .sub-head-actions{
    display:flex !important;
    flex-direction:column !important;
    align-items:stretch !important;
    width:100% !important;
    gap:12px !important;
  }
  .sub-head-actions .default-provider-select,
  .sub-head-actions>button{
    width:100% !important;
    min-width:0 !important;
    height:42px !important;
  }
}
</style></head><body><main class="page app-shell admin-shell">
<header class="header topbar"><div class="topbar-main"><div class="site-title-display">${esc(settings.subName || "SUB")}</div><div class="subtitle">\u7BA1\u7406\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\u3001\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\u548C\u7AD9\u70B9\u5B89\u5168\u8BBE\u7F6E\u3002</div></div><div class="top-actions"><button type="button" class="button secondary" data-open-modal="securityModal">\u5B89\u5168</button><button type="button" class="button secondary" data-open-modal="siteModal">\u7AD9\u70B9</button><a class="button danger" href="/${esc(settings.adminPath || "admin")}/logout">\u9000\u51FA</a></div></header>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF(SUBAPI)</h2></div><div class="sub-head-actions">${defaultSelect(apis, "subapi", defaultApiId)}<button type="button" data-provider-action="add" data-provider-type="subapi">\uFF0B \u6DFB\u52A0\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF</button></div></div><div class="sub-grid provider-list" data-provider-type="subapi" style="margin-top:12px">${rows(apis, "subapi", "\u6682\u65E0\u8BA2\u9605\u8F6C\u6362\u540E\u7AEF\uFF0C\u8BF7\u624B\u52A8\u6DFB\u52A0\u3002")}</div></section>
<section class="panel"><div class="sub-head"><div><h2 class="section-title">\u8BA2\u9605\u8F6C\u6362\u89C4\u5219(SUBCONFIG)</h2></div><div class="sub-head-actions">${defaultSelect(configs, "subconfig", defaultConfigId)}<button type="button" data-provider-action="add" data-provider-type="subconfig">\uFF0B \u6DFB\u52A0\u8BA2\u9605\u8F6C\u6362\u89C4\u5219</button></div></div><div class="sub-grid provider-list" data-provider-type="subconfig" style="margin-top:12px">${rows(configs, "subconfig", "\u6682\u65E0\u8BA2\u9605\u8F6C\u6362\u89C4\u5219\uFF0C\u8BF7\u624B\u52A8\u6DFB\u52A0\u3002")}</div></section>
<section class="panel json-count-panel"><div class="json-count-main"><h2 class="section-title">\u805A\u5408\u8BA2\u9605\u94FE\u63A5</h2><div class="section-note">\u7BA1\u7406\u5F53\u524D KV \u4E2D\u5DF2\u7ECF\u751F\u6210\u7684\u805A\u5408\u8BA2\u9605 JSON\u3002</div></div><div class="json-count-value" id="jsonCountValue">\u52A0\u8F7D\u4E2D\u2026</div><a class="button json-count-view" href="/${esc(settings.adminPath || "admin")}/json">\u67E5\u770B</a></section>
</main>
<div id="providerModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title" id="modalTitle">\u6DFB\u52A0</h2><div class="field"><label for="modalName">\u5907\u6CE8</label><input id="modalName"></div><div class="field"><label for="modalUrl">URL</label><input id="modalUrl" placeholder="https://..."></div><div class="modal-actions"><button type="button" class="secondary" id="providerCancel">\u53D6\u6D88</button><button type="button" id="modalSave">\u4FDD\u5B58</button></div></div></div>
<div id="securityModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">\u5B89\u5168</h2><div class="section-note">\u4FEE\u6539\u7BA1\u7406\u5458\u8D26\u53F7\u548C\u5BC6\u7801\u3002\u4FEE\u6539\u5BC6\u7801\u65F6\u5FC5\u987B\u8F93\u5165\u4E24\u6B21\uFF1B\u4E24\u6B21\u7559\u7A7A\u8868\u793A\u4FDD\u6301\u539F\u5BC6\u7801\u3002</div><div class="field"><label for="securityUser">\u7BA1\u7406\u5458\u8D26\u53F7</label><input id="securityUser" value="${esc(settings.user || "")}" autocomplete="username"></div><div class="field"><label for="securityPass">\u7BA1\u7406\u5458\u5BC6\u7801</label><input id="securityPass" type="password" placeholder="\u7559\u7A7A\u4FDD\u6301\u539F\u5BC6\u7801" autocomplete="new-password"></div><div class="field"><label for="securityPass2">\u786E\u8BA4\u7BA1\u7406\u5458\u5BC6\u7801</label><input id="securityPass2" type="password" placeholder="\u518D\u6B21\u8F93\u5165\u65B0\u5BC6\u7801" autocomplete="new-password"></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="securityModal">\u53D6\u6D88</button><button type="button" id="saveSecurity">\u4FDD\u5B58</button></div></div></div>
<div id="siteModal" class="modal-overlay"><div class="modal-content"><h2 class="section-title">\u7AD9\u70B9</h2><div class="field"><label for="siteName">\u7AD9\u70B9\u6807\u9898</label><input id="siteName" value="${esc(settings.subName || "SUB")}" placeholder="SUB"></div><div class="field"><label for="sitePath">\u7BA1\u7406\u5458\u8DEF\u5F84</label><input id="sitePath" value="${esc(settings.adminPath || "admin")}" placeholder="admin"></div><div class="field"><label for="siteLogo">\u5168\u7AD9 Logo \u5730\u5740</label><input id="siteLogo" value="${esc(settings.siteLogo || "")}" placeholder="https://example.com/favicon.png" type="url"><div class="section-note">\u652F\u6301 http:// \u6216 https:// \u76F4\u94FE\uFF1B\u7559\u7A7A\u5219\u4E0D\u8BBE\u7F6E\u3002\u6B64 Logo \u4F1A\u7528\u4E8E\u5168\u7AD9\u6807\u7B7E\u680F\u3002</div></div><div class="modal-actions"><button type="button" class="secondary" data-close-modal="siteModal">\u53D6\u6D88</button><button type="button" id="saveSite">\u4FDD\u5B58</button></div></div></div>
<script>document.addEventListener('DOMContentLoaded',function(){fetch('/api/admin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({type:'json_list',query:''})}).then(function(r){return r.json()}).then(function(d){var e=document.getElementById('jsonCountValue');if(e)e.textContent=d&&d.ok?String(d.count||0)+' \u4E2A':'\u8BFB\u53D6\u5931\u8D25'}).catch(function(){var e=document.getElementById('jsonCountValue');if(e)e.textContent='\u8BFB\u53D6\u5931\u8D25'})});<\/script><script src="/__cfsubs.js" defer><\/script></body></html>`;
}
__name(renderAdminPage, "renderAdminPage");

// ../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ly8n5r/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ly8n5r/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=_worker.js.map
