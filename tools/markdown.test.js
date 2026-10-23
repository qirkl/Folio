/* Tests for src/js/markdown.js (the rewritten engine).
 *
 *   bun tools/markdown.test.js
 *
 * The loader is a pure string transform. The serialiser walks a DOM, so the
 * suite builds one: either by hand, or with parseHtml() below, which reads back
 * the HTML the loader produced. That is what makes the stability checks
 * meaningful — they go markdown -> HTML -> DOM -> markdown and require the same
 * bytes back.
 */

const { toHtml, toMd } = require('../src/js/markdown.js');

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed++;
  else failures.push(`${name}\n    expected: ${e}\n    actual:   ${a}`);
}

// ---------------------------------------------------------------- fake DOM

const txt = (s) => ({ nodeType: 3, nodeValue: s, get textContent() { return s; } });

function el(tagName, attrs, kids) {
  kids = kids || [];
  const node = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: kids,
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    get textContent() { return kids.map((k) => k.textContent || '').join(''); },
    querySelector(sel) {
      const want = sel.toLowerCase();
      const walk = (n) => {
        for (const k of n.childNodes || []) {
          if (k.nodeType !== 1) continue;
          if (String(k.tagName).toLowerCase() === want) return k;
          const found = walk(k);
          if (found) return found;
        }
        return null;
      };
      return walk(node);
    },
  };
  return node;
}

const doc = (...kids) => ({ nodeType: 9, childNodes: kids });
const p = (...kids) => el('p', {}, kids);

/* A deliberately small HTML reader: tags with quoted attributes, text, and the
   four entities our writer produces. Enough to parse our own output. */
function parseHtml(html) {
  const root = { nodeType: 9, childNodes: [] };
  const stack = [root];
  const decode = (s) => s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const re = /<(\/?)([a-zA-Z0-9]+)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[5] !== undefined) {
      if (m[5]) stack[stack.length - 1].childNodes.push(txt(decode(m[5])));
      continue;
    }
    const [, closing, name, attrText, selfClose] = m;
    if (closing) { if (stack.length > 1) stack.pop(); continue; }
    const attrs = {};
    (attrText || '').replace(/([a-zA-Z-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = decode(v); });
    const node = el(name, attrs, []);
    stack[stack.length - 1].childNodes.push(node);
    const VOID = /^(br|img)$/i.test(name);
    if (!selfClose && !VOID) stack.push(node);
  }
  return root;
}

const back = (md) => toMd(parseHtml(toHtml(md)));

// ---------------------------------------------------------- markdown -> HTML

check('empty document', toHtml(''), '<p><br></p>');
check('heading', toHtml('# Title'), '<h1>Title</h1>');
check('h3', toHtml('### Deep'), '<h3>Deep</h3>');
check('h6', toHtml('###### Six'), '<h6>Six</h6>');
check('bold', toHtml('**bold**'), '<p><strong>bold</strong></p>');
check('italic + strike', toHtml('*it* and ~~gone~~'), '<p><em>it</em> and <del>gone</del></p>');
check('highlight', toHtml('==marked=='), '<p><span class="mark">marked</span></p>');
check('underline survives as html', toHtml('<u>u</u>'), '<p><u>u</u></p>');
check('inline code', toHtml('`x = 1`'), '<p><code>x = 1</code></p>');
check('link', toHtml('[here](https://example.com)'), '<p><a href="https://example.com">here</a></p>');
check('bullets', toHtml('- one\n- two'), '<ul><li>one</li><li>two</li></ul>');
check('numbers', toHtml('1. one\n2. two'), '<ol><li>one</li><li>two</li></ol>');
check('quote', toHtml('> quoted'), '<blockquote><p>quoted</p></blockquote>');
check('multi-line quote', toHtml('> one\n> two'), '<blockquote><p>one<br>two</p></blockquote>');
check('fence', toHtml('```\ncode\n```'), '<pre><code>code</code></pre>');
check('fence keeps its own indentation', toHtml('```\n  if (x) {\n    y();\n  }\n```'),
  '<pre><code>  if (x) {\n    y();\n  }</code></pre>');
check('soft break inside a paragraph', toHtml('one\ntwo'), '<p>one<br>two</p>');
check('escaped star stays literal', toHtml('\\*x\\*'), '<p>*x*</p>');
check('escaped brackets', toHtml('\\[not a link\\]'), '<p>[not a link]</p>');
check('line of list continues', toHtml('- one\n  continued\n- two'), '<ul><li>one<br>continued</li><li>two</li></ul>');

check('styled span, browser spacing', toHtml('<span style="font-size: 20px">big</span>'),
  '<p><span style="font-size:20px">big</span></p>');
check('styled span, family and size',
  toHtml('<span style="font-family:Georgia; font-size:18px">both</span>'),
  '<p><span style="font-family:Georgia;font-size:18px">both</span></p>');
check('nested styled span flattens on load',
  toHtml('<span style="font-family:Verdana"><span style="font-size:16px">deep</span></span>'),
  '<p><span style="font-family:Verdana;font-size:16px">deep</span></p>');
check('stray span closer is dropped', toHtml('text</span>more'), '<p>textmore</p>');
check('unknown html is text', toHtml('<div>x</div>'), '<p>&lt;div&gt;x&lt;/div&gt;</p>');

check('picture line becomes a frame', toHtml('![alt](pic.png "300x200+12+4")'),
  '<div class="photos" contenteditable="false"><figure class="photo" style="left:12px;top:4px;width:300px;height:200px">' +
  '<img alt="alt" src="pic.png"><span class="photo-rotate"></span><span class="photo-handle"></span></figure></div>');
check('two pictures share one group',
  toHtml('![a](a.png)\n![b](b.png)').split('<figure').length - 1, 2);
