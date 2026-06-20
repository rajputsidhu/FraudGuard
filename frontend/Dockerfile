FROM node:18-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install packages
RUN npm install

# Copy source code files
COPY . .

# Expose Vite default dev server port
EXPOSE 5173

# Start Vite server in host mode so it is accessible outside the container
CMD ["npm", "run", "dev", "--", "--host"]
