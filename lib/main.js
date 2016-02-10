import Chart from 'chart.js';
import Color from './color';

const widgetOptions = window.contrastWidgetOptions || {};

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

	if (el.style && (el.style.background || el.style.backgroundColor)) {
		const style = window.getComputedStyle(el);
		return style.backgroundColor;
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

	const badNodeCutoff = widgetOptions.badNodeCutoff || 4;
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
		chartData: chartData.map(i => (i/(badChars + goodChars)).toFixed(2)) // average the data to keep numbers small
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
	const chartWrapper = document.createElement('div');
	window.contrastWidgetData = contrastData;

	contrastData.highlightBadEls = function () {
		contrastData.badContrastNodes.forEach(function ({node, contrastRatio}) {

			// use get bounding rect to draw rectangle around the bad node.
		});
	}

	css(chartWrapper, {
		position: 'absolute',
		bottom: 0,
		right: 0,
		padding: '1em',
		margin: '1em',
		background: '#ccc',
		boxShadow: '0 0 1em 0 black',
		boxSizing: 'border-box'
	});

	document.body.appendChild(chartWrapper);
	const chartData = contrastData.chartData;
	const canvas = document.createElement('canvas');
	const width = 400;
	canvas.width = width;
	canvas.height = width / 1.5;
	const ctx = canvas.getContext('2d');
	chartWrapper.appendChild(canvas);

	const grd = ctx.createLinearGradient(0.000, 150.000, width, 150.000);

	// Add colors
	grd.addColorStop(0.000, 'rgba(255, 0, 0, 1.000)');
	grd.addColorStop(0.470, 'rgba(219, 178, 30, 1.000)');
	grd.addColorStop(1.000, 'rgba(95, 191, 0, 1.000)');

	new Chart(ctx).Line({
		labels: ['0', '', '', '3', '', '', '6', '', '', '9', '', '', '12', '', '', '15+'], // [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,'15+'],
		datasets: [{
			label: 'Contrast',
			fillColor: grd,
			strokeColor: 'rgba(220,220,220,1)',
			pointColor: 'rgba(220,220,220,1)',
			pointStrokeColor: '#fff',
			pointHighlightFill: '#fff',
			pointHighlightStroke: 'rgba(220,220,220,1)',
			data: chartData
		}]
	}, {
		pointDot: false,
		pointHitDetectionRadius : 0,
		scaleOverride: true,
		scaleSteps: 5,
		scaleStepWidth: 0.2,
		scaleStartValue: 0
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
