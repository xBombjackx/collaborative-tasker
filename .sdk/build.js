const fs = require("fs");
const path = require("path");
const pino = require("pino");
const archiver = require("archiver");

const logger = pino({
    transport: {
        target: "pino-pretty",
    },
});

async function main() {
    const outputDir = path.join(__dirname, "..", "dist");
    const zipPath = path.join(outputDir, "widget.zip");

    try {
        // Ensure the output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Create a file to stream archive data to.
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", {
            zlib: { level: 9 }, // Sets the compression level.
        });

        // Listen for all archive data to be written
        output.on("close", function () {
            logger.info(`${archive.pointer()} total bytes`);
            logger.info("Archiver has been finalized and the output file descriptor has closed.");
            logger.info(`Widget bundle created successfully at: ${zipPath}`);
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_drain
        output.on("end", function () {
            logger.info("Data has been drained");
        });

        // Good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on("warning", function (err) {
            if (err.code === "ENOENT") {
                logger.warn(err);
            } else {
                throw err;
            }
        });

        // Good practice to catch this error explicitly
        archive.on("error", function (err) {
            throw err;
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Define the files to be included in the zip
        const filesToZip = [
            { name: "widget.html", path: path.join(__dirname, "..", "widget", "widget.html") },
            { name: "widget.js", path: path.join(__dirname, "..", "widget", "widget.js") },
            { name: "widget.css", path: path.join(__dirname, "..", "widget", "widget.css") },
            { name: "themes.css", path: path.join(__dirname, "..", "widget", "themes.css") },
            { name: "generated-components.js", path: path.join(__dirname, "..", "widget", "generated-components.js") },
            { name: "widget.json", path: path.join(__dirname, "..", "widget", "fields.json") }, // Rename fields.json to widget.json
        ];

        // Add files to the archive
        for (const file of filesToZip) {
            if (fs.existsSync(file.path)) {
                archive.file(file.path, { name: file.name });
            } else {
                logger.error(`File not found, skipping: ${file.path}`);
            }
        }

        // Finalize the archive (i.e. we are done appending files but streams have to finish yet)
        await archive.finalize();

    } catch (e) {
        logger.error("Error creating widget bundle");
        logger.error(e);
    }
}

main();