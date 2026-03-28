FROM node:20-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY frontend/ .
RUN npm run build

FROM golang:1.23-alpine AS backend

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY main.go ./
COPY api/server.go ./api/
COPY --from=frontend /app/api/static/ ./api/static/

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o diff-server .

FROM alpine:3.20

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=backend /app/diff-server .

USER app

EXPOSE 8080

ENV PORT=8080

CMD ["./diff-server"]
