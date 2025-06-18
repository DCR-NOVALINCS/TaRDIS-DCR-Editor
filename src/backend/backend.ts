import express from "express";
import { exec } from "child_process";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

app.get("/hello", (_, res) => {
  res.send("Hello, world!");
});

app.post("/code", (req, res) => {
  const { code } = req.body;
  fs.writeFileSync("regrada", code);
  exec("type regrada | node main_js.bc.js", (error, stdout, sterr) => {
    console.log(stdout, error, sterr);
    res.send(
      `CODE:\n\n${code}\n\n--------------------------------------------------------------\n\nOUTPUT:\n\n${stdout}`
    );
  });
});

app.get("/projections", (req, res) => {
  const outDir = path.join(__dirname, "_out");

  fs.readdir(outDir, (err, files) => {
    if (err) return res.status(500).send("Error reading dir.");

    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const jsonArray = jsonFiles.map((file) => {
      const filePath = path.join(outDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    });

    res.json(jsonArray);
  });
});

app.get("/run-script", (req, res) => {
  exec("my-script.bat", (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error: ${error.message}`);
    }
    if (stderr) {
      return res.status(500).send(`Stderr: ${stderr}`);
    }
    res.send(`Output:\n${stdout}`);
  });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
