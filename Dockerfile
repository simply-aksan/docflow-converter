FROM python:3.11-slim

# Install system dependencies, LibreOffice, and common fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    fontconfig \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pre-cache system fonts and pre-warm LibreOffice runtime caches at build time
RUN fc-cache -fv && \
    mkdir -p /tmp/lo_profile_template && \
    libreoffice -env:UserInstallation=file:///tmp/lo_profile_template --headless --terminate_after_init || true

WORKDIR /app

# Copy requirements from server/ and install
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server application code
COPY server/ .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port (Render sets $PORT dynamically)
EXPOSE 8000

# Start Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
