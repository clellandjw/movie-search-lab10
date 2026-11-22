/* ======================================================
    Lab 9 - server.js starter
====================================================== */

// ==========================================
// 1. Imports, middleware, and file paths
// ==========================================

const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = 3001;

// express.json() lets the server read JSON request bodies.
// Without this middleware, req.body will usually be undefined.
app.use(express.json());
// CORS allows the React app to talk to this server.
// credentials: true is required because this lab uses sessions.
// We allow both localhost and 127.0.0.1 because Vite may show either one.
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);

// This lab uses a simple server-side session.
// The browser keeps a session id, while the server stores session data.
app.use(
  session({
    secret: "cmpt315_lab9_secret",
    resave: false,
    saveUninitialized: false,
  }),
);

// These paths point to the JSON files used in this lab.
const usersFile = path.join(__dirname, "users.json");
const watchlistsFile = path.join(__dirname, "watchlists.json");

// ==========================================
// 2. Helper Functions
// ==========================================

// Read and parse users.json.
async function readUsers() {
  // TODO 1:
  const jsonData = await fs.readFile(usersFile, "utf8");
  const data = JSON.parse(jsonData);
  return data;
}

// Save the updated users array back to users.json.
async function writeUsers(users) {
  // TODO 2:
  const jsonData = JSON.stringify(users, null, 2);
  await fs.writeFile(usersFile, jsonData);
}

// Read and parse watchlists.json.
async function readWatchlists() {
  // TODO 3:
  const jsonData = await fs.readFile(watchlistsFile, "utf8");
  const data = JSON.parse(jsonData);
  return data;
}

// Save the updated watchlists object.
async function writeWatchlists(watchlists) {
  // TODO 4:
  const jsonData = JSON.stringify(watchlists, null, 2);
  await fs.writeFile(watchlistsFile, jsonData);
}

// Return true only if the username matches the lab rules.
function isValidUsername(username) {
  // TODO 5:
  const pattern = /^[a-zA-Z0-9]+$/;

  if (
    typeof username == "string" &&
    username.length >= 3 &&
    username.length <= 20 &&
    pattern.test(username)
  ) {
    return true;
  }
  return false;
}

// Return true only if the password matches the lab rules.
function isValidPassword(password) {
  // TODO 6:
  const letterPattern = /[a-zA-Z]/;
  const numberPattern = /[0-9]/;

  if (
    typeof password == "string" &&
    password.length >= 6 &&
    letterPattern.test(password) &&
    numberPattern.test(password)
  ) {
    return true;
  }
  return false;
}

// This middleware protects routes that require login.
function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ message: "You must log in first." });
  }
  next();
}

// ==========================================
// 3. Basic route and register route
// ==========================================

// Simple route for quick testing in the browser or Postman.
app.get("/api/health", (req, res) => {
  res.json({ message: "API is running" });
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // TODO 7:
    const validUser = isValidUsername(username);
    if (!validUser) {
      return res.status(400).json({
        message: "Invalid username",
      });
    }
    const validPassword = isValidPassword(password);
    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    if (!username || !password) {
      return res.status(400).json({
        message: "Both username and passord are required",
      });
    }

    const users = await readUsers();
    // TODO 8:
    if (users.some((user) => user.username === username)) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    // bcrypt.hash(...) turns the plain password into a secure hash.
    const passwordHash = await bcrypt.hash(password, 10);

    // TODO 9:
    const user = {
      username,
      passwordHash,
    };
    users.push(user);
    await writeUsers(users);

    const watchlists = await readWatchlists();

    // TODO 10:
    watchlists[username] = [];
    await writeWatchlists(watchlists);

    res.status(201).json({ message: "Registration successful." });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

// ==========================================
// 4. Login, logout, and current user
// ==========================================

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // TODO 11:
    // Validate missing fields.

    const users = await readUsers();

    // TODO 12:
    const user = users.find((u) => u.username === username);
    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // bcrypt.compare(...) checks the plain password against the stored hash.
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    // TODO 13:
    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }
    req.session.username = username;

    res.json({ message: "Login successful.", username });
  } catch (error) {
    res.status(500).json({ message: "Server error during login." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logout successful." });
  });
});

app.get("/api/me", (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ message: "Not logged in." });
  }

  res.json({ username: req.session.username });
});

// ==========================================
// 5. Watchlist routes
// ==========================================

app.get("/api/watchlist", requireLogin, async (req, res) => {
  try {
    const watchlists = await readWatchlists();
    const username = req.session.username;

    // TODO 14:
    const userWatchlist = watchlists[username] || [];
    return res.json(userWatchlist);
  } catch (error) {
    res.status(500).json({ message: "Server error while reading watchlist." });
  }
});

app.post("/api/watchlist", requireLogin, async (req, res) => {
  try {
    const username = req.session.username;
    const movie = req.body;

    // TODO 15:
    if (!movie || !movie.imdbID || !movie.Title) {
      return res.status(400).json({
        message: "Movie must include imdb and title",
      });
    }

    const watchlists = await readWatchlists();

    if (!watchlists[username]) {
      watchlists[username] = [];
    }
    const userWatchlist = watchlists[username];

    // TODO 16:
    const duplicate = userWatchlist.some((d) => d.imdbID === movie.imdbID);
    if (duplicate) {
      return res.status(400).json({
        message: "Movie already in watchlist",
      });
    }

    // TODO 17:
    userWatchlist.push(movie);
    await writeWatchlists(watchlists);

    res.status(201).json({ message: "Movie added to watchlist." });
  } catch (error) {
    res.status(500).json({ message: "Server error while adding movie." });
  }
});

app.delete("/api/watchlist/:imdbID", requireLogin, async (req, res) => {
  try {
    const username = req.session.username;
    const imdbID = req.params.imdbID;

    const watchlists = await readWatchlists();
    const userWatchlist = watchlists[username] || [];

    // TODO 18:
    const updatedWatchlist = userWatchlist.filter((u) => u.imdbID !== imdbID);
    watchlists[username] = updatedWatchlist;
    await writeWatchlists(watchlists);

    res.json({ message: "Movie removed from watchlist." });
  } catch (error) {
    res.status(500).json({ message: "Server error while removing movie." });
  }
});

// ==========================================
// 6. Start the server
// ==========================================

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
