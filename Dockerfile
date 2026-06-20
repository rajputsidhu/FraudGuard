# ====================================================
# STAGE 1: Base image installing Python dependencies
# ====================================================
FROM python:3.11-slim as base

# Set environment variable to prevent python writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system utilities needed for building packages and performing healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the entire workspace into the container working directory
COPY . .

# ====================================================
# STAGE 2: Backend target container
# ====================================================
FROM base as backend

# Expose FastAPI default port
EXPOSE 8000

# Run FastAPI backend via Uvicorn server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ====================================================
# STAGE 3: Frontend target container
# ====================================================
FROM base as frontend

# Expose Streamlit default port
EXPOSE 8501

# Run Streamlit frontend application
CMD ["streamlit", "run", "app/06_app.py", "--server.port", "8501", "--server.address", "0.0.0.0"]
