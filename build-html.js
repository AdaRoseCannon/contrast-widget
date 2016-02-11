function strip(code) {
	const specialCharacters = ['%', '"', '<', '>', '#', '@', ' ', '\\&', '\\?'];
	specialCharacters.forEach(function (char) {
		const charRegex = new RegExp(char, 'g');
		code = code.replace(charRegex, encodeURIComponent(char.replace(/\\/g, '')));
	});
	return code;
}
require('preprocess')
.preprocessFileSync(
	'./client/index.html',
	'./build/index.html', {
		bm: strip(require('fs').readFileSync('build/contrast-widget-bundle.min.js', 'utf8'))
	}
);
