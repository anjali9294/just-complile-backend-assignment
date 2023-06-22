const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var cors = require("cors");
const { body, validationResult } = require("express-validator");
const app = express();
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
const port = 3000;

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://edureka:edureka123@edureka.vvipexh.mongodb.net/just-complie-assignment",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

// Define User model and schema here

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Define Todo model and schema here

const todoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Todo = mongoose.model("Todo", todoSchema);

app.use(express.json());

// User registration
app.post(
  "/register",
  [body("email").isEmail(), body("password").isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to register user" });
    }
  }
);

// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user._id }, "secret-key");

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: "Failed to login" });
  }
});

app.post("/logout", (req, res) => {
  // Clear the token from the client-side (e.g., remove it from local storage or session)
  // You can also add additional cleanup tasks if needed
  res.status(200).json({ message: "Logout successful" });
});

// Protected route for creating a todo
app.post("/todos", verifyToken, (req, res) => {
  const { title } = req.body;
  const newTodo = new Todo({
    title,
    userId: req.userId,
  });
  newTodo
    .save()
    .then((todo) => res.json(todo))
    .catch((error) => res.status(500).json({ error: "Failed to create todo" }));
});

// Protected route for fetching user's todos
app.get("/todos", verifyToken, (req, res) => {
  const userId = req.userId;
  Todo.find({ userId })
    .then((todos) => res.json(todos))
    .catch((error) => res.status(500).json({ error: "Failed to fetch todos" }));
});

// Middleware function to verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, "secret-key", (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.userId = decoded.userId;
    next();
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
