FROM python:3.10

WORKDIR /app
RUN pip install pgsync==2.3.2
# Current version of pgsync has a bug that prevents this use case from working, the fix is pretty simple though. Hopefully I will submit a pull request at some point
COPY ./pgsync/patches/querybuilder.py /usr/local/lib/python3.10/site-packages/pgsync/
COPY ./pgsync/patches/transform.py /usr/local/lib/python3.10/site-packages/pgsync/

COPY ./pgsync/start.sh .
COPY ./pgsync/schema.json .
CMD ["./start.sh"]