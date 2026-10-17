'use strict';
// Uses the configured Git credential helper without printing or storing credentials.
// Draft only: stable publication remains a separate user decision after acceptance.
const {spawnSync,execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),repo='Justin-Dong1/hive-desktop';
(async()=>{
 if(require('../package.json').license==='GPL-3.0-only'&&fs.readFileSync(path.join(root,'tools','prepare-release.ps1'),'utf8').includes('naudio/1.10.0'))throw Error('Publishing blocked: resolve NAudio 1.10 Ms-PL / GPL compatibility first; see docs/PUBLIC-READINESS.md');
 const remote=execFileSync('git',['remote','get-url','origin'],{cwd:root,encoding:'utf8'}).trim();
 if(remote!==`https://github.com/${repo}.git`)throw Error('Unexpected publishing remote');
 const credential=spawnSync('git',['-c','credential.interactive=never','credential','fill'],{cwd:root,input:`protocol=https\nhost=github.com\npath=${repo}.git\n\n`,encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
 if(credential.status!==0)throw Error('Git authentication unavailable');
 const token=credential.stdout.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);credential.stdout='';
 if(!token)throw Error('No credential returned');
 const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 async function api(route,method='GET',body){const response=await fetch(`https://api.github.com/repos/${repo}${route}`,{method,headers:{...headers,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!response.ok)throw Error(`GitHub request failed: ${response.status}`);return response.json();}
 const version=require('../package.json').version,tag=`v${version}-beta.1`;
 const releases=await api('/releases');const existing=releases.find(r=>r.tag_name===tag);
 const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist','release-manifest.json'),'utf8'));
 if(manifest.commit!==sha||manifest.version!==version)throw Error('Build does not match current commit/version');
 if(existing&&(!existing.draft||existing.target_commitish!==sha))throw Error('Existing release does not match this draft/commit; inspect before updating');
 const release=existing||await api('/releases','POST',{tag_name:tag,target_commitish:sha,name:`蜂巢桌面 ${version} · 安装测试版`,draft:true,prerelease:true,body:'Windows x64 安装测试版，无需 Node.js/pnpm。Wallpaper Engine 可选，内置频谱组件。\n\n首次引导支持登录启动和壁纸关联；布局和便签保留。\n\n注意：未代码签名，未完成真实安装/覆盖升级/卸载验收。请先在测试环境验证，再决定发布。请核对 SHA256SUMS.txt。\n\n详细验收范围见仓库 docs/INSTALLER-TESTING.md。'});
 console.log(JSON.stringify({draftId:release.id,assets:release.assets.map(a=>({name:a.name,size:a.size,state:a.state})),url:release.html_url}));
 if(process.argv.includes('--inspect'))return;
 for(const name of [`HiveDesktop-Setup-${version}-x64.exe`,'SHA256SUMS.txt','release-manifest.json']){
  const body=fs.readFileSync(path.join(root,'dist',name)),assetHash='sha256:'+require('crypto').createHash('sha256').update(body).digest('hex');
  const prior=release.assets.find(a=>a.name===name);
  if(prior){if(prior.state==='uploaded'&&prior.digest===assetHash){console.log('Already verified: '+name);continue;}throw Error('Existing asset requires inspection: '+name);}
  console.log('Uploading: '+name);
  const response=await fetch(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(name),{method:'POST',headers:{...headers,'Content-Type':'application/octet-stream'},body,signal:AbortSignal.timeout(300000)});
  if(!response.ok)throw Error(`Asset upload failed: ${response.status}; draft ${release.id} retained for inspection`);
  const asset=await response.json();console.log(JSON.stringify({asset:asset.name,bytes:asset.size}));
 }
 const verified=await api(`/releases/${release.id}`);console.log(JSON.stringify({draft:verified.draft,url:verified.html_url,assets:verified.assets.map(a=>({name:a.name,size:a.size}))}));
})().catch(e=>{console.error(e.message+(e.cause?.code?' ('+e.cause.code+')':''));process.exitCode=1;});
