import Color from './color';
import Chartist from 'chartist';
import ctCSS from './chartist.css.js';
import {version} from '../package.json';
import {lt} from 'semver';

const home = 'https://gh.ada.is/contrast-widget/';
const widgetOptions = window.contrastWidgetOptions || {};
const noColorCalculatedStyle = (function () {
	'use strict';
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

	const badNodeCutoff = widgetOptions.badNodeCutOff || 4.5;
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

function checkForUpdates() {
	if (!window.fetch) return Promise.resolve(false);
	return fetch(home + '__about.json')
	.then(response => response.ok ? response.json() : Promise.reject('Contrast Widget failed to check for updates, Bad Response'))
	.then(about => lt(version, about.version));
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

	console.log('Adding Widget, version ' + version);

	function calcData() {
		const contrastData = generateContrastData();
		contrastData.version = version;
		window.contrastWidgetData = contrastData;
		contrastData.highlightBadEls = highlightBadEls;
		return contrastData;
	}

	function removeHighlight() {
		[].slice.call(document.querySelectorAll('body > .widget-bad-el-marker')).forEach(node => document.body.removeChild(node));
	}

	function highlightBadEls() {
		const contrastData = calcData();
		removeHighlight();
		const toAdd = contrastData.badContrastNodes.map(function ({node, contrastRatio}) {

			// use get bounding rect to draw rectangle around the bad node.
			const br = node.getBoundingClientRect();

			if (br.width * br.height === 0) {
				return null;
			}

			const marker = document.createElement('div');
			css(marker, {
				unset: 'all',
				position: 'absolute',
				backgroundColor: `hsla(${10 + (contrastRatio * 8)}, 100%, 60%, 0.4)`,
				left: br.left + window.scrollX,
				right: br.right + window.scrollX,
				top: br.top + window.scrollY,
				bottom: br.bottom + window.scrollY,
				width: br.width,
				height: br.height,
				textAlign: 'center',
				fontSize: br.height * 0.8 + 'px',
				lineHeight: br.height + 'px',
				overflow: 'hidden'
			});
			marker.innerHTML = contrastRatio;
			marker.classList.add('widget-bad-el-marker');
			return marker;
		});

		toAdd.forEach(node => node && document.body.appendChild(node));
	}

	const chartData = (() => calcData().chartData)();

	if (widgetOptions.highlightBadEls === true) highlightBadEls();
	if (widgetOptions.showModal === false) return;

	const chartWrapper = document.querySelector('#contrastBookmarklet_ChartWrapper') || document.createElement('div');
	chartWrapper.id = 'contrastBookmarklet_ChartWrapper';
	chartWrapper.innerHTML = '';

	const menuBar = document.createElement('div');
	chartWrapper.appendChild(menuBar);

	const highlightButton = document.createElement('button');
	css(highlightButton, {
		all: 'unset',
		fontSize: '0.9em',
		border: '2px outset #A2A0A0',
		background: 'hsla(340,63%,92%,1)',
		fontFamily: `'Open Sans',Sans-serif`,
		borderRadius: '1em',
		color: 'black',
		padding: '0.2em 0.4em',
		cursor: 'pointer',
		margin: '0 0.5em 0.5em 0'
	});
	highlightButton.textContent = 'Highlight Low Contrast Elements';
	menuBar.appendChild(highlightButton);
	highlightButton.addEventListener('click', highlightBadEls);

	const xButton = document.createElement('span');
	xButton.innerHTML = '&#9447;';
	css(xButton, {
		display: 'inline-block',
		float: 'right',
		fontWeight: 'bold',
		fontSize: '1.6em',
		cursor: 'pointer',
		textDecoration: 'none',
		color: 'black',
		width: '1em',
		lineHeight: '1em',
		padding: '0.1em'
	});
	menuBar.appendChild(xButton);
	xButton.addEventListener('click', function () {
		chartWrapper.parentNode.removeChild(chartWrapper);
		removeHighlight();
	});

	const iButton = document.createElement('a');
	iButton.innerHTML = '&#9432;';
	css(iButton, {
		display: 'inline-block',
		float: 'right',
		fontWeight: 'bold',
		fontSize: '1.6em',
		cursor: 'pointer',
		textDecoration: 'none',
		color: 'black',
		width: '1em',
		lineHeight: '1em',
		padding: '0.1em'
	});
	iButton.href = home;
	menuBar.appendChild(iButton);

	checkForUpdates().then(function (updateRequired) {
		if (updateRequired) {
			const updateMessage = document.createElement('div');
			updateMessage.innerHTML = '<a href="' + home +'">Update available.</a>';
		}
	}, function (e) {
		console.log(e);
	});

	css(chartWrapper, {
		position: 'fixed',
		bottom: 0,
		right: 0,
		padding: '1em',
		margin: '1em',
		background: '#eee',
		boxShadow: '0 0 1em 0 black',
		boxSizing: 'border-box',
		zIndex: 1000
	});

	document.body.appendChild(chartWrapper);

	ctCSS();
	const line = new Chartist.Line(chartWrapper, {
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
		lineSmooth: Chartist.Interpolation.simple({
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
