import babel from 'rollup-plugin-babel';
import copy from 'rollup-plugin-copy';
import cleaner from 'rollup-plugin-cleaner';
import { terser } from 'rollup-plugin-terser';

const config = {
  input: './src/index.js',
  output: [
    {
      file: './dist/wangGraph.umd.js',
      name: 'wGraph',
      format: 'umd',
      plugins: [terser()]
    }
  ],
  plugins: [
    babel({
      exclude: 'node_modules/**' // only transpile our source code
    }),
    copy({
      targets: [
        { src: 'assets/css', dest: 'dist' },
        { src: 'assets/images', dest: 'dist' },
        { src: 'assets/resources', dest: 'dist' }
      ]
    }),
    cleaner({
      targets: ['./dist/']
    })
  ]
};

export default config;
