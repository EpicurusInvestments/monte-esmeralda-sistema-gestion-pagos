FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# Runs the Next.js dev server (suitable for the local-dev deployment target).
CMD ["npm", "run", "dev"]
