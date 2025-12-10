FROM ollama/ollama:latest

ARG PORT=8080
# Listen on all interfaces, port 8080
ENV OLLAMA_HOST=0.0.0.0:$PORT

# Store model weight files in /models
ENV OLLAMA_MODELS=/models

# Reduce logging verbosity
ENV OLLAMA_DEBUG=false

# Never unload model weights from the GPU
ENV OLLAMA_KEEP_ALIVE=-1

# Store the model weights in the container image
ENV MODEL=snowflake-arctic-embed2:568m
RUN echo $MODEL
RUN ollama serve & sleep 5 && ollama pull $MODEL

# Start Ollama
ENTRYPOINT ["ollama", "serve"]