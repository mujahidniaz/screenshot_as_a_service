FROM mysql:5.7

ENV MYSQL_ROOT_PASSWORD root  
ENV MYSQL_DATABASE screenshot  
ENV MYSQL_USER test
ENV MYSQL_PASSWORD test

ADD setup.sql /docker-entrypoint-initdb.d



