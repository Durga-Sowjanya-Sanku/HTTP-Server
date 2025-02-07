const net = require("net");
const fs = require("fs");
const { dir } = require("console");

const server = net.createServer((socket) => {

    socket.on("data", (data) => {
        const url = data.toString().split(" ");
        const path = data.toString().split(" ")[1];
        const headers = data.toString().split("\r\n");

        let acceptEncoding = "";
        headers.forEach(header => {
            if (header.startsWith("Accept-Encoding:")) {
                acceptEncoding = header.split(": ")[1];
            }
        });

        const sendResponse = (content, contentType) => {
            let encoding = "";
            let compressedContent = content;

            if (acceptEncoding.includes("gzip")) {
                compressedContent = zlib.gzipSync(content);
                encoding = "gzip";
            } else if (acceptEncoding.includes("deflate")) {
                compressedContent = zlib.deflateSync(content);
                encoding = "deflate";
            }

            socket.write(
                `HTTP/1.1 200 OK\r\n` +
                `Content-Type: ${contentType}\r\n` +
                `Content-Length: ${compressedContent.length}\r\n` +
                (encoding ? `Content-Encoding: ${encoding}\r\n` : "") +
                `\r\n`
            );
            socket.write(compressedContent);
        }

        if(path === "/"){
            socket.write(`HTTP/1.1 200 ok \r\n\r\n`);
        } else if (path.startsWith("/files/")) {
            const directory = process.argv[3];
            const fileName = path.split("/files/")[1];

            if(fs.existsSync(`${directory}/${fileName}`)) {
                const content = fs.readFileSync(`${directory}/${fileName}`).toString();
                sendResponse(content, "application/octet-stream");
            } else {
                socket.write(`HTTP/1.1 404 NOT FOUND \r\n\r\n`);
            }

        } else if(url[0] === "POST" && path.startsWith("/files/")) {
            const fileName = path.split("/files/")[1];
            const directory = process.argv[3];
            const body = headers[headers.length-1];

            try{
                const dir = `${directory}/${fileName}`;
                fs.writeFileSync(dir, body);
                socket.write(`HTTP/1.1 201 CREATED\r\n\r\n`);
            } catch(error) {
                socket.write(ERROR_RESPONSE);
            }
        }
        else if(path.includes("/echo/")) {
            const content = path.split('/echo/')[1];
            sendResponse(content, "text/plain");
        } else if(path === "/user-agent") {
            const content = headers[2].split("User-Agent :")[1];
            sendResponse(content, "text/plain");
        } else {
            socket.write(`HTTP/1.1 404 NOT FOUND \r\n\r\n`);
        }
    })
    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");

