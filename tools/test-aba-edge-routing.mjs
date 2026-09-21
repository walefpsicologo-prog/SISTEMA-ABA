import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GENERAL_JS } from '../platform/edge-functions/sistema-aba-walef/general.ts';
import { LAYOUT_JS, LAYOUT_CSS } from '../platform/edge-functions/sistema-aba-walef/layout.ts';
import { APPLICATOR_JS, PARENT_JS } from '../platform/edge-functions/sistema-aba-walef/portals.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=await fs.readFile(path.join(root,'platform/edge-functions/sistema-aba-walef/index.ts'),'utf8');
let handler;
const context={
  GENERAL_JS,LAYOUT_JS,LAYOUT_CSS,APPLICATOR_JS,PARENT_JS,
  Headers,Response,URL,Map,console,
  Deno:{serve(fn){handler=fn;}},
  fetch:async url=>{
    const marker='/platform/';
    const relative=new URL(url).pathname.split(marker)[1];
    if(!relative||relative.includes('..'))throw new Error('Unexpected source request');
    return new Response(await fs.readFile(path.join(root,'platform',relative),'utf8'));
  }
};
vm.createContext(context);
vm.runInContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm,'')),context);
const response=async route=>handler(new Request('https://example.test/sistema-aba-walef'+route));

test('main route loads all 12 feature modules and does not eagerly load the criterion catalog',async()=>{
  const res=await response('/assets/js/sistema-aba.js');
  assert.equal(res.status,200);
  const code=await res.text();
  assert.equal((code.match(/import\('/g)||[]).length,12);
  for(const name of ['production','access-admin','clinical-integrity','family-supervisor','family-access']){
    assert.ok(code.includes('sistema-aba-'+name+'.js?v=20260921-access-review-v57'));
  }
  assert.ok(!code.includes("query('aba_protocol_criteria','*',q=>q.eq('active',true).order('position'))"));
  assert.ok(code.includes("location.replace('https://walef-sistema-aba.vercel.app/')"));
  new vm.SourceTextModule(code);
});

test('raw route preserves feature loading and correct raw asset prefixes',async()=>{
  const code=await (await response('/raw/assets/js/sistema-aba.js')).text();
  assert.equal((code.match(/\/raw\/assets\/js\/sistema-aba-/g)||[]).length,12);
});

test('embedded production module receives observer-loop protection',async()=>{
  const code=await (await response('/assets/js/sistema-aba-production.js')).text();
  assert.ok(code.includes('__abaSemanticQueued'));
  assert.ok(!code.includes('new MutationObserver(()=>queueMicrotask(semantic))'));
  new vm.SourceTextModule(code);
});

test('family and applicator route source remains byte-for-byte unchanged',async()=>{
  assert.equal(await (await response('/assets/js/sistema-aba-pais.js')).text(),PARENT_JS);
  assert.equal(await (await response('/assets/js/sistema-aba-aplicador.js')).text(),APPLICATOR_JS);
});

test('all imported modules return parseable JavaScript',async()=>{
  const main=await (await response('/assets/js/sistema-aba.js')).text();
  const urls=[...main.matchAll(/import\('([^']+)'\)/g)].map(m=>m[1]);
  for(const url of urls){
    const route=new URL(url).pathname.split('/sistema-aba-walef')[1];
    const res=await response(route);
    assert.equal(res.status,200,route);
    new vm.SourceTextModule(await res.text());
  }
});

function credentialHarness({email='admin@example.test',profileError=null,pending=false}={}){
  const ids=['abaCredentialModal','abaCredentialCancel','abaCredentialSave','abaCredentialEmail','abaCredentialPassword','abaCredentialPassword2','abaCredentialMsg'];
  const elements=Object.fromEntries(ids.map(id=>[id,{value:'',textContent:'',className:'',classList:{add(){},remove(){}}}]));
  const calls=[];
  const ctx={
    document:{readyState:'loading',querySelector:s=>elements[s.slice(1)],addEventListener(){}},
    confirm:()=>true,
    sb:{auth:{updateUser:async changes=>{calls.push({kind:'auth',changes});return {data:{user:{id:'test-admin',email:pending?'admin@example.test':email,...(pending?{new_email:email}:{})}},error:null};}},
      from:table=>({update:payload=>({eq:async()=>{calls.push({kind:'profile',table,payload});return {error:profileError};}})})}
  };
  vm.createContext(ctx);
  vm.runInContext(GENERAL_JS['/assets/js/sistema-aba-admin-credentials.js'].replace(/^import .*;\n/,''),ctx);
  ctx.modal('admin@example.test');
  elements.abaCredentialEmail.value=email;
  elements.abaCredentialPassword.value='Fictitious-Test-Password-123!';
  elements.abaCredentialPassword2.value='Fictitious-Test-Password-123!';
  return {elements,calls,save:()=>elements.abaCredentialSave.onclick()};
}

test('password can change without requesting a new email or rewriting clinical notes',async()=>{
  const h=credentialHarness();await h.save();
  assert.equal(h.calls.length,1);
  assert.ok(!('email' in h.calls[0].changes));
  assert.equal(h.calls[0].changes.data.must_change_password,false);
  assert.match(h.elements.abaCredentialMsg.textContent,/e-mail de login permanece/);
  assert.equal(h.elements.abaCredentialPassword.value,'');
});

test('pending email confirmation retains the current profile email',async()=>{
  const h=credentialHarness({email:'new@example.test',pending:true});await h.save();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].changes.email,'new@example.test');
  assert.match(h.elements.abaCredentialMsg.textContent,/Confirme o novo e-mail/);
});

test('a partial profile sync failure reports the password success accurately',async()=>{
  const h=credentialHarness({email:'new@example.test',profileError:{message:'test failure'}});await h.save();
  assert.equal(h.calls.length,2);
  assert.ok(!('notes' in h.calls[1].payload));
  assert.match(h.elements.abaCredentialMsg.textContent,/ainda não foi sincronizado/);
});

test('mismatched confirmation never sends an authentication update',async()=>{
  const h=credentialHarness();h.elements.abaCredentialPassword2.value='Different-Value-123!';await h.save();
  assert.equal(h.calls.length,0);
  assert.match(h.elements.abaCredentialMsg.textContent,/não coincidem/);
});
