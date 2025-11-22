FROM python:3.11-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for OpenCV and MediaPipe
# libgl1-mesa-glx: Required for OpenGL support in OpenCV
# libglib2.0-0: Required for GObject introspection in OpenCV/MediaPipe
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install uv using pip
RUN pip install uv

# Set working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install dependencies
# --frozen: Verify lock file is up to date
# --no-install-project: Install dependencies only, not the project itself yet
RUN uv sync --frozen --no-install-project

# Copy application code
COPY . .

# Install the project itself
RUN uv sync --frozen

# Expose the WebSocket port
EXPOSE 8765

# Run the application using uv run
CMD ["uv", "run", "main.py"]
