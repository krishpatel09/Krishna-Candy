const http = require("http");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const qs = require("querystring");
const { isUtf8 } = require("buffer");
const port = 4000;

const server = http.createServer((req, res) => {
  const parsedUrl = path.parse(req.url);
  let filePath = path.join(__dirname, parsedUrl.dir, parsedUrl.base);

  // Serve static HTML files
  if (req.url === "/") {
    filePath = path.join(__dirname, "index.html");
  } else if (req.url === "/candy") {
    filePath = path.join(__dirname, "candy.html");
  } else if (req.url === "/about") {
    filePath = path.join(__dirname, "aboutUs.html");
  } else if (req.url === "/contact") {
    filePath = path.join(__dirname, "contact.html");
  }

  const extname = path.extname(filePath);
  let contentType = "text/html";

  switch (extname) {
    case ".css":
      contentType = "text/css";
      break;
    case ".js":
      contentType = "text/javascript";
      break;
    case ".png":
      contentType = "image/png";
      break;
    case ".jpg":
    case ".jpeg":
      contentType = "image/jpeg";
      break;
    default:
      contentType = "text/html";
  }

  if (req.method === "GET") {
    // Serve static files
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end("<h1>404 Not Found</h1>", "utf-8");
        } else {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end("<h1>Internal Server Error</h1>", "utf-8");
        }
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  } else if (req.method === "POST" && req.url === "/submit-contact") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const postData = qs.parse(body);

      // Check if all fields are present
      if (!postData.name || !postData.email || !postData.phone || !postData.comment) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>Bad Request: Missing form fields</h1>", "utf-8");
        return;
      }

      // Insert the contact form data into the database
      const db = new sqlite3.Database("database.db", (err) => {
        if (err) {
          console.error("Database connection error:", err.message);
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end("<h1>Internal Server Error: Unable to connect to database</h1>", "utf-8");
          return;
        }
        console.log("Connected to the SQLite database.");

        // Create the table if it doesn't exist
        db.run(
          `CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            comment TEXT
          )`,
          (err) => {
            if (err) {
              console.error("Table creation error:", err.message);
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end("<h1>Internal Server Error: Unable to create table</h1>", "utf-8");
              db.close();
              return;
            }
            console.log("Contacts table created or already exists.");

            // Insert data into the table
            db.run(
              `INSERT INTO contacts (name, email, phone, comment) VALUES (?, ?, ?, ?)`,
              [postData.name, postData.email, postData.phone, postData.comment],
              (err) => {
                if (err) {
                  console.error("Insert error:", err.message);
                  res.writeHead(500, { "Content-Type": "text/html" });
                  res.end("<h1>Internal Server Error: Unable to insert data</h1>", "utf-8");
                } else {
                  console.log("Contact information saved to the database.");
                  res.writeHead(200, { "Content-Type": "text/html" });
                  res.end("<h1>Form submission successful!</h1>", "utf-8");
                }

                // Close the database connection
                db.close((err) => {
                  if (err) {
                    console.error("Database close error:", err.message);
                  } else {
                    console.log("Closed the database connection.");
                  }
                });
              }
            );
          }
        );
      });
    });
  }else {
      //handle 404
    res.writeHead(404, {"content-type": "text/html"});
    res.end("<h1>404 Not Found</h1>", "utf-8");
  }
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
