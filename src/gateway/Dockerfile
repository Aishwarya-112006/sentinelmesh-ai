FROM openpolicyagent/opa:latest AS opa

FROM python:3.12-slim

WORKDIR /srv

COPY --from=opa /opa /usr/local/bin/opa

COPY src/gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/gateway/app ./app
COPY src/policies ./policies
COPY src/gateway/start.sh ./start.sh

RUN useradd -m -u 1000 gateway \
    && mkdir -p /data \
    && chown -R gateway:gateway /srv /data

ENV OPA_URL=http://127.0.0.1:8181/v1/data/sentinelmesh/authz/allow
ENV LEDGER_PATH=/data/ledger.jsonl

USER gateway

EXPOSE 8000

CMD ["sh", "/srv/start.sh"]
