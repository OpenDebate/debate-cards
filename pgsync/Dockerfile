FROM python:3.11

WORKDIR /app
RUN pip install pgsync==2.4.0
# Current version of pgsync has a bug that causes an error in this file. Fixed on the github so once next version releases this can be removed
COPY ./pgsync/patches/transform.py /usr/local/lib/python3.11/site-packages/pgsync/

COPY ./pgsync/start.sh .
COPY ./pgsync/schema.json .
CMD ["./start.sh"]