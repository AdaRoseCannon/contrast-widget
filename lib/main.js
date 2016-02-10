import Color from './color';
import chartist from 'chartist';
import ctCSS from './chartist.css.js'

const widgetOptions = window.contrastWidgetOptions || {};
const noColorCalculatedStyle = (function () {
	const temp = document.createElement('div');
	document.body.appendChild(temp);
	const styleAttr = window.getComputedStyle(temp).backgroundColor;
	document.body.removeChild(temp);
	return styleAttr;
}());

/* eslint browser: true*/
function nodesWithTextNodesUnder (el) {
	'use strict';

	const elementsWithTextMap = new Map();
	const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
	let textNode;
	while(textNode = walk.nextNode()) {

		if (textNode.parentNode === undefined) {
			continue;
		}

		// ignore just whitespace nodes
		if (textNode.data.trim().length > 0) {
			if (elementsWithTextMap.has(textNode.parentNode)) {
				elementsWithTextMap.get(textNode.parentNode).push(textNode);
			} else {
				elementsWithTextMap.set(textNode.parentNode, [textNode]);
			}
		}
	}
	return Array.from(elementsWithTextMap);
}

function getBackgroundColorForEl (el) {
	'use strict';

	const bgc = window.getComputedStyle(el).backgroundColor;
	if (bgc !== noColorCalculatedStyle && bgc != "") {
		return bgc;
	} else if (el.parentNode) {
		return getBackgroundColorForEl(el.parentNode);
	}
	return null;
}

function getContrastForEl (el) {
	'use strict';

	const style = window.getComputedStyle(el);
	const color = style.color;
	const backgroundColor = getBackgroundColorForEl(el) || 'rgba(255, 255, 255, 1)';
	const bColor = new Color(backgroundColor);
	const fColor = new Color(color);
	return bColor.contrast(fColor);
}

function generateContrastData () {
	'use strict';

	const badNodeCutoff = widgetOptions.badNodeCutoff || 6;
	const textNodes = nodesWithTextNodesUnder(document.body);
	const badNodes = [];
	let goodChars = 0;
	let badChars = 0;
	let chartData = [
		0, 0, 0, 0, 0,
		0, 0, 0, 0, 0,
		0, 0, 0, 0, 0,
		0
	]; // buckets representing 0-(15+)
	textNodes.forEach(inNode => {
		const n = inNode[0];
		const ratio = getContrastForEl(n).ratio;
		const noCharacters = inNode[1].map(t => t.length).reduce((a,b) => a + b, 0);
		const bucket = Math.min(15, Math.round(ratio));
		chartData[bucket] += noCharacters;
		if (ratio < badNodeCutoff) {
			badNodes.push({
				node: n,
				contrastRatio: ratio
			});
			badChars += noCharacters;
		} else {
			goodChars += noCharacters;
		}
	});

	return {
		badContrastNodes: badNodes,
		proportionBadContrast: badChars / goodChars,
		chartData: chartData.map(i => (i/(badChars + goodChars))) // average the data to keep numbers small
	}
}

function main() {
	'use strict';

	function css(el, props) {
		function units(prop, i) {
			if (typeof i === "number") {
				if (prop.match(/width|height|top|left|right|bottom/)) {
					return i + "px";
				}
			}
			return i;
		}
		for (let n in props) {
			el.style[n] = units(n, props[n]);
		}
		return el;
	};

	console.log('Adding Widget');

	const contrastData = generateContrastData();
	const chartData = contrastData.chartData;
	const chartWrapper = document.querySelector('#contrastBookmarklet_ChartWrapper') || document.createElement('div');
	chartWrapper.id = 'contrastBookmarklet_ChartWrapper';
	chartWrapper.innerHTML = '';
	window.contrastWidgetData = contrastData;

	const menuBar = document.createElement('div');
	chartWrapper.appendChild(menuBar);

	const highlightButton = document.createElement('button');
	highlightButton.textContent = 'Highlight Bad Els';
	menuBar.appendChild(highlightButton);
	highlightButton.addEventListener('click', highlightBadEls);

	const xButton = document.createElement('span');
	xButton.innerHTML = '&#9447;';
	css(xButton, {
		display: 'inline-block',
		float: 'right',
		fontWeight: 'bold',
		fontSize: '1.2em',
		cursor: 'pointer'
	});
	menuBar.appendChild(xButton);
	xButton.addEventListener('click', function () {
		chartWrapper.parentNode.removeChild(chartWrapper);
	});

	function highlightBadEls() {
		contrastData.badContrastNodes.forEach(function ({node, contrastRatio}) {

			// use get bounding rect to draw rectangle around the bad node.
			console.log(node,contrastRatio);
		});
	}

	contrastData.highlightBadEls = highlightBadEls;

	css(chartWrapper, {
		position: 'fixed',
		bottom: 0,
		right: 0,
		padding: '1em',
		margin: '1em',
		background: '#ccc',
		boxShadow: '0 0 1em 0 black',
		boxSizing: 'border-box',
		zIndex: 1000
	});

	document.body.appendChild(chartWrapper);

	ctCSS();
	const line = new chartist.Line(chartWrapper, {
		labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, '15+'].map((a, i) => i % 3 ? '' : String(a)),
		series: [
			chartData
		]
	}, {
		low: 0.0,
		high: 1.0,
		showArea: true,
		areaBase: 0,
		showPoint: false,
		width: '300px',
		height: '200px',
		lineSmooth: chartist.Interpolation.simple({
			divisor: 2
		})
	});

	line.on('created', function(ctx) {
		var defs = ctx.svg.elem('defs');
		defs.elem('linearGradient', {
			id: 'gradient',
			x1: 0,
			y1: 0,
			x2: 1,
			y2: 0
		}).elem('stop', {
			offset: 0,
			'stop-color': 'hsla(10, 60%, 60%, 1)'
		}).parent().elem('stop', {
			offset: 0.5,
			'stop-color': 'hsla(55, 90%, 60%, 1)'
		}).parent().elem('stop', {
			offset: 1,
			'stop-color': 'hsla(100, 60%, 60%, 1)'
		});

		const node = ctx.svg.querySelector('.ct-area')._node;
		node.style.fill = 'url(#gradient)';
		node.style.fillOpacity = '1';
	});
};

if (document.readyState === "complete") {
	main();
} else {
	document.onreadystatechange = function () {
		if (document.readyState == "complete") {
			main();
		}
	}
}
