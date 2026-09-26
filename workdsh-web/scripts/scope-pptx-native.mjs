import {createRequire} from 'node:module';import {readFile,writeFile} from 'node:fs/promises';import postcss from 'postcss';import selectors from 'postcss-selector-parser';
const require=createRequire(new URL('../packages/plugins/office/package.json',import.meta.url));
const css=postcss.parse(await readFile(require.resolve('pptx-react-viewer/styles'),'utf8'));
css.walkRules(rule=>{let parent=rule.parent;while(parent){if(parent.type==='atrule'&&parent.name.endsWith('keyframes'))return;parent=parent.parent;}
 rule.selector=selectors(root=>{root.each(sel=>{let anchored=false;sel.each(n=>{if(n.type==='tag'&&['html','body'].includes(n.value)||n.type==='pseudo'&&[':root',':host'].includes(n.value)){n.replaceWith(selectors.className({value:'workdsh-ppt-editor'}));anchored=true;}});if(!anchored){sel.prepend(selectors.combinator({value:' '}));sel.prepend(selectors.className({value:'workdsh-ppt-editor'}));}});}).processSync(rule.selector);
});await writeFile(new URL('../packages/plugins/office/src/presentation/native-react/native.css',import.meta.url),css.toString());
