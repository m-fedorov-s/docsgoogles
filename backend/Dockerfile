FROM golang:latest as build

WORKDIR /src

COPY . .

# Download all dependencies
RUN go get -d -v && CGO_ENABLED=0 go build -o /app/server.bin

FROM scratch

COPY --from=build /app/server.bin /app/server.bin
CMD ["/app/server.bin", "--cert", "/secrets/cert.pem", "--key", "/secrets/cert.key", "--workDir", "/data"]
