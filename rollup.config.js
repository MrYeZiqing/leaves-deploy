import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import {uglify} from 'rollup-plugin-uglify'
import replace from 'rollup-plugin-replace'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'

const env = process.env.NODE_ENV

const config = {
    input:'./src/index.js',
    output:{
        file:'./lib/index.js',
        format:'commonjs', // 输入格式
        sourcemap:env === 'production'?true:false
    },
    plugins:[
        replace({
            'process.env.NODE_ENV':JSON.stringify(env)
        }),
        resolve(),
        babel({
            runtimeHelpers:true,
            extensions:['js'],
            include:['src/**/*'],
            exclude:'node_modules/**'
        }),
        commonjs(),
        json()
    ],
    external:['fs','ora','path','node-ssh','compressing','childProcess'], // 将其视为外部模块，不会打包在库中
}
if(env === 'production'){
    config.plugins.push(
        uglify()
    )
}
export default config