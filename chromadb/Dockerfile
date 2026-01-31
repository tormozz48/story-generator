FROM python:3.10-slim

WORKDIR /chroma

# Install chromadb with pinned numpy version to avoid compatibility issues
# ChromaDB 0.4.22 is incompatible with NumPy 2.0+
RUN pip install --no-cache-dir numpy==1.26.4 chromadb==0.4.22

# Expose port
EXPOSE 8000

# Set environment variables
ENV IS_PERSISTENT=TRUE
ENV ANONYMIZED_TELEMETRY=FALSE

# Run chromadb server
CMD ["python", "-m", "chromadb.cli.cli", "run", "--host", "0.0.0.0", "--port", "8000", "--path", "/chroma/chroma"]
