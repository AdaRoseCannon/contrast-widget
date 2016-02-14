'use strict';
function strip(code) {
	const specialCharacters = ['%', '"', '<', '>', '#', '@', ' ', '\\&', '\\?'];
	specialCharacters.forEach(function (char) {
		const charRegex = new RegExp(char, 'g');
		code = code.replace(charRegex, encodeURIComponent(char.replace(/\\/g, '')));
	});
	return code;
}
const pp = require('preprocess');
const bm = strip(require('fs').readFileSync('build/contrast-widget-bundle.min.js', 'utf8'));
pp.preprocessFileSync(
	'./client/index.html',
	'./build/index.html',
	{bm}
);
pp.preprocessFileSync(
	'./client/bookmarklet-snippet.html',
	'./build/bookmarklet-snippet.html', 
	{bm}
);
