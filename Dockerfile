FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine as production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Create a simple express server file using ES modules syntax
RUN echo 'import express from "express";' > server.js && \
    echo 'const app = express();' >> server.js && \
    echo 'const port = process.env.PORT || 80;' >> server.js && \
    echo 'app.use(express.static("dist"));' >> server.js && \
    echo 'app.get("*", (req, res) => {' >> server.js && \
    echo '  res.sendFile(new URL("./dist/index.html", import.meta.url).pathname);' >> server.js && \
    echo '});' >> server.js && \
    echo 'app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));' >> server.js

# Install only production dependencies including express
RUN npm install --production express

ENV HOST=0.0.0.0
ENV PORT=80
EXPOSE 80
CMD ["node", "server.js"]
