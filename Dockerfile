# 使用 Node.js 18 的 Alpine 版本作为基础镜像（Alpine 是一个轻量级的 Linux 发行版）
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有源代码
COPY . .

# 创建 urls 目录
RUN mkdir -p urls

# 设置时区为上海
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai

# 启动应用
CMD ["npm", "start"]