FROM python:3.10

WORKDIR /app
RUN pip install pgsync
COPY ./pgsync/start.sh .
COPY ./pgsync/schema.json .
CMD ["./start.sh"]