import { describe, expect, it } from "vitest";
import { emailContent, personalizeEmail, safeEmailUrl, sanitizeEmailHtml, unknownEmailTokens } from "../packages/ui/src/email-html";
import { blankDraft, draftStoreKey, loadDemoStore, readTemplate, starterTemplates, templateStoreKey, templateValidation, writeDemoStore } from "../apps/web/src/email-store";

describe("Email HTML trust boundaries",()=>{
  it("removes executable markup, beacons, CSS URLs, namespaces and dangerous links",()=>{
    const html=sanitizeEmailHtml('<script>alert(1)</script><img src="https://example.com/beacon" onerror="alert(1)"><svg><a href="javascript:alert(1)">x</a></svg><math><mi>x</mi></math><iframe src="https://example.com"></iframe><form><input name=x></form><p onclick="alert(1)" style="color:#236bff;background-image:url(https://example.com);position:fixed">Safe <strong>bold</strong></p><a href="javascript:alert(1)">bad</a><a href="data:text/html,x">data</a>');
    expect(html).not.toMatch(/script|onerror|onclick|<img|<svg|<math|<iframe|<form|<input|javascript:|data:|url\(|position:/i);
    expect(html).toContain("<strong>bold</strong>");expect(html).toMatch(/color:/);
  });
  it("retains only reviewed font families, sizes, colors and alignment",()=>{
    const html=sanitizeEmailHtml('<p style="text-align:center;color:rgb(35,107,255)"><span style="font-family:Georgia;font-size:24px;background-color:#ffffff">Hello</span><span style="font-family:Evil;font-size:900px;line-height:20;opacity:0">world</span></p>');
    expect(html).toContain("text-align:center");expect(html).toContain("font-family:Georgia");expect(html).toContain("font-size:24px");expect(html).not.toMatch(/Evil|900px|line-height|opacity/);
  });
  it("accepts HTTPS and plain mailto only; blocks control chars, credentials and templated URLs",()=>{
    for(const url of ['javascript:alert(1)','data:text/html,x','http://example.com','//example.com','https://user:password@example.com','https://example.com/{{student_name}}','java\nscript:alert(1)','mailto:test@example.com?subject=x'])expect(safeEmailUrl(url)).toBeNull();
    expect(safeEmailUrl('https://example.com/resources')).toBe('https://example.com/resources');expect(safeEmailUrl('mailto:learning@example.com')).toBe('mailto:learning@example.com');
    expect(sanitizeEmailHtml('<a href="https://example.com" target="_self">Link</a>')).toContain('rel="noopener noreferrer"');
  });
  it("normalizes malformed HTML and remains idempotent",()=>{
    const input='<p><b>Hello<i>there</b></i><a href="java&#x73;cript:alert(1)">x';const safe=sanitizeEmailHtml(input);expect(safe).not.toContain('javascript');expect(sanitizeEmailHtml(safe)).toBe(safe);
  });
  it("keeps template variables and substitutes text nodes safely, never attributes",()=>{
    const source='<p><strong>{{student_name}}</strong> in {{course_name}} / {{batch_name}} {{unknown}}</p><a href="https://example.com">{{student_name}}</a>';
    const content=emailContent(source);expect(content.html).toContain('{{student_name}}');
    const result=personalizeEmail(source,{student_name:'<img src=x onerror=alert(1)>',course_name:'A & B',batch_name:'Morning'});
    expect(result.html).not.toContain('<img');expect(result.html).toContain('&lt;img');expect(result.html).toContain('href="https://example.com/"');expect(result.plainText).toContain('A & B');expect(unknownEmailTokens(content)).toEqual(['{{unknown}}']);
  });
  it("rejects oversized input rather than displaying it raw",()=>{expect(()=>sanitizeEmailHtml('x'.repeat(100001))).toThrow(/limit/);});
});

describe("Versioned browser-only demo store",()=>{
  it("loads sanitized documents and recomputes plain text rather than trusting stored content",()=>{
    const draft={...blankDraft(),subject:'Demo',content:{version:1,html:'<p>Hello<script>x</script><img src=x></p>',plainText:'untrusted'}};
    const result=loadDemoStore({getItem:key=>key===draftStoreKey?JSON.stringify({version:1,draft}):null});
    expect(result.draft.content.plainText).toBe('Hello');expect(result.draft.content.html).not.toContain('<img');expect(result.draftBlocked).toBe(false);
  });
  it("does not overwrite corrupted JSON or unsupported schema and reports storage denial",()=>{
    for(const raw of ['{bad','{"version":99,"items":[]}']){const result=loadDemoStore({getItem:()=>raw});expect(result.warnings.length).toBeGreaterThan(0);expect(result.templatesBlocked).toBe(true);}
    const result=loadDemoStore({getItem:()=>{throw new Error('denied');}});expect(result.draftBlocked).toBe(true);expect(result.templatesBlocked).toBe(true);
  });
  it("reports quota failures without claiming saved and uses a versioned namespace",()=>{
    expect(writeDemoStore({setItem:()=>{throw new Error('quota');}},templateStoreKey,{})).toMatch(/Not saved/);
    let saved='';expect(writeDemoStore({setItem:(key,value)=>{saved=key+value;}},templateStoreKey,{version:1,items:[]})).toBeNull();expect(saved).toContain('bcs-demo-templates-v1');
  });
  it("validates required fields and duplicates and refuses forged starter metadata",()=>{
    const all=starterTemplates();const custom={...all[0],id:'custom-test',builtIn:false};expect(templateValidation(custom,all)).toMatch(/already exists/);
    expect(templateValidation({...custom,name:'Unique',content:emailContent('<p><br></p>')},all)).toMatch(/meaningful/);
    expect(()=>readTemplate({...custom,id:'starter-1'})).toThrow();expect(readTemplate({...custom,builtIn:true}).builtIn).toBe(false);
  });
});

it("substitutes tokens split by inline formatting without interpreting recipient HTML",()=>{ const result=personalizeEmail('<p>Hello {{stu<strong>dent_</strong>name}}, {{course_name}}</p>',{student_name:"<Learner>",course_name:"Demo"});expect(result.plainText).toBe("Hello <Learner>, Demo");expect(result.html).toContain("&lt;Learner&gt;");});
