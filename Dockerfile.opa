FROM openpolicyagent/opa:latest

COPY src/policies/ /policies/

CMD ["run", "--server", "--addr=0.0.0.0:8181", "/policies"]
