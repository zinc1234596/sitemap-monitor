import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import config from './config.js';
import { promises as fsPromises } from 'fs';
import { sendPushNotification } from './notifications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 定义存储 URL 的文件夹
const urlsDir = path.join(__dirname, 'urls');

// 定义 getUrlFile 和 getNewUrlsFile 函数
const getUrlFile = (sitemapUrl) => {
    const hostname = new URL(sitemapUrl).hostname;
    return path.join(urlsDir, `urls_${hostname}.txt`);
};

const getNewUrlsFile = (sitemapUrl) => {
    const hostname = new URL(sitemapUrl).hostname;
    return path.join(urlsDir, `new_urls_${hostname}.txt`);
};

// 获取 sitemap 并提取 URL
async function fetchSitemap(sitemapUrl) {
    try {
        console.log(`开始获取 sitemap: ${sitemapUrl}`);
        
        // 确保 urls 目录存在
        await fsPromises.mkdir(urlsDir, { recursive: true });

        const response = await axios.get(sitemapUrl);
        const $ = cheerio.load(response.data, {
            xmlMode: true
        });
        
        // 提取所有URL
        const urls = $('url loc').map((_, elem) => $(elem).text()).get();
        
        const urlFile = getUrlFile(sitemapUrl);
        const newUrlsFile = getNewUrlsFile(sitemapUrl);

        // 读取已存在的URL
        let existingUrls = new Set();
        if (await fs.pathExists(urlFile)) {
            const content = await fs.readFile(urlFile, 'utf-8');
            existingUrls = new Set(content.split('\n').filter(Boolean));
        }
        
        // 找出新增的URL
        const newUrls = urls.filter(url => !existingUrls.has(url));
        
        console.log(`${sitemapUrl}: 已获取 ${urls.length} 个 URL，新增 ${newUrls.length} 个 URL`);
        
        // 如果有新URL，保存到文件
        if (newUrls.length > 0) {
            const timestamp = new Date().toLocaleString();
            const separator = '------------------------\n';
            
            // 追加到历史记录文件
            await fs.appendFile(urlFile, 
                `${separator}${timestamp}\n${newUrls.join('\n')}\n\n`
            );
            
            // 追加到新URL文件
            await fs.appendFile(newUrlsFile, 
                `${separator}${timestamp}\n${newUrls.join('\n')}\n\n`
            );
            
            // 调用推送通知
            await sendPushNotification(sitemapUrl, newUrls);
        }
    } catch (error) {
        console.error(`获取或处理 sitemap ${sitemapUrl} 时出错:`, error);
    }
}

// 主函数
async function main(args) {
    if (args.once) {
        console.log('执行一次性检查...');
        for (const sitemapUrl of config.sitemapUrls) {
            await fetchSitemap(sitemapUrl);
        }
    } else {
        console.log(`开始定时任务，调度: ${config.cronSchedule}`);
        cron.schedule(config.cronSchedule, async () => {
            console.log('执行定时检查...');
            for (const sitemapUrl of config.sitemapUrls) {
                await fetchSitemap(sitemapUrl);
            }
        });
    }
}

// 解析命令行参数
const argv = yargs(hideBin(process.argv))
    .option('once', {
        alias: 'o',
        type: 'boolean',
        description: '执行一次性检查'
    })
    .help()
    .argv;

// 在 main 函数调用之前添加以下函数
async function ensureUrlsDirectory() {
    try {
        await fsPromises.mkdir(urlsDir, { recursive: true });
        console.log(`已创建或确认 URLs 目录: ${urlsDir}`);
    } catch (error) {
        console.error('创建 URLs 目录时出错:', error);
    }
}

// 运行脚本
(async () => {
    await ensureUrlsDirectory();
    main(argv);
})();