check('an inline picture stays inline', toHtml('before ![a](a.png) after'),
  '<p>before <img alt="a" src="a.png"> after</p>');

// ---------------------------------------------------------- HTML -> markdown

check('block aliases', toMd(doc(
  el('h1', {}, [txt('Title')]),
  p(txt('plain')),
  el('ul', {}, [el('li', {}, [txt('one')]), el('li', {}, [txt('two')])]),
  el('ol', {}, [el('li', {}, [txt('first')])]),
  el('blockquote', {}, [p(txt('quoted'))]),
  el('pre', {}, [el('code', {}, [txt('x = 1')])])
)), '# Title\n\nplain\n\n- one\n- two\n\n1. first\n\n> quoted\n\n```\nx = 1\n```\n');

check('bold aliases become one spelling',
  toMd(doc(p(el('b', {}, [txt('b')]), txt(' '), el('strong', {}, [txt('s')])))),
  '**b** **s**\n');
check('italic aliases', toMd(doc(p(el('i', {}, [txt('i')]), txt(' '), el('em', {}, [txt('e')])))),
  '*i* *e*\n');
check('strike aliases',
  toMd(doc(p(el('s', {}, [txt('s')]), txt(' '), el('strike', {}, [txt('k')]), txt(' '), el('del', {}, [txt('d')])))),
  '~~s~~ ~~k~~ ~~d~~\n');
check('underline', toMd(doc(p(el('u', {}, [txt('u')])))), '<u>u</u>\n');
check('code with a backtick uses the longer fence', toMd(doc(p(el('code', {}, [txt('a`b')])))), '``a`b``\n');
check('link', toMd(doc(p(el('a', { href: 'https://x.test' }, [txt('here')])))), '[here](https://x.test)\n');
check('highlight', toMd(doc(p(el('span', { class: 'mark' }, [txt('m')])))), '==m==\n');
check('style written canonically',
  toMd(doc(p(el('span', { style: 'font-size: 20px; ' }, [txt('big')])))),
  '<span style="font-size:20px">big</span>\n');
check('nested spans merge, inner wins',
  toMd(doc(p(el('span', { style: 'font-family:Verdana;font-size:18px' },
    [el('span', { style: 'font-size:22px' }, [txt('deep')])])))),
  '<span style="font-family:Verdana;font-size:22px">deep</span>\n');
check('an empty bold writes nothing',
  toMd(doc(p(el('strong', {}, []), txt('after')))), 'after\n');
check('a paragraph that looks like a heading stays a paragraph',
  toMd(doc(p(txt('# Test header yo!')))), '\\# Test header yo!\n');
check('and reads back as the same text',
  toHtml(toMd(doc(p(txt('# Test header yo!'))))), '<p># Test header yo!</p>');
check('literal block markers are escaped on every line',
  toMd(doc(p(
    txt('# h'), el('br', {}, []),
    txt('> q'), el('br', {}, []),
    txt('- item'), el('br', {}, []),
    txt('1. item'), el('br', {}, []),
    txt('+ item')
  ))),
  '\\# h  \n\\> q  \n\\- item  \n1\\. item  \n\\+ item\n');
check('literal highlight and strike markers are escaped',
  toMd(doc(p(txt('==x== and ~~y~~')))),
  '\\=\\=x\\=\\= and \\~\\~y\\~\\~\n');
check('an empty underline writes nothing',
  toMd(doc(p(txt('a'), el('u', {}, [txt('   ')])))), 'a\n');
check('a bare span is unwrapped',
  toMd(doc(p(el('span', {}, [txt('plain')])))), 'plain\n');
check('unknown inline keeps the words',
  toMd(doc(p(el('font', { color: 'red' }, [txt('red')])))), 'red\n');
check('empty document', toMd(doc()), '');
check('blank blocks are dropped', toMd(doc(p(txt('a')), p(), p(txt('b')))), 'a\n\nb\n');

check('frames round-trip with their layout', toMd(doc(
  el('div', { class: 'photos' }, [
    el('figure', { class: 'photo', style: 'left:12px;top:4px;width:300px;height:200px' },
      [el('img', { alt: 'alt', src: 'pic.png' })])
  ])
)), '![alt](pic.png "300x200+12+4")\n');

// ------------------------------------------------------------- stability

const canonical = [
  '# Title',
  'plain paragraph',
  'one\n\ntwo',
  '**bold** and *italic* and ~~gone~~ and ==marked== and <u>under</u>',
  '`code` and [link](https://x.test) and ![pic](p.png)',
  '<span style="font-size:20px">big run</span>',
  '<span style="font-family:Georgia;font-size:18px">both</span>',
  '- one\n- two\n- three',
  '1. one\n2. two',
  '> a quoted line',
  '```\nconst x = 1;\n```',
  '![alt](pic.png "300x200+12+4")',
  'first line  \nsecond line',
  'a \\*literal\\* star',
  '\\# Test header yo!',
  '\\> not a quote',
  '\\- not a list',
  '1\\. not a list',
  '\\+ not a list',
  '\\=\\=not a mark\\=\\=',
  '\\~\\~not a strike\\~\\~'
];

for (const md of canonical) {
  check('stable: ' + JSON.stringify(md.slice(0, 28)), back(md), md + (md.endsWith('\n') ? '' : '\n'));
}

// a document read back and written again must not drift further
for (const md of canonical) {
  const once = back(md);
  check('idempotent: ' + JSON.stringify(md.slice(0, 24)), back(once), once);
}

// ---------------------------------------------------------------- summary

if (failures.length) {
  console.log(`\n${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.log('  x ' + f + '\n');
  process.exit(1);
}
console.log(`all ${passed} markdown checks passed`);
