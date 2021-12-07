import babel from 'rollup-plugin-babel';
import copy from 'rollup-plugin-copy';
import cleaner from 'rollup-plugin-cleaner';
import { terser } from 'rollup-plugin-terser';
import commonjs from 'rollup-plugin-commonjs'; // 将非ES6语法的包转为ES6可用
import baseConfig from 'create-rollup-config';

// eslint-disable-next-line no-undef
const env = process.env.NODE_ENV;

const commonConfig = baseConfig({
  // alias: {
  //   $common: './src/common'
  // },
  replace: {
    // eslint-disable-next-line no-undef
    env: JSON.stringify(process.env.NODE_ENV)
  },
  serve: {
    port: 7001
  },
  livereload: {
    watch: '/src' // default
  }
});

const config = {
  input: './src/index.js',
  output: [
    {
      file: './dist/wangGraph.umd.js',
      name: 'wGraph',
      format: 'umd'
      // plugins: [terser()]
    }
  ],
  config: commonConfig,
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
    }),
    commonjs()
  ]
};

if (env === 'production') {
  config.plugins.push(terser({ compress: { drop_console: true } }));
}

export default config;
