FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Run
EXPOSE 8888
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8888"]
