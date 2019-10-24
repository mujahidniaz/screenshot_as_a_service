docker run -d --hostname my-rabbit --name some-rabbit rabbitmq:3
docker run -d -p 15672:15672 -p 5672:5672 -p 5671:5671 --hostname my-rabbitmq --name my-rabbitmq-container rabbitmq:3-management
docker build -t sqldb .
docker run -d -p 3306:3306 sqldb



