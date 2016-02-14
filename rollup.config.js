import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';

export default {
  entry: './lib/main.js',
  intro: 'var define = false;',
  plugins: [
    nodeResolve({
      jsnext: true
    }),
    commonjs({
      include: 'node_modules/**'
    }),
    json()
  ],
  dest: './build/contrast-widget-bundle.es2015.js'
};
