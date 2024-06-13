FROM node:alpine

WORKDIR /home/node
COPY "package.json" "package-lock.json" /home/node/
EXPOSE 3000