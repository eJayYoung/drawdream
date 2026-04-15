FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Create directories for models and output
RUN mkdir -p /app/models /app/output /app/workflows

# Expose API port
EXPOSE 8188

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8188"]
