# Dockerfile for FastAPI backend
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --upgrade pip wheel setuptools && \
    if [ -f requirements.txt ]; then pip install -r requirements.txt; else pip install fastapi uvicorn[standard] python-multipart opencv-python numpy scipy matplotlib pillow pydantic scikit-image; fi
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
