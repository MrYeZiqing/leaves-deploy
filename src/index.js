import fs from 'fs'
import ora from 'ora'
import path from 'path'
import {exec} from 'child_process'
import compressing from 'compressing'
import {NodeSSH} from 'node-ssh'

export default class deploy {
    constructor(appPath){
        this.appPath = appPath || process.cwd()
        this.ssh = new NodeSSH()
    }
    
    run(){
        this.init()
    }
    getArgs(){
        const args = process.argv
        if(args[2] === '--config'  || args[2] === 'config'){
            this.configPath = path.resolve(this.appPath,args[3])
        }else{
            this.configPath = path.resolve(this.appPath,'deploy.js')
        }
    }
    init(){
        this.getArgs()
        this.getConfig()

    }
    getConfig(){
        const configPath = this.configPath
        // 读取配置
        const spinner = ora('正在读取配置文件...').start()
        if(!fs.existsSync(configPath)){
            spinner.fail('deploy配置文件未找到')
            process.exit()
        }
        const conf = require(configPath)
        const config = {
            host:conf.host,
            port:conf.port || 22,
            username:conf.username,
            password:conf.password,
            distPath:conf.distPath,
            webDir:conf.webDir,
            script:conf.script
        }
        this.config = config
        spinner.succeed('读取配置文件成功')
        this.runBuild()
    }
    runBuild(){
        const spinner = ora('项目打包中...').start()
        exec(this.config.script,(err)=>{
            if(err){
                spinner.fail('项目打包失败,请检查项目配置，重新部署！')
                console.log(err);
                process.exit()
            }
            spinner.succeed('项目打包成功')
            this.zipDist()
        })
    }
    zipDist(){
        // 打包文件压缩
        const spinner = ora('正在压缩打包文件...').start()
        const distDir = path.resolve(this.appPath,this.config.distPath)
        const distPath = path.resolve(distDir+'.zip')
        this.distPath = distPath
        compressing.zip.compressDir(distDir,distPath).then(()=>{
            spinner.succeed('打包文件压缩成功')
            this.connectSSH()
        }).catch((err)=>{
            spinner.fail('打包文件压缩失败，请重新部署！')
            console.log(err);
            process.exit()
        })
    }
    connectSSH(){
        // 连接服务器
        const spinner = ora('正在连接服务器...').start()
        this.ssh.connect(this.config).then(()=>{
            spinner.succeed('服务器连接成功')
            this.runUpload()
        }).catch((err)=>{
            spinner.fail('服务器连接失败!')
            console.log(err);
            process.exit()
        })
    }
    async runUpload(){
        await this.clearOldFile()
        // 将压缩后的打包文件上传到服务器
        const spinner = ora('上传文件到服务器...').start()
        // 线上打包zip地址
        const webPath = path.resolve(this.config.webDir,'.zip')
        await this.ssh.putFile(this.distPath,webPath)
        spinner.text = '线上解压打包文件...'
        await this.isUnzip()
        this.runCommand(`unzip ${webPath}`).then(async ()=>{
            await this.runCommand(`rm -rf ${webPath}`) // 解压完删除线上压缩包
            this.ssh.dispose() // 断开连接
            spinner.succeed('上传文件到服务器成功')
            // 删除本地打包文件
            this.deldteDist()
            // 部署完成说明
            this.doneMessage()
        }).catch(err=>{
            spinner.fail('线上解压打包文件失败')
            // 删除本地打包文件
            this.deldteDist()
            console.log(err);
            process.exit()
        })
    }
    // command 命令操作
    async runCommand(command){
        try {
            await this.ssh.exec(command, [], { cwd: this.config.webDir })
            Promise.resolve()
        } catch (err) {
            console.log(err);
            process.exit()
        }
    }
    // 查找unzip命令是否存在
    async isUnzip(){
        try {
            await this.ssh.exec('which unzip',[],{cwd: this.config.webDir})
        }catch(err){
            await this.runCommand('yum install -y unzip zip')
        }
    }
    async clearOldFile(){
        // 清空线上目标目录的旧文件
        const commands = ['ls', 'rm -rf *']
        await Promise.all(commands.map(async (it) => {
            return await this.runCommand(it)
        }))
    }
    // 删除本地打包文件
    deldteDist(){
        try {
            // 删除打包压缩文件
            fs.unlinkSync(this.distPath)
            // 删除打包文件
            this.rmdirAsync(this.config.distPath)
        } catch (err) {
            console.log('删除文件异常', err)
            process.exit();
        }
    }
    // 递归删除非空目录
    async rmdirAsync (filePath){
        let stat = fs.statSync(filePath)
        if (stat.isFile()) {
            fs.unlinkSync(filePath)
        } else {
            let dirs = fs.readdirSync(filePath)
            dirs = dirs.map(dir => this.rmdirAsync(path.join(filePath, dir)))
            await Promise.all(dirs)
            fs.rmdirSync(filePath)
        }
    }
    doneMessage(){
        console.log(`项目部署完成!`)
        console.log(`项目部署地址: ${this.config.webDir}/${this.config.distPath}`)
    }
}