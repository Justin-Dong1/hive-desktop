'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
module.exports=async context=>{
 const root=context.packager.projectDir,app=path.join(context.appOutDir,'resources','app');
 if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim())throw Error('Release requires a clean committed source tree');
 const files={};
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()){walk(file);continue;}const rel=path.relative(app,file).replace(/\\/g,'/');
  if(!/^(main\.js|preload\.js|package\.json|taskbar-policy\.json|THIRD_PARTY_NOTICES\.md|ui\/|tools\/|vendor\/NAudio-1\.10\/)/.test(rel)||/^tools\/(test-|verify-|capture-)/.test(rel))throw Error('Unexpected packaged file: '+rel);
  const original=path.join(root,rel);if(!fs.existsSync(original))throw Error('Unknown packaged resource: '+rel);
  if(rel==='package.json'){const a=JSON.parse(fs.readFileSync(file)),b=JSON.parse(fs.readFileSync(original));for(const key of ['name','version','main'])if(a[key]!==b[key])throw Error('Package metadata mismatch: '+key);}
  else if(hash(file)!==hash(original))throw Error('Packaged source differs from current source: '+rel);
  files[rel]=hash(file);
 }}walk(app);
 const manifest={version:require(path.join(root,'package.json')).version,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),files};
 fs.writeFileSync(path.join(app,'release-manifest.json'),JSON.stringify(manifest,null,2));
 fs.writeFileSync(path.join(root,'dist','release-manifest.json'),JSON.stringify(manifest,null,2));
 console.log(`PASS release parity: ${Object.keys(files).length} files tied to ${manifest.commit}`);
};
