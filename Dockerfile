FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o diff-server .

FROM alpine:3.20

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=builder /app/diff-server .

USER app

EXPOSE 8080

ENV PORT=8080

CMD ["./diff-server"]
