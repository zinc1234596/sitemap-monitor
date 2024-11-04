// 推送通知函数
export const sendPushNotification = async (sitemapUrl, newUrls, pushKeys = ['gB4bW2UeouPwkJMNDsVR9b']) => {
  const hostname = new URL(sitemapUrl).hostname;
  const title = `Sitemap ${hostname} 发现新url`;
  const body = `检测到${newUrls.length}个新增URL:\n${newUrls.join('\n')}`;

  try {
    await Promise.all(pushKeys.map(key => 
      fetch(`https://api.day.app/${key}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          group: "sitemap",
        }),
      })
    ));
    console.log(`通知已发送到 ${pushKeys.length} 个终端: ${title}`);
  } catch (error) {
    console.error('发送推送通知时出错:', error);
  }
}; 