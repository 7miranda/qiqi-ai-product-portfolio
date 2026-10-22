CROSSBOUND 国家徽章 · 第一版

12 个现有国家 × 金、银、铜 3 个等级，共 36 张透明 PNG。
gold/：金属金色、三星；silver/：银色、二星；bronze/：铜色、一星。
web/：游戏使用的 384 像素 WebP 显示图，保留透明背景；完整 PNG 原图仍在上述三个目录。
生成显示图：node scripts/crossbound-v11/build-badges.mjs

文件名使用游戏现有 marketId：
singapore 新加坡
london 英国
los-angeles 美国
berlin 德国
paris 法国
tokyo 日本
sydney 澳大利亚
toronto 加拿大
dubai 阿联酋
mexico-city 墨西哥
sao-paulo 巴西
amsterdam 荷兰

index.html：全部徽章预览与单张下载（通过本地 HTTP 服务打开）。
manifest.json：国家、等级与素材路径清单。
prompts.json：内置 imagegen 的完整制作提示词及参考素材记录。

游戏接入：
v11/badges.js 根据 marketId 和原有 tier 选择图像。
v11/ui.js 的 CountryBadge 展示图像，未获得时显示灰暗预览。
scripts/crossbound-v11/build.mjs 将原护照圆形文字印章替换为 CountryBadge。
不改变达成条件、等级判定、存档、历史利润或国家进度。

新加坡、日本、英国、巴西的金章沿用已确认的设计稿。
其他国家以已确认的新加坡金章为系列参考；银、铜以各自国家的金章为编辑目标。
