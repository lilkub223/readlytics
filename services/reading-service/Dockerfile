FROM python:3.11-slim
WORKDIR /workspace/services/reading-service
COPY services/reading-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/reading-service/ ./
COPY infra/docker/init.sql /workspace/infra/docker/init.sql
EXPOSE 4002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4002"]
