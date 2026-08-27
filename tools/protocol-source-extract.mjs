import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const sources = {
  ablls: 'https://pdfcoffee.com/ablls-protocolo-pdf-free.html',
  ablls_translated: 'https://pdfcoffee.com/ablls-r-traduzida-protocolo-pdf-free.html',
  afls_table: 'https://pdfcoffee.com/afls-tabela-pdf-free.html',
  afls_basic: 'https://pdfcoffee.com/afls-habilidades-de-vida-basica-fp-pdf-free.html',
  afls_domestic: 'https://pdfcoffee.com/afls-habilidades-vida-domestica-pdf-free.html',
  afls_community: 'https://pdfcoffee.com/afls-participaao-comunitaria-fp-pdf-free.html',
  afls_school: 'https://pdfcoffee.com/afls-habilidades-escolares-pdf-free.html',
  afls_independent: 'https://pdfcoffee.com/afls-habilidades-de-vida-funcional-pdf-free.html',
  afls_vocational_1: 'https://pdfcoffee.com/afls-habilidades-vocacionais-part-1-pdf-free.html',
  afls_vocational_2: 'https://pdfcoffee.com/afls-habilidades-vocacionais-part-2-pdf-free.html'
};

await mkdir('protocol-source-out', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled','--no-sandbox','--disable-dev-shm-usage'] });
const context = await browser.newContext({
  locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 1100 }, javaScriptEnabled: true,
  extraHTTPHeaders: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7' }
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR','pt','en-US','en'] });
});

const manifest = {};
for (const [name,url] of Object.entries(sources)) {
  const page = await context.newPage();
  try {
    const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(6000);
    const title=await page.title();
    const text=await page.locator('body').innerText({timeout:30000});
    const html=await page.content();
    await writeFile(`protocol-source-out/${name}.txt`,text,'utf8');
    await writeFile(`protocol-source-out/${name}.html`,html,'utf8');
    manifest[name]={url,status:response?.status()??null,title,textLength:text.length,htmlLength:html.length,prefix:text.slice(0,250)};
  } catch(e) { manifest[name]={url,error:String(e?.stack||e)}; }
  finally { await page.close(); }
}
await browser.close();
await writeFile('protocol-source-out/manifest.json',JSON.stringify(manifest,null,2),'utf8');
console.log(JSON.stringify(manifest,null,2));
