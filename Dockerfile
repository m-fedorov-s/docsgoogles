FROM golang:latest as build

WORKDIR /src

COPY backend .

# Download all dependencies
RUN go get -d -v && CGO_ENABLED=0 go build -o /app/server.bin

FROM scratch

COPY --from=build /app/server.bin /app/server.bin
COPY aws_* .
CMD ["/app/server.bin", "--cert", "aws_public.pem", "--key", "aws_cloud.key", "--workDir", "/data"]
