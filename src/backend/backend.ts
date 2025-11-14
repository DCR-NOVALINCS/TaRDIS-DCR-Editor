/**
 * Backend HTTP server for the TaRDIS-DCR-Editor application.
 *
 * @packageDocumentation
 *
 * @remarks
 * This module creates an `Express` application that exposes a small set of REST endpoints used
 * by the editor frontend. The server:
 * - enables `CORS` for all origins,
 * - parses incoming `JSON` request bodies,
 * - listens on port `8080` by default.
 *
 * Routes
 * -------
 *
 * `POST /code`
 *   - Purpose: Accepts source code for a ".tardisdcr" file, saves it to disk, and pipes it to
 *     a Node-based compiler process. The combined output (code + compiler stdout) is returned.
 *   - Request body shape: { code: string }
 *   - Side effects:
 *     - Writes a file named "regrada.tardisdcr" in the process working directory using
 *       fs.writeFileSync.
 *     - Builds a shell command that either uses `type` (Windows) or `cat` (POSIX) to feed the
 *       file into `node compiler.js`, then executes it with `child_process.exec`.
 *   - Response: Text containing the submitted code and the compiler stdout.
 *
 * `POST /example`
 *   - Purpose: Save arbitrary example data as a JSON file inside the ./examples directory.
 *   - Request body shape: { name: string, data: string }
 *     - `name` is used as the filename (with ".json" appended).
 *     - `data` is written verbatim to the file (no JSON parsing/validation).
 *   - Side effects: Synchronously writes the file using fs.writeFileSync.
 *   - Response: Plain text confirmation string.
 *
 * `GET /projections`
 *   - Purpose: Read all .json files from an output directory (_out) and return their parsed JSON
 *     content as an array.
 *   - Query: none
 *   - Side effects:
 *     - Reads the directory at path.join(__dirname, "_out") using fs.readdir (async).
 *     - For each file that ends with ".json", reads it synchronously (fs.readFileSync) and
 *       JSON.parse()s its contents.
 *   - Response: application/json array of parsed JSON objects.
 *   - Errors:
 *     - Returns HTTP 500 if the directory cannot be read.
 *     - Will throw if any JSON file contains invalid JSON during JSON.parse().
 *
 * `POST /retrieve-file`
 *   - Purpose: Find and return a JSON file that starts with a given name inside a specified
 *     directory (relative to __dirname).
 *   - Request body shape: { dir: string, name: string }
 *     - `dir` is joined to __dirname to form a target directory (examplesDir).
 *     - The handler lists files in that directory (fs.readdir) and selects the first file whose
 *       filename starts with `name`.
 *   - Response:
 *     - On success: HTTP 200 with parsed JSON content of the matched file.
 *     - 404 if no matching file is found.
 *     - 500 if the directory cannot be read.
 *
 * Application start
 * -----------------
 * The server listens on port 8080 and logs a message to `stdout` when ready:
 *   Backend running at http://localhost:8080
 *
 * General notes and recommendations
 * ---------------------------------
 * - Consider replacing synchronous filesystem operations with asynchronous counterparts to
 *   avoid blocking the Node.js event loop.
 * - Replace navigator-based platform detection with process.platform in Node.js.
 * - Perform validation and sanitization of all request inputs (filenames, directory names,
 *   and file contents) to mitigate injection and path traversal risks.
 * - When spawning or executing external commands, avoid interpolating user-provided strings
 *   into a shell invocation; prefer spawn with an argument array or otherwise validate inputs.
 * - Add structured error responses (JSON) for consistency with API consumers.
 */
import express from "express";
import { exec, spawn } from "child_process";
import cors from "cors";
import fs from "fs";
import path from "path";

const allowedDirs = ["examples", "_out"];

const app = express();
const port = 5174;

app.use(cors());
app.use(express.json());

app.post("/code", (req, res) => {
  const { code } = req.body;
  fs.writeFile("regrada.tardisdcr", code, (err) => {
    if (err) {
      console.error("Error writing file:", err);
      res.status(500).send("Error writing file.");
      return;
    } else console.log("File written successfully: regrada.tardisdcr");
  });

  const child = spawn("node", ["main_compiler.js"]);

  const fileStream = fs.createReadStream("regrada.tardisdcr");
  fileStream.pipe(child.stdin);

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (data) => {
    output += data;
  });

  child.stderr.on("data", (data) => {
    errorOutput += data;
  });

  child.on("close", (codeExit) => {
    if (codeExit !== 0) {
      console.error("Compiler process exited with code:", codeExit);
      return res.status(500).send(`Compiler error:\n\n${errorOutput}`);
    }
    return res.status(200).send(`CODE:\n\n${code}\n\nOUTPUT:\n\n${output}`);
  });
});

app.post("/example", (req, res) => {
  const { name, data } = req.body;
  const fileName = `${name}.json`;
  fs.writeFile(`./examples/${fileName}`, data, (err) => {
    if (err) {
      console.error("Error writing file:", err);
      return res.status(500).send("Error writing file.");
    } else console.log(`File ${fileName} written successfully.`);
    return res.send(`File ${fileName} was saved.`);
  });
});

app.get("/projections", (_, res) => {
  const outDir = path.join(__dirname, "_out");

  fs.readdir(outDir, (err, files) => {
    if (err) return res.status(500).send("Error reading dir.");

    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const jsonArray = jsonFiles.map((file) => {
      const filePath = path.join(outDir, file);
      fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
          console.error("Error reading file:", err);
          return res.status(500).send("Error reading file.");
        }
        console.log("File read successfully:", filePath);
        return JSON.parse(data);
      });
    });

    if (jsonArray.length === 0)
      console.warn("No JSON files found in _out directory.");

    return res.json(jsonArray);
  });
});

app.post("/retrieve-file", (req, res) => {
  const { dir, name } = req.body;

  if (!allowedDirs.includes(dir)) {
    console.warn(`Attempt to access invalid directory: ${dir}`);
    res.status(400).send("Invalid directory.");
    return;
  }

  const examplesDir = path.join(__dirname, dir);

  fs.readdir(examplesDir, (err, files) => {
    if (err) return res.status(500).send("Error reading dir.");

    const jsonFile = files.find((file) => file.startsWith(name));
    if (!jsonFile) return res.status(404).send("File not found.");

    const filePath = path.join(examplesDir, jsonFile);
    fs.readFile(filePath, "utf-8", (err, content) => {
      if (err) {
        console.error("Error reading file:", err);
        return res.status(500).send("Error reading file.");
      }
      console.log("File read successfully:", filePath);
      return res.json(JSON.parse(content));
    });
  });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
