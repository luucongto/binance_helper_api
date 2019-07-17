cd /app/api
yarn global add serve pm2
yarn install 
pm2 start startServer.sh
cd /app/client
pm2 start startClient.sh
cd /app/api
pm2 start listenClient.sh
pm2 start listenServer.sh
pm2 log
