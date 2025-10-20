// THIS FILE IS LOGIC FOR SDK. DO NOT MODIFY. IT INCLUDES:
// 1. DEVELOPMENT SERVER
// 2. SVG TO CSS CONVERTER
// 3. BUNDLE GENERATOR
// 4. LIVE COMPONENTS TRANSFORMATION

const express = require("express")
const path = require("path")
const app = express()
const fs = require("fs")
const cheerio = require("cheerio")
const chokidar = require("chokidar")
const cssbeautify = require("cssbeautify")
const { parse } = require("node-html-parser")
const babelParser = require('@babel/parser')
const babelGenerator = require('@babel/generator').default

const pino = require("pino")
const logger = pino({
    transport: {
        target: "pino-pretty",
    },
})

// Function to copy all widget JS/CSS files to .sdk
function syncAllWidgetFiles() {
    const widgetDir = path.join(__dirname, "widget");
    const sdkDir = path.join(__dirname, ".sdk");
    try {
        const files = fs.readdirSync(widgetDir);
        files.forEach(file => {
            if (file.endsWith('.js') || file.endsWith('.css')) {
                fs.copyFileSync(path.join(widgetDir, file), path.join(sdkDir, file));
            }
        });
        logger.info("Synced all widget JS/CSS files to .sdk");
    } catch (err) {
        logger.error("Error syncing widget files:", err);
    }
}

// Initial sync of all files
syncAllWidgetFiles();


var watcher = chokidar.watch(path.join(__dirname, "widget"), {
    ignored: /^\./,
    persistent: true,
})
var svgWatcher = chokidar.watch(path.join(__dirname, "svg"), {
    ignored: /^\./,
    persistent: true,
})
var componentsWatcher = chokidar.watch(path.join(__dirname, "components"), {
    ignored: /^\./,
    persistent: true,
})
app.use(express.static(path.join(__dirname, "widget")))
app.use(express.static(path.join(__dirname, "components")))
app.use('/.sdk', express.static(path.join(__dirname, '.sdk')));


app.get("/", function (req, res) {
    res.redirect("/.sdk/index.html")
})

watcher
    .on("add", function (filePath) {
        try {
            logger.info(`[+] ${filePath}`);
            const fileName = path.basename(filePath);
            if (filePath.includes("widget.html")) {
                widgetToIndex();
            } else if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
                fs.copyFileSync(filePath, path.join(__dirname, ".sdk", fileName));
            }
        } catch (err) {
            logger.error(`Error processing add event for ${filePath}:`, err);
        }
    })
    .on("change", function (filePath) {
        try {
            logger.info(`[~] ${filePath}`);
            const fileName = path.basename(filePath);
            if (filePath.includes("widget.html")) {
                widgetToIndex();
            } else if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
                fs.copyFileSync(filePath, path.join(__dirname, ".sdk", fileName));
            }
        } catch (err) {
            logger.error(`Error processing change event for ${filePath}:`, err);
        }
    })
    .on("unlink", function (path) {
        logger.info(`[-] ${path}`)
    })
    .on("error", function (error) {
        logger.error(`Error happened ${error}`)
    })

svgWatcher
    .on("add", function (path) {
        logger.info(`[+] ${path}`)
        processSVGs()
    })
    .on("change", function (path) {
        logger.info(`[~] ${path}`)
        processSVGs()
    })
    .on("unlink", function (path) {
        logger.info(`[-] ${path}`)
    })
    .on("error", function (error) {
        logger.error(`Error happened ${error}`)
    })

