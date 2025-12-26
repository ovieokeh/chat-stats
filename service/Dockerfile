FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create models directory
RUN mkdir -p /app/models

# Copy model downloader and download the model
COPY download_model.py .
RUN python download_model.py

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8000

# Set environment variable for model path
ENV MODEL_PATH=/app/models/all-MiniLM-L6-v2

# Run the application
CMD ["python", "main.py"]
