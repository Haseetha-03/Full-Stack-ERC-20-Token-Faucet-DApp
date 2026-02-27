# Use Node LTS
FROM node:22-alpine

# Working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build app
RUN npm run build

# Install simple static server
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start frontend
CMD ["serve", "-s", "dist", "-l", "3000"]