componentsWatcher
    .on("add", function (path) {
        logger.info(`[+] ${path}`)
        parseComponents()
    })
    .on("change", function (path) {
        logger.info(`[~] ${path}`)
        parseComponents()
    })
    .on("unlink", function (path) {
        logger.info(`[-] ${path}`)
    })
    .on("error", function (error) {
        logger.error(`Error happened ${error}`)
    })

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`)
})

function widgetToIndex() {
    const sourceFilePath = "./widget/widget.html";
    const targetFilePath = "./.sdk/index.html";

    try {
        const sourceHtml = fs.readFileSync(sourceFilePath, "utf8");
        const targetHtml = fs.readFileSync(targetFilePath, "utf8");

        const getHeadElements = (html) => {
            const $ = cheerio.load(html);
            return $("head").html();
        };

        const elementExists = (targetHtml, element) => {
            const $ = cheerio.load(targetHtml);
            return $("head").html().includes(element);
        };

        let newHeadContent = "";
        const $source = cheerio.load(sourceHtml);
        const sourceHeadChildren = $source("head").children();

        sourceHeadChildren.each((i, el) => {
            const elementHtml = $source(el).toString();
            if (!elementExists(targetHtml, elementHtml)) {
                newHeadContent += elementHtml + "\n";
            }
        });

        if (newHeadContent) {
            const $target = cheerio.load(targetHtml);
            $target("head").append(newHeadContent + "\n");
            fs.writeFileSync(targetFilePath, $target.html());
            logger.info("Updated .sdk/index.html with new head elements.");
        }
    } catch (err) {
        logger.error("Error in widgetToIndex:", err);
    }
}

const extractDimensions = (svgContent) => {
    const root = parse(svgContent)
    const svgElement = root.querySelector("svg")
    if (svgElement) {
        const width = svgElement.getAttribute("width") + "px" || "100px"
        const height = svgElement.getAttribute("height") + "px" || "100px"
        return { width, height }
    }
    return { width: "100px", height: "100px" }
}

const encodeSVG = (svgContent) => {
    const encoded = encodeURIComponent(svgContent)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22")
    return `data:image/svg+xml;charset=utf-8,${encoded}`
}

const generateCSSClass = (filename, svgContent) => {
    const { width, height } = extractDimensions(svgContent)
    const className = filename.replace(".svg", "-svg")
    const encodedSVG = encodeSVG(svgContent)
    return `.${className} {
    width: ${width};
    height: ${height};
    background-image: url("${encodedSVG}");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }\n\n`
}

function processSVGs() {
    const svgFolder = path.join(__dirname, "svg");
    const cssFile = path.join(__dirname, "widget", "widget.css");

    try {
        const files = fs.readdirSync(svgFolder);
        let cssContent = "";

        files.forEach((file) => {
            if (path.extname(file).toLowerCase() === ".svg") {
                const filePath = path.join(svgFolder, file);
                try {
                    const svgContent = fs.readFileSync(filePath, "utf8");
                    cssContent += generateCSSClass(file, svgContent) + "\n\n";
                } catch (readErr) {
                    logger.error(`Error reading SVG file ${file}:`, readErr);
                }
            }
        });

        let existingCSS = "";
        try {
            existingCSS = fs.readFileSync(cssFile, "utf8");
        } catch (readErr) {
            // File might not exist, which is okay.
        }

        let updatedCSS = "";
        if (existingCSS) {
            const classMap = {};
            existingCSS.split("\n\n").forEach((rule) => {
                const match = rule.match(/^\.([^ \{]+)\s*\{/);
                if (match) {
                    classMap[match[1]] = rule;
                }
            });

            cssContent.split("\n\n").forEach((rule) => {
                const match = rule.match(/^\.([^ \{]+)\s*\{/);
                if (match) {
                    classMap[match[1]] = rule;
                }
            });
            updatedCSS = Object.values(classMap).join("\n\n");
        } else {
            updatedCSS = cssContent;
        }

        updatedCSS = cssbeautify(updatedCSS, { indent: "  " });

        fs.writeFileSync(cssFile, updatedCSS);
        logger.info("Processed SVGs and updated widget.css");
    } catch (err) {
        logger.error("Error in processSVGs:", err);
    }
}


function parseComponents() {
    const componentsPath = path.join(__dirname, "components");
    const generatedJsPath = path.join(__dirname, "widget", "generated-components.js");

    try {
        const files = fs.readdirSync(componentsPath);
        let allFunctionsCode = `// This file is auto-generated by sdk.js. Do not edit manually.\n\n`;

        files.forEach((file) => {
            if (path.extname(file).toLowerCase() === ".html") {
                try {
                    const html = fs.readFileSync(path.join(componentsPath, file), "utf8");
                    const $ = cheerio.load(html);

                    let match;
                    const variables = [];
                    const beforeScripts = [];
                    const afterScripts = [];

                    $("script").each((index, element) => {
                        const scriptCat = $(element).attr("cat");
                        const scriptContent = $(element).text();
                        if (scriptCat === "before") {
                            beforeScripts.push(scriptContent);
                        } else if (scriptCat === "after") {
                            afterScripts.push(scriptContent);
                        } else {
                            const regex = /(?:let|var|const)\s+([a-zA-Z_$][a-zA-Z_$0-9]*)/g;
                            while ((match = regex.exec(scriptContent)) !== null) {
                                variables.push(match[1]);
                            }
                        }
                    });

                    $("script").remove();
                    $.root().contents().filter((index, node) => node.type === "comment").remove();

                    const functionName = file.replace(".html", "");
                    const formattedFunctionName = `add${functionName.charAt(0).toUpperCase() + functionName.slice(1)}`;
                    const mainHtml = $("body").html()?.trim() || '';

                    const functionBody = `
export function ${formattedFunctionName}(${variables.join(", ")}) {
    ${beforeScripts.join("\n")}
    const elem = document.createElement('div');
    elem.innerHTML = \`\n${mainHtml}\n\`;
    const container = document.getElementById('main-container');
    if (container) {
        container.appendChild(elem);
    } else {
        console.error("#main-container not found in the DOM.");
    }
    ${afterScripts.join("\n")}
}
`;
                    allFunctionsCode += functionBody;
                } catch (readErr) {
                    logger.error(`Error processing component ${file}:`, readErr);
                }
            }
        });

        const ast = babelParser.parse(allFunctionsCode, { sourceType: "module" });
        const { code } = babelGenerator(ast, { comments: true });
        fs.writeFileSync(generatedJsPath, code);
        logger.info("Successfully generated components into generated-components.js");
    } catch (err) {
        logger.error("Error in parseComponents:", err);
    }
}