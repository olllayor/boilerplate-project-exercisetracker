const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
const usersPath = path.join(dataDir, "users.json");
const exercisesPath = path.join(dataDir, "exercises.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize JSON files if they don't exist
if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, JSON.stringify([]));
}

if (!fs.existsSync(exercisesPath)) {
  fs.writeFileSync(exercisesPath, JSON.stringify([]));
}

// Helper functions for data manipulation
const getUsers = () => {
  const data = fs.readFileSync(usersPath);
  return JSON.parse(data);
};

const saveUsers = (users) => {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
};

const getExercises = () => {
  const data = fs.readFileSync(exercisesPath);
  return JSON.parse(data);
};

const saveExercises = (exercises) => {
  fs.writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2));
};

// Home route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Create a new user
app.post("/api/users", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const users = getUsers();
  const newUser = {
    _id: uuidv4(),
    username,
  };

  users.push(newUser);
  saveUsers(users);

  res.json(newUser);
});

// Get all users
app.get("/api/users", (req, res) => {
  const users = getUsers();
  res.json(users);
});

// Add exercise for a user
app.post("/api/users/:_id/exercises", (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  if (!description || !duration) {
    return res.status(400).json({ error: "Description and duration are required" });
  }

  const users = getUsers();
  const user = users.find((u) => u._id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const exercises = getExercises();
  const newExercise = {
    userId,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
  };

  exercises.push(newExercise);
  saveExercises(exercises);

  res.json({
    _id: user._id,
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date,
  });
});

// Get exercise log for a user
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const users = getUsers();
  const user = users.find((u) => u._id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const exercises = getExercises();
  let userExercises = exercises.filter((ex) => ex.userId === userId);

  // Filter by date range if provided
  if (from) {
    const fromDate = new Date(from);
    userExercises = userExercises.filter((ex) => new Date(ex.date) >= fromDate);
  }

  if (to) {
    const toDate = new Date(to);
    userExercises = userExercises.filter((ex) => new Date(ex.date) <= toDate);
  }

  // Apply limit if provided
  if (limit) {
    userExercises = userExercises.slice(0, parseInt(limit));
  }

  res.json({
    _id: user._id,
    username: user.username,
    count: userExercises.length,
    log: userExercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date,
    })),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
