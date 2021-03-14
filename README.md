## leaves-deploy
#### leaves-deploy 是一个非常轻量级的自动化静态部署工具

### 安装
```
    npm install -save-dev leaves-deploy
```

### 配置
```
    const config = {
        host:'', // 开发服务器地址 必填
        port:'22', // 端口 默认 22
        username:'', // 登录服务器用户名 必填
        password:'', // 登录服务器密码 必填
        distPath:'', // 本地打包文件目录 必填
        webDir:'', // 服务器上部署的地址 必填
        script:'' // 项目打包命令
    };
    module.exports = config;
```
注意：
    部署时会清除webDir下所有文件，请谨慎配置

### 使用
可以在package.json 中配置script命令
```
    "scripts": {
        "deploy":"deploy --config ./config/deploy.js"
    },
```
也可以直接在终端中使用
```
    deploy --config ./config/deploy.js
```

注意 --config 指定配置文件位置，默认项目根目录下deploy.js
