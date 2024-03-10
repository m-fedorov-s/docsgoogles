FROM golang:latest as build

WORKDIR /build

COPY . .

# Download all dependencies
RUN go get -d -v && CGO_ENABLED=0 go build -o server.bin

FROM alpine:latest

COPY --from=build /build/server.bin /app/server.bin
COPY credentials /app/credentials/
CMD ["/app/server.bin", "--cert", "/app/credentials/aws_public.pem", "--key", "/app/credentials/aws_cloud.key", "--workDir", "/app/data"]
