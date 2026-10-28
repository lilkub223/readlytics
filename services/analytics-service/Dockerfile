FROM python:3.11-slim
WORKDIR /workspace/services/analytics-service
COPY services/analytics-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/analytics-service/ ./
COPY infra/docker/init.sql /workspace/infra/docker/init.sql
EXPOSE 4003
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4003"]